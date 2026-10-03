import { runModel, TailorModelInput } from './models.js';
import { supabaseDb as db } from './supabase-db.js';

/** Hard cap on retained jobs so a long-lived server cannot grow unbounded. */
const MAX_RETAINED_JOBS = 200;

/** A provider that never settles must not leave a job stuck in PROCESSING forever. */
const MODEL_TIMEOUT_MS = 60_000;

export interface BackgroundJob {
  id: string;
  scanId: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  result?: {
    tailoredResumeText?: string;
    coverLetterText?: string;
    keyChangesMade?: string[];
    /** True when produced by the local fallback rather than a real model. */
    synthetic?: boolean;
    notice?: string;
  };
  error?: string;
  /** True when the job failed because the model call exceeded MODEL_TIMEOUT_MS. */
  timedOut?: boolean;
  createdAt: string;
  completedAt?: string;
}

class BackgroundTaskQueue {
  private jobs: Map<string, BackgroundJob> = new Map();
  private listeners: Map<string, Array<(job: BackgroundJob) => void>> = new Map();

  /**
   * Enqueues heavy AI tasks (STAR bullet generation, Cover Letter creation)
   * while the client receives instant match scores.
   */
  enqueueTailorTask(
    scanId: string,
    userId: string,
    input: TailorModelInput
  ): BackgroundJob {
    const jobId = `job_${scanId}`;
    const job: BackgroundJob = {
      id: jobId,
      scanId,
      userId,
      status: 'PENDING',
      progress: 10,
      createdAt: new Date().toISOString(),
    };

    // Job ids are deterministic, so re-enqueuing a scan replaces the previous
    // run. Drop the stale entry first so the new job sorts as most-recent, and
    // drop its SSE subscribers so they cannot leak across runs.
    if (this.jobs.has(jobId)) {
      this.jobs.delete(jobId);
      this.listeners.delete(jobId);
    }
    this.jobs.set(jobId, job);
    this.notify(jobId, job);
    this.pruneJobs();

    // Run asynchronously without blocking HTTP response
    setImmediate(async () => {
      await this.processJob(jobId, scanId, userId, input);
    });

    return job;
  }

  /**
   * `userId` is optional so legacy single-argument callers keep working, but
   * when supplied the job must belong to that user.
   */
  getJob(jobId: string, userId?: string): BackgroundJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    if (userId !== undefined && job.userId !== userId) return undefined;
    return job;
  }

  subscribe(jobId: string, callback: (job: BackgroundJob) => void): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, []);
    }
    this.listeners.get(jobId)!.push(callback);

    let active = true;

    // Initial emit is deferred to a microtask: callers such as the SSE
    // handler unsubscribe from inside this callback, which would hit the TDZ
    // of `const unsubscribe = ...` if we emitted synchronously.
    queueMicrotask(() => {
      if (!active) return;
      const current = this.jobs.get(jobId);
      if (current) callback(current);
    });

    return () => {
      active = false;
      const arr = this.listeners.get(jobId);
      if (!arr) return;
      const next = arr.filter((cb) => cb !== callback);
      if (next.length === 0) {
        // Delete the key entirely; leaving an empty array behind leaks.
        this.listeners.delete(jobId);
      } else {
        this.listeners.set(jobId, next);
      }
    };
  }

  private notify(jobId: string, job: BackgroundJob) {
    const subs = this.listeners.get(jobId) || [];
    for (const sub of subs) {
      try {
        sub(job);
      } catch (err) {
        console.error('[Queue] Listener error:', err);
      }
    }
  }

  /**
   * Evicts the oldest finished jobs once the cap is exceeded. Jobs that are
   * still running, or that still have active SSE subscribers, are never
   * evicted.
   */
  private pruneJobs() {
    if (this.jobs.size <= MAX_RETAINED_JOBS) return;

    for (const [jobId, job] of this.jobs) {
      if (this.jobs.size <= MAX_RETAINED_JOBS) break;
      if (job.status === 'PENDING' || job.status === 'PROCESSING') continue;
      if ((this.listeners.get(jobId) || []).length > 0) continue;
      this.jobs.delete(jobId);
      this.listeners.delete(jobId);
    }
  }

  private async processJob(
    jobId: string,
    scanId: string,
    userId: string,
    input: TailorModelInput
  ) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'PROCESSING';
    job.progress = 35;
    this.notify(jobId, job);

    let timedOut = false;

    try {
      // Execute deep LLM tailoring, but stop waiting on a hung provider.
      // The underlying promise is left to settle on its own; its result is
      // simply ignored once the race is decided.
      const tailorResult = await new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
          timedOut = true;
          reject(
            new Error(
              `AI tailoring timed out after ${MODEL_TIMEOUT_MS / 1000}s. Please retry.`
            )
          );
        }, MODEL_TIMEOUT_MS);

        runModel<any>('tailor', input).then(
          (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          }
        );
      });

      job.progress = 85;
      this.notify(jobId, job);

      // Save directly to database
      await db.updateJobScan(scanId, {
        tailoredResumeText: tailorResult.tailored_resume_text,
        coverLetterText: tailorResult.cover_letter_text,
        // Record whether this came from a real model or the local fallback.
        tailoredSynthetic: Boolean(tailorResult.synthetic),
      });

      job.status = 'COMPLETED';
      job.progress = 100;
      job.result = {
        tailoredResumeText: tailorResult.tailored_resume_text,
        coverLetterText: tailorResult.cover_letter_text,
        keyChangesMade: tailorResult.key_changes_made || [],
        synthetic: Boolean(tailorResult.synthetic),
        notice: tailorResult.notice,
      };
      job.completedAt = new Date().toISOString();
      this.notify(jobId, job);
    } catch (err: any) {
      if (!timedOut) {
        console.error(`[Queue] Job ${jobId} failed:`, err instanceof Error ? err.name : 'unknown error');
      } else {
        console.error(`[Queue] Job ${jobId} timed out after ${MODEL_TIMEOUT_MS}ms`);
      }
      job.status = 'FAILED';
      job.timedOut = timedOut;
      job.error = timedOut
        ? 'AI tailoring timed out. Please retry.'
        : 'AI tailoring could not be completed. Please retry.';
      job.completedAt = new Date().toISOString();
      this.notify(jobId, job);
    } finally {
      this.pruneJobs();
    }
  }
}

export const taskQueue = new BackgroundTaskQueue();