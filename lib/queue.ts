import { runModel, TailorModelInput } from './models.js';
import { db } from './db.js';

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
  };
  error?: string;
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

    this.jobs.set(jobId, job);
    this.notify(jobId, job);

    // Run asynchronously without blocking HTTP response
    setImmediate(async () => {
      await this.processJob(jobId, scanId, userId, input);
    });

    return job;
  }

  getJob(jobId: string): BackgroundJob | undefined {
    return this.jobs.get(jobId);
  }

  subscribe(jobId: string, callback: (job: BackgroundJob) => void): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, []);
    }
    this.listeners.get(jobId)!.push(callback);

    // Initial emit
    const current = this.jobs.get(jobId);
    if (current) callback(current);

    return () => {
      const arr = this.listeners.get(jobId) || [];
      this.listeners.set(
        jobId,
        arr.filter((cb) => cb !== callback)
      );
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

    try {
      // Execute deep LLM tailoring
      const tailorResult = await runModel<any>('tailor', input);

      job.progress = 85;
      this.notify(jobId, job);

      // Save directly to database
      db.updateJobScan(scanId, {
        tailoredResumeText: tailorResult.tailored_resume_text,
        coverLetterText: tailorResult.cover_letter_text,
      });

      job.status = 'COMPLETED';
      job.progress = 100;
      job.result = {
        tailoredResumeText: tailorResult.tailored_resume_text,
        coverLetterText: tailorResult.cover_letter_text,
        keyChangesMade: tailorResult.key_changes_made || [],
      };
      job.completedAt = new Date().toISOString();
      this.notify(jobId, job);
    } catch (err: any) {
      console.error(`[Queue] Job ${jobId} failed:`, err);
      job.status = 'FAILED';
      job.error = err?.message || 'Failed to complete AI tailoring background worker';
      this.notify(jobId, job);
    }
  }
}

export const taskQueue = new BackgroundTaskQueue();
