import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { logScrap, listScrap } from "../controllers/scrapController.js";

const router = Router();

router.post("/", requireAuth, requireRole("OPERATOR"), logScrap);
router.get("/", requireAuth, requireRole("MANAGER", "EXECUTIVE"), listScrap);

export default router;