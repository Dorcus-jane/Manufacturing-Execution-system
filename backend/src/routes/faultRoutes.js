import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { reportFault, attentionFeed, resolveFault, listFaults, criticalAlerts } from "../controllers/faultController.js";

const router = Router();

router.post("/", requireAuth, requireRole("OPERATOR"), reportFault);
router.get("/feed", requireAuth, requireRole("MANAGER"), attentionFeed);
router.get("/critical", requireAuth, requireRole("EXECUTIVE"), criticalAlerts);
router.get("/", requireAuth, requireRole("MANAGER"), listFaults);
router.patch("/:id/resolve", requireAuth, requireRole("MANAGER"), resolveFault);

export default router;