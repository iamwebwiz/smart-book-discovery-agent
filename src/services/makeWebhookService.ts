import axios from "axios";
import { EnrichedBook, JobResult } from "../types";
import config from "../config";

export class MakeWebhookService {
  /**
   * Send scraped and enriched book data to Make.com
   */
  async sendDataToMake(jobResult: JobResult): Promise<boolean> {
    try {
      if (!config.makeWebhookUrl) {
        console.error("Make.com webhook URL is not configured");
        return false;
      }

      // Send the data to Make.com
      const response = await axios.post(config.makeWebhookUrl, jobResult, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200) {
        console.log("Successfully sent data to Make.com");
        return true;
      } else {
        console.error(`Failed to send data to Make.com. Status: ${response.status}`);
        console.error("Response data:", response.data);
        return false;
      }
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Make.com webhook error response:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received from Make.com webhook:", error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error setting up Make.com webhook request:", error.message);
      }
      return false;
    }
  }

  /**
   * Calculate metadata for the job result
   */
  calculateMetadata(books: EnrichedBook[]): JobResult["metadata"] {
    if (books.length === 0) {
      return {
        totalBooks: 0,
        averagePrice: 0,
        averageRelevance: 0,
        mostRelevantBook: "None",
        bestValueBook: "None",
      };
    }

    // Calculate total books
    const totalBooks = books.length;

    // Calculate average price
    const totalPrice = books.reduce((sum, book) => sum + book.currentPrice, 0);
    const averagePrice = totalPrice / totalBooks;

    // Calculate average relevance
    const totalRelevance = books.reduce((sum, book) => sum + book.relevanceScore, 0);
    const averageRelevance = totalRelevance / totalBooks;

    // Find most relevant book
    const mostRelevantBook = books.reduce(
      (prev, current) => (prev.relevanceScore > current.relevanceScore ? prev : current),
      books[0]
    ).title;

    // Find best value book
    const bestValueBook = books.reduce(
      (prev, current) => (prev.valueScore > current.valueScore ? prev : current),
      books[0]
    ).title;

    return {
      totalBooks,
      averagePrice,
      averageRelevance,
      mostRelevantBook,
      bestValueBook,
    };
  }
}
