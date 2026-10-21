import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { createJob, addStage, activateJob, listJobs } from "../controllers/jobController.js";

const router = Router();

router.post("/", requireAuth, requireRole("MANAGER"), createJob);
router.get("/", requireAuth, requireRole("MANAGER", "EXECUTIVE"), listJobs);
router.post("/:jobId/stages", requireAuth, requireRole("MANAGER"), addStage);
router.patch("/:jobId/activate", requireAuth, requireRole("MANAGER"), activateJob);

export default router;