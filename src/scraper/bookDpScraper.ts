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
    const searchUrl = `${config.bookDpUrl}/?s=${encodeURIComponent(theme)}&post_type=product`;

    // Process multiple pages of search results
    for (let pageNum = 1; pageNum <= config.pagesToScrape; pageNum++) {
      const pageUrl =
        pageNum === 1
          ? searchUrl
          : `${config.bookDpUrl}/page/${pageNum}/?s=${encodeURIComponent(theme)}&post_type=product`;
      console.log(`Scraping page ${pageNum}: ${pageUrl}`);

      await this.page.goto(pageUrl, { waitUntil: "domcontentloaded" });

      // Wait for search results to load
      await this.page.waitForSelector(".products", { timeout: 10000 }).catch(() => {
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
      const bookElements = document.querySelectorAll(".product-inner");

      bookElements.forEach((element) => {
        try {
          // Extract title and URL
          const titleElement = element.querySelector(".product-summary .woocommerce-loop-product__title a");
          const title = titleElement?.textContent?.trim() || "";
          const productUrl = (titleElement as HTMLAnchorElement)?.href || "";

          // Extract author from URL
          let author = "";
          if (productUrl) {
            const urlParts = productUrl.split("/");
            const lastPart = urlParts[urlParts.length - 2]; // Get the second last part of the URL
            if (lastPart) {
              // Split by hyphen and remove the last part (ISBN)
              const parts = lastPart.split("-");
              if (parts.length > 1) {
                // Remove the last part (ISBN) and join the rest to get the author name
                parts.pop();
                author = parts.join(" ").replace(/-/g, " ");
              }
            }
          }

          // Extract price information
          const priceElement = element.querySelector(".product-summary .price");
          let currentPrice = 0;
          let originalPrice: number | undefined = undefined;

          if (priceElement) {
            // Extract current price (from ins element)
            const currentPriceElement = priceElement.querySelector("ins .woocommerce-Price-amount");
            if (currentPriceElement) {
              const currentPriceText = currentPriceElement.textContent?.trim() || "";
              currentPrice = parseFloat(currentPriceText.replace("$", ""));
            }

            // Extract original price (from del element)
            const originalPriceElement = priceElement.querySelector("del .woocommerce-Price-amount");
            if (originalPriceElement) {
              const originalPriceText = originalPriceElement.textContent?.trim() || "";
              originalPrice = parseFloat(originalPriceText.replace("$", ""));
            }
          }

          // Extract basic description from product summary
          const descriptionElement = element.querySelector(
            ".product-summary .woocommerce-product-details__short-description"
          );
          let description = "";
          if (descriptionElement) {
            description = descriptionElement.textContent?.trim() || "";
          } else {
            // Fallback to using the title as a basic description
            description = `Book: ${title}`;
          }

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

      console.log("Books data:", books);

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
        await detailPage.waitForSelector(".woocommerce-tabs--description-content p", { timeout: 5000 }).catch(() => {
          console.log(`No description found for book: ${book.title}`);
        });

        // Extract first sentence from description
        const fullDescription = await detailPage.evaluate(() => {
          const descElement = document.querySelector(".woocommerce-tabs--description-content p");
          if (!descElement) return "";

          const text = descElement.textContent?.trim() || "";
          // Split by period and get the first sentence, ensuring it ends with a period
          const firstSentence = text.split(".")[0].trim() + ".";
          return firstSentence;
        });

        // Close the page
        await detailPage.close();

        // Update book with first sentence of description
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
