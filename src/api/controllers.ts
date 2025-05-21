import { Request, Response } from "express";
import { JobManager } from "../services/jobManager";
import { ScrapeRequest } from "../types";

// Create a singleton instance of JobManager
const jobManager = new JobManager();

/**
 * Controller for initiating a scrape job
 */
export const initiateJob = (req: Request, res: Response): void => {
  try {
    const { theme } = req.body as ScrapeRequest;

    if (!theme || typeof theme !== "string" || theme.trim() === "") {
      res.status(400).json({
        status: "error",
        message: "A valid theme is required",
      });
      return;
    }

    const jobId = jobManager.createJob(theme.trim());

    res.status(202).json({
      status: "success",
      message: "Job initiated successfully",
      jobId,
    });
  } catch (error: any) {
    console.error("Error initiating job:", error);
    res.status(500).json({
      status: "error",
      message: `Failed to initiate job: ${error.message}`,
    });
  }
};

/**
 * Controller for checking job status
 */
export const getJobStatus = (req: Request, res: Response): void => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({
        status: "error",
        message: "Job ID is required",
      });
      return;
    }

    const status = jobManager.getJobStatus(jobId);

    if (!status) {
      res.status(404).json({
        status: "error",
        message: "Job not found",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: status,
    });
  } catch (error: any) {
    console.error("Error getting job status:", error);
    res.status(500).json({
      status: "error",
      message: `Failed to get job status: ${error.message}`,
    });
  }
};

/**
 * Controller for getting job results
 */
export const getJobResults = (req: Request, res: Response): void => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({
        status: "error",
        message: "Job ID is required",
      });
      return;
    }

    const status = jobManager.getJobStatus(jobId);

    if (!status) {
      res.status(404).json({
        status: "error",
        message: "Job not found",
      });
      return;
    }

    if (status.status !== "completed") {
      res.status(400).json({
        status: "error",
        message: `Job is not yet completed. Current status: ${status.status}`,
      });
      return;
    }

    const results = jobManager.getJobResults(jobId);

    if (!results) {
      res.status(404).json({
        status: "error",
        message: "Results not found for the completed job",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: results,
    });
  } catch (error: any) {
    console.error("Error getting job results:", error);
    res.status(500).json({
      status: "error",
      message: `Failed to get job results: ${error.message}`,
    });
  }
};
