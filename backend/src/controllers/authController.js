import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { signToken } from "../utils/jwt.js";

// POST /api/auth/login  — Executive & Manager (email + password)
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash || !user.isActive) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signToken({ id: user.id, role: user.role });

  res.json({
    token,
    user: { id: user.id, role: user.role, fullName: user.fullName, email: user.email },
  });
}

// POST /api/auth/operator-login — Operator (phone + PIN)
export async function operatorLogin(req, res) {
  const { phone, pin } = req.body;

  if (!phone || !pin) {
    return res.status(400).json({ error: "Phone and PIN are required" });
  }

  const user = await prisma.user.findUnique({ where: { phone } });

  if (!user || !user.pin || !user.isActive || user.role !== "OPERATOR") {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(pin, user.pin);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signToken({ id: user.id, role: user.role });

  res.json({
    token,
    user: { id: user.id, role: user.role, operatorName: user.operatorName, phone: user.phone },
  });
}