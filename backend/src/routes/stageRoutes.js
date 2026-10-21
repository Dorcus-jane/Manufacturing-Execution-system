import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import {
  myStages, startStage, pauseStage, resumeStage, endStage,
  updateChecklist, submitQcAnswer, logBatch, getStage, updateNotes
} from "../controllers/stageController.js";

const router = Router();

router.get("/mine", requireAuth, requireRole("OPERATOR"), myStages);
router.post("/:id/start", requireAuth, requireRole("OPERATOR"), startStage);
router.post("/:id/pause", requireAuth, requireRole("OPERATOR"), pauseStage);
router.post("/:id/resume", requireAuth, requireRole("OPERATOR"), resumeStage);
router.post("/:id/end", requireAuth, requireRole("OPERATOR"), endStage);
router.patch("/:id/checklist", requireAuth, requireRole("OPERATOR"), updateChecklist);
router.post("/:id/qc", requireAuth, requireRole("OPERATOR"), submitQcAnswer);
router.post("/:id/batches", requireAuth, requireRole("OPERATOR"), logBatch);
router.get("/:id", requireAuth, requireRole("OPERATOR"), getStage);
router.patch("/:id/notes", requireAuth, requireRole("OPERATOR"), updateNotes);

export default router;