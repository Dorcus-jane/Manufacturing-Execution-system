import { Router } from "express";
import { login, operatorLogin } from "../controllers/authController.js";

const router = Router();

router.post("/login", login);
router.post("/operator-login", operatorLogin);

export default router;