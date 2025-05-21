import express from "express";
import config from "./config";
import routes from "./api/routes";

const app = express();

// Middleware
app.use(express.json());

// API routes
app.use("/", routes);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Service is healthy",
  });
});

// Start the server
app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Log warnings if configuration is incomplete
  if (!config.openaiApiKey) {
    console.warn("WARNING: OpenAI API key is not set. AI enrichment will fail.");
  }

  if (!config.makeWebhookUrl) {
    console.warn("WARNING: Make.com webhook URL is not set. Make integration will be disabled.");
  }
});
