export interface Book {
  title: string;
  author: string;
  currentPrice: number;
  originalPrice?: number; // Optional, as some books may not be discounted
  description: string;
  productUrl: string;
}

export interface EnrichedBook extends Book {
  summary: string;
  relevanceScore: number;
  discountAmount?: number;
  discountPercentage?: number;
  valueScore: number;
}

export interface JobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  theme: string;
  createdAt: Date;
  completedAt?: Date;
  message?: string;
}

export interface ScrapeRequest {
  theme: string;
}

export interface ScrapeResponse {
  jobId: string;
  message: string;
  status: string;
}

export interface JobResult {
  jobId: string;
  theme: string;
  books: EnrichedBook[];
  timestamp: Date;
  metadata: {
    totalBooks: number;
    averagePrice: number;
    averageRelevance: number;
    mostRelevantBook: string;
    bestValueBook: string;
  };
}
