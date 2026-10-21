import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { createManager, createOperator, deactivateUser, listManagers, listOperators } from "../controllers/userController.js";

const router = Router();

router.post("/managers", requireAuth, requireRole("EXECUTIVE"), createManager);
router.post("/operators", requireAuth, requireRole("MANAGER"), createOperator);
router.get("/managers", requireAuth, requireRole("EXECUTIVE"), listManagers);
router.patch("/:id/deactivate", requireAuth, requireRole("EXECUTIVE", "MANAGER"), deactivateUser);
router.get("/operators", requireAuth, requireRole("MANAGER"), listOperators);

export default router;