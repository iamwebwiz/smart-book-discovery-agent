import OpenAI from "openai";
import { Book, EnrichedBook } from "../types";
import config from "../config";

export class OpenAiService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  /**
   * Generate a summary and relevance score for a book
   */
  async enrichBook(book: Book, theme: string): Promise<EnrichedBook> {
    try {
      const prompt = `
        Book Title: ${book.title}
        Book Author: ${book.author}
        Book Description: ${book.description}
        Theme: ${theme}

        I need two things:
        1. A concise 1-2 sentence summary of this book based on the description.
        2. A relevance score from 0 to 100 (as a number) indicating how well this book matches the theme "${theme}".

        Format your response exactly like this:
        Summary: <your 1-2 sentence summary>
        Relevance Score: <number between 0 and 100>
      `;

      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that analyzes books and provides concise summaries and relevance scores.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      const content = response.choices[0]?.message.content || "";

      // Extract summary and relevance score
      const summaryMatch = content.match(/Summary: (.*?)(?=\n|$)/);
      const scoreMatch = content.match(/Relevance Score: (\d+)/);

      const summary = summaryMatch ? summaryMatch[1].trim() : "No summary available";
      const relevanceScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 50; // Default to 50 if parsing fails

      // Calculate discount information if applicable
      let discountAmount: number | undefined;
      let discountPercentage: number | undefined;

      if (book.originalPrice && book.originalPrice > book.currentPrice) {
        discountAmount = book.originalPrice - book.currentPrice;
        discountPercentage = (discountAmount / book.originalPrice) * 100;
      }

      // Calculate value score
      const valueScore = relevanceScore / (book.currentPrice || 1); // Avoid division by zero

      return {
        ...book,
        summary,
        relevanceScore,
        discountAmount,
        discountPercentage,
        valueScore,
      };
    } catch (error) {
      console.error(`Error enriching book "${book.title}":`, error);

      // Return a default enriched book if there's an error
      return {
        ...book,
        summary: "No summary available due to processing error.",
        relevanceScore: 0,
        valueScore: 0,
      };
    }
  }

  /**
   * Process multiple books in parallel with rate limiting
   */
  async enrichBooks(books: Book[], theme: string): Promise<EnrichedBook[]> {
    const enrichedBooks: EnrichedBook[] = [];
    const concurrencyLimit = 3; // Limit concurrent API calls

    // Process books in chunks to avoid rate limiting
    for (let i = 0; i < books.length; i += concurrencyLimit) {
      const chunk = books.slice(i, i + concurrencyLimit);
      const promises = chunk.map((book) => this.enrichBook(book, theme));

      const results = await Promise.allSettled(promises);

      for (const result of results) {
        if (result.status === "fulfilled") {
          enrichedBooks.push(result.value);
        }
      }

      // Add a small delay between chunks to avoid rate limiting
      if (i + concurrencyLimit < books.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return enrichedBooks;
  }
}
