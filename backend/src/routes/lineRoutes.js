import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { createLine, listLines, getLine } from "../controllers/lineController.js";

const router = Router();

router.post("/", requireAuth, requireRole("EXECUTIVE"), createLine);
router.get("/", requireAuth, requireRole("EXECUTIVE", "MANAGER"), listLines);
router.get("/:id", requireAuth, requireRole("EXECUTIVE", "MANAGER"), getLine);

export default router;