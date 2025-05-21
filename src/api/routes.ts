import express from "express";
import { initiateJob, getJobStatus, getJobResults } from "./controllers";

const router = express.Router();

// Define routes
router.post("/scrape", initiateJob);
router.get("/status/:jobId", getJobStatus);
router.get("/results/:jobId", getJobResults);

export default router;
