import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { createBlueprint, listBlueprints, archiveBlueprint } from "../controllers/blueprintController.js";

const router = Router();

router.post("/", requireAuth, requireRole("MANAGER"), createBlueprint);
router.get("/", requireAuth, requireRole("MANAGER", "EXECUTIVE"), listBlueprints);
router.patch("/:id/archive", requireAuth, requireRole("MANAGER"), archiveBlueprint);

export default router;