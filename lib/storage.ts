import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface StoredFileResult {
  /** Internal storage path of the encrypted envelope. */
  fileUrl: string;
  /** Basename of the encrypted envelope on disk, for later retrieval. */
  storageKey: string;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageProvider: 'local_encrypted' | 'supabase';
}

const STORAGE_DIR = path.resolve(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
} catch {
  // Serverless runtimes expose a read-only filesystem; local vault creation is
  // skipped there because Supabase Storage is the configured provider.
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'resumes-private';

function createSupabaseStorageClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.SUPABASE_STORAGE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url && !serviceRoleKey) return null;
  if (!url || !serviceRoleKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Storage] Supabase credentials are incomplete; using local encrypted storage in development.');
      return null;
    }
    throw new Error('Both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase Storage.');
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const supabaseStorage = createSupabaseStorageClient();

/**
 * AES-256-GCM key. Derived from STORAGE_ENCRYPTION_KEY when provided.
 *
 * A committed default key is refused in production: it is public knowledge, so
 * every stored resume would be trivially decryptable.
 */
function deriveEncryptionKey(): Buffer {
  const configured = process.env.STORAGE_ENCRYPTION_KEY;
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('STORAGE_ENCRYPTION_KEY must be set in production.');
  }
  return crypto
    .createHash('sha256')
    .update(configured || 'resumesetu_default_sec_key_2026')
    .digest();
}

const ENCRYPTION_KEY = deriveEncryptionKey();

/** Rejects traversal and anything that is not a bare filename we produced. */
function resolveStorageKey(storageKey: string): string | null {
  if (!storageKey) return null;
  const base = path.basename(storageKey);
  if (base !== storageKey || !/^[A-Za-z0-9._-]+\.enc$/.test(base)) return null;
  const resolved = path.join(STORAGE_DIR, base);
  // Defence in depth: ensure the resolved path stays inside the vault.
  if (path.dirname(path.resolve(resolved)) !== path.resolve(STORAGE_DIR)) return null;
  return resolved;
}

export class ObjectStorageService {
  readonly provider: 'local_encrypted' | 'supabase' = supabaseStorage ? 'supabase' : 'local_encrypted';

  async verifyConfiguration(): Promise<void> {
    if (!supabaseStorage) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Supabase Storage credentials are required in production.');
      }
      return;
    }

    const { data, error } = await supabaseStorage.storage.getBucket(SUPABASE_BUCKET);
    if (error || !data || data.public) {
      throw new Error(`Supabase bucket "${SUPABASE_BUCKET}" must exist and be private${error ? `: ${error.message}` : '.'}`);
    }
  }

  /**
   * Encrypts and stores an uploaded resume document (max 5MB).
   *
  * Files are encrypted before being sent to Supabase Storage. Local encrypted
  * storage remains available when Supabase credentials are not configured.
   */
  async storeFile(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string
  ): Promise<StoredFileResult> {
    if (fileBuffer.length > MAX_FILE_BYTES) {
      throw new Error('File exceeds strict 5MB upload limit.');
    }

    const fileId = crypto.randomUUID();
    const ext = path.extname(originalFileName) || (mimeType.includes('pdf') ? '.pdf' : '.docx');
    const safeName = `${fileId}${ext}`;
    const storageKey = `${safeName}.enc`;

    // AES-256-GCM envelope: IV (12) || AuthTag (16) || Ciphertext
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    const envelope = Buffer.concat([iv, tag, encrypted]);

    if (supabaseStorage) {
      const { error } = await supabaseStorage.storage
        .from(SUPABASE_BUCKET)
        .upload(storageKey, envelope, {
          contentType: 'application/octet-stream',
          upsert: false,
        });
      if (error) throw new Error(`Supabase resume upload failed: ${error.message}`);
    } else {
      const destinationPath = path.join(STORAGE_DIR, storageKey);
      fs.writeFileSync(destinationPath, envelope);
    }

    return {
      fileUrl: supabaseStorage ? `supabase://${SUPABASE_BUCKET}/${storageKey}` : `/uploads/${storageKey}`,
      storageKey,
      originalFileName,
      fileSizeBytes: fileBuffer.length,
      mimeType,
      storageProvider: this.provider,
    };
  }

  /**
   * Decrypts a stored envelope back to the original bytes.
   * This is what made the vault round-trippable instead of write-only.
   */
  async readStoredFile(storageKey: string, provider?: string): Promise<Buffer | null> {
    const resolved = resolveStorageKey(storageKey);
    if (!resolved) return null;

    let envelope: Buffer;
    if (provider === 'supabase' || (!provider && supabaseStorage && !fs.existsSync(resolved))) {
      if (!supabaseStorage) return null;
      const { data, error } = await supabaseStorage.storage.from(SUPABASE_BUCKET).download(storageKey);
      if (error || !data) {
        if (error) console.warn('[Storage] Supabase download failed:', error.message);
        return null;
      }
      envelope = Buffer.from(await data.arrayBuffer());
    } else {
      if (!fs.existsSync(resolved)) return null;
      envelope = fs.readFileSync(resolved);
    }

    try {
      if (envelope.length <= IV_BYTES + TAG_BYTES) return null;

      const iv = envelope.subarray(0, IV_BYTES);
      const tag = envelope.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
      const ciphertext = envelope.subarray(IV_BYTES + TAG_BYTES);

      const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch (err) {
      // A GCM tag mismatch means the ciphertext or key is wrong.
      console.warn('[Storage] Failed to decrypt stored file:', (err as Error).message);
      return null;
    }
  }

  /**
   * Immediate cleanup of raw temp files from disk for 100% data privacy.
   */
  cleanupTempFile(filePath: string): void {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn(`[Storage] Failed to cleanup temp file ${filePath}:`, err);
    }
  }

  /**
   * Deletes a stored file. Returns true only when a file was actually removed.
   */
  async deleteStoredFile(storageKey: string, provider?: string): Promise<boolean> {
    const resolved = resolveStorageKey(storageKey);
    if (!resolved) return false;
    try {
      if (provider === 'supabase' || (!provider && supabaseStorage && !fs.existsSync(resolved))) {
        if (!supabaseStorage) return false;
        const { error } = await supabaseStorage.storage.from(SUPABASE_BUCKET).remove([storageKey]);
        if (error) {
          console.warn('[Storage] Supabase delete failed:', error.message);
          return false;
        }
        return true;
      }
      if (!fs.existsSync(resolved)) return false;
      fs.unlinkSync(resolved);
      return true;
    } catch (err) {
      console.warn('[Storage] Failed to delete stored file:', (err as Error).message);
      return false;
    }
  }

  /** Lists stored envelope keys, used to purge orphaned ciphertext. */
  listStoredKeys(): string[] {
    try {
      return fs.readdirSync(STORAGE_DIR).filter((f) => f.endsWith('.enc'));
    } catch {
      return [];
    }
  }
}

export const storageService = new ObjectStorageService();