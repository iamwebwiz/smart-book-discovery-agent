import { chromium, Browser, Page } from "playwright";
import { Book } from "../types";
import config from "../config";

export class BookDpScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Initialize the browser and create a new page
   */
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Search for books based on a theme
   */
  async searchBooks(theme: string): Promise<Book[]> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    const books: Book[] = [];
    const searchUrl = `${config.bookDpUrl}/search?searchTerm=${encodeURIComponent(theme)}`;

    // Process multiple pages of search results
    for (let pageNum = 1; pageNum <= config.pagesToScrape; pageNum++) {
      const pageUrl = pageNum === 1 ? searchUrl : `${searchUrl}&page=${pageNum}`;
      console.log(`Scraping page ${pageNum}: ${pageUrl}`);

      await this.page.goto(pageUrl, { waitUntil: "domcontentloaded" });

      // Wait for search results to load
      await this.page.waitForSelector(".book-item", { timeout: 10000 }).catch(() => {
        console.log("No book items found on page");
      });

      // Extract books from the current page
      const pageBooks = await this.extractBooksFromPage();
      books.push(...pageBooks);

      // If we didn't find any books on this page, stop pagination
      if (pageBooks.length === 0) {
        break;
      }
    }

    return books;
  }

  /**
   * Extract book information from the current page
   */
  private async extractBooksFromPage(): Promise<Book[]> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    return this.page.evaluate(() => {
      const books: Book[] = [];
      const bookElements = document.querySelectorAll(".book-item");

      bookElements.forEach((element) => {
        try {
          // Extract title
          const titleElement = element.querySelector(".title a");
          const title = titleElement?.textContent?.trim() || "";

          // Extract author
          const authorElement = element.querySelector(".author");
          const author = authorElement?.textContent?.trim() || "";

          // Extract product URL
          const productUrl = (titleElement as HTMLAnchorElement)?.href || "";

          // Extract price information
          const priceElement = element.querySelector(".price");
          let currentPrice = 0;
          let originalPrice: number | undefined = undefined;

          if (priceElement) {
            const priceText = priceElement.textContent?.trim() || "";
            const priceMatch = priceText.match(/\$(\d+\.\d+)/g);

            if (priceMatch && priceMatch.length >= 1) {
              // Current price is always present
              currentPrice = parseFloat(priceMatch[0].replace("$", ""));

              // Original price is present only if there's a discount
              if (priceMatch.length > 1) {
                originalPrice = parseFloat(priceMatch[1].replace("$", ""));
              }
            }
          }

          // Extract description (basic info)
          const formatElement = element.querySelector(".format");
          const description = formatElement?.textContent?.trim() || "";

          // Create book object
          if (title && author) {
            books.push({
              title,
              author,
              currentPrice,
              originalPrice,
              description,
              productUrl,
            });
          }
        } catch (error) {
          console.error("Error parsing book element:", error);
        }
      });

      return books;
    });
  }

  /**
   * Fetch detailed descriptions for books
   */
  async fetchBookDetails(books: Book[]): Promise<Book[]> {
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }

    const enrichedBooks: Book[] = [];

    for (const book of books) {
      try {
        // Create a new page for each book to avoid navigation issues
        const detailPage = await this.browser.newPage();

        // Navigate to the product page
        await detailPage.goto(book.productUrl, { waitUntil: "domcontentloaded" });

        // Wait for description element
        await detailPage.waitForSelector(".item-description", { timeout: 5000 }).catch(() => {
          console.log(`No description found for book: ${book.title}`);
        });

        // Extract full description
        const fullDescription = await detailPage.evaluate(() => {
          const descElement = document.querySelector(".item-description");
          return descElement?.textContent?.trim() || "";
        });

        // Close the page
        await detailPage.close();

        // Update book with full description
        enrichedBooks.push({
          ...book,
          description: fullDescription || book.description,
        });

        // Wait a short time between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching details for book "${book.title}":`, error);
        enrichedBooks.push(book); // Keep the original book data
      }
    }

    return enrichedBooks;
  }
}
