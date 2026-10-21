import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { jobHistory, faultAnalytics, scrapAnalytics, operatorActivity } from "../controllers/statsController.js";

const router = Router();

router.get("/jobs", requireAuth, requireRole("EXECUTIVE"), jobHistory);
router.get("/faults", requireAuth, requireRole("EXECUTIVE"), faultAnalytics);
router.get("/scrap", requireAuth, requireRole("EXECUTIVE"), scrapAnalytics);
router.get("/operators", requireAuth, requireRole("EXECUTIVE"), operatorActivity);

export default router;