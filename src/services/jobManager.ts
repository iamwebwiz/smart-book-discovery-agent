import { v4 as uuidv4 } from "uuid";
import { JobStatus, JobResult } from "../types";
import { BookDpScraper } from "../scraper/bookDpScraper";
import { OpenAiService } from "./openAiService";
import { MakeWebhookService } from "./makeWebhookService";

export class JobManager {
  private jobs: Map<string, JobStatus>;
  private results: Map<string, JobResult>;
  private scraper: BookDpScraper;
  private openAiService: OpenAiService;
  private makeWebhookService: MakeWebhookService;

  constructor() {
    this.jobs = new Map();
    this.results = new Map();
    this.scraper = new BookDpScraper();
    this.openAiService = new OpenAiService();
    this.makeWebhookService = new MakeWebhookService();
  }

  /**
   * Create a new job and start processing
   */
  createJob(theme: string): string {
    const jobId = uuidv4();
    const job: JobStatus = {
      id: jobId,
      status: "pending",
      theme,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start processing the job asynchronously
    this.processJob(jobId).catch((error) => {
      console.error(`Error processing job ${jobId}:`, error);
      this.updateJobStatus(jobId, "failed", `Processing error: ${error.message}`);
    });

    return jobId;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): JobStatus | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get job results
   */
  getJobResults(jobId: string): JobResult | null {
    return this.results.get(jobId) || null;
  }

  /**
   * Update job status
   */
  private updateJobStatus(jobId: string, status: JobStatus["status"], message?: string): void {
    const job = this.jobs.get(jobId);

    if (job) {
      job.status = status;

      if (message) {
        job.message = message;
      }

      if (status === "completed" || status === "failed") {
        job.completedAt = new Date();
      }

      this.jobs.set(jobId, job);
    }
  }

  /**
   * Process a job
   */
  private async processJob(jobId: string): Promise<void> {
    try {
      const job = this.jobs.get(jobId);

      if (!job) {
        throw new Error("Job not found");
      }

      // Update job status to processing
      this.updateJobStatus(jobId, "processing", "Starting the web scraping process");

      // Initialize scraper
      await this.scraper.initialize();

      // Search for books
      const books = await this.scraper.searchBooks(job.theme);

      if (books.length === 0) {
        this.updateJobStatus(jobId, "completed", "No books found for the given theme");
        return;
      }

      this.updateJobStatus(jobId, "processing", `Found ${books.length} books. Fetching detailed descriptions...`);

      // Fetch detailed descriptions
      const booksWithDetails = await this.scraper.fetchBookDetails(books);

      this.updateJobStatus(jobId, "processing", "Enriching books with AI analysis...");

      // Enrich books with AI
      const enrichedBooks = await this.openAiService.enrichBooks(booksWithDetails, job.theme);

      // Close scraper
      await this.scraper.close();

      // Calculate metadata
      const metadata = this.makeWebhookService.calculateMetadata(enrichedBooks);

      // Create job result
      const jobResult: JobResult = {
        jobId,
        theme: job.theme,
        books: enrichedBooks,
        timestamp: new Date(),
        metadata,
      };

      // Store the result
      this.results.set(jobId, jobResult);

      // Send data to Make.com
      this.updateJobStatus(jobId, "processing", "Sending data to Make.com...");
      await this.makeWebhookService.sendDataToMake(jobResult);

      // Update job status to completed
      this.updateJobStatus(jobId, "completed", "Job completed successfully");
    } catch (error: any) {
      // Ensure scraper is closed on error
      await this.scraper.close();

      // Update job status to failed
      this.updateJobStatus(jobId, "failed", `Job failed: ${error.message}`);
      throw error;
    }
  }
}
