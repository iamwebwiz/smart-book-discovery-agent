import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, "../../.env") });

export const config = {
  port: process.env.PORT || 3000,
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  makeWebhookUrl: process.env.MAKE_WEBHOOK_URL || "",
  bookDpUrl: "https://bookdp.com.au",
  searchResultsPerPage: 30,
  pagesToScrape: 2,
  maxConcurrentRequests: 5,
};

// Validate required environment variables
if (!config.openaiApiKey) {
  console.warn("Missing OPENAI_API_KEY environment variable");
}

if (!config.makeWebhookUrl) {
  console.warn("Missing MAKE_WEBHOOK_URL environment variable");
}

export default config;
