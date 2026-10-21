import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";

// POST /api/users/managers — Executive only
export async function createManager(req, res) {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "fullName, email, and password are required" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "A user with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const manager = await prisma.user.create({
    data: {
      role: "MANAGER",
      fullName,
      email,
      passwordHash,
      createdById: req.user.id, // the logged-in Executive, from requireAuth
    },
  });

  res.status(201).json({
    id: manager.id,
    fullName: manager.fullName,
    email: manager.email,
    isActive: manager.isActive,
    createdAt: manager.createdAt,
  });
}

// POST /api/users/operators — Manager only
export async function createOperator(req, res) {
  const { operatorName, phone, pin, skills } = req.body;

  if (!operatorName || !phone || !pin) {
    return res.status(400).json({ error: "operatorName, phone, and pin are required" });
  }
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: "PIN must be exactly 4 digits" });
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return res.status(409).json({ error: "A user with this phone number already exists" });
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const operator = await prisma.user.create({
    data: {
      role: "OPERATOR",
      operatorName,
      phone,
      pin: pinHash,
      skills: skills || [],
      createdById: req.user.id, // the logged-in Manager
    },
  });

  res.status(201).json({
    id: operator.id,
    operatorName: operator.operatorName,
    phone: operator.phone,
    skills: operator.skills,
    isActive: operator.isActive,
    createdAt: operator.createdAt,
  });
}

// PATCH /api/users/:id/deactivate — Executive (for Managers) or Manager (for Operators)
export async function deactivateUser(req, res) {
  const { id } = req.params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }

  // An Executive may only deactivate Managers; a Manager may only deactivate Operators
  if (req.user.role === "EXECUTIVE" && target.role !== "MANAGER") {
    return res.status(403).json({ error: "Executives can only deactivate Manager accounts" });
  }
  if (req.user.role === "MANAGER" && target.role !== "OPERATOR") {
    return res.status(403).json({ error: "Managers can only deactivate Operator accounts" });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  res.json({ message: `${updated.fullName || updated.operatorName} has been deactivated` });
}

// GET /api/users/managers — Executive only, for assignment dropdowns
export async function listManagers(req, res) {
  const managers = await prisma.user.findMany({
    where: { role: "MANAGER", isActive: true },
    select: { id: true, fullName: true, email: true },
  });
  res.json(managers);
}


export async function listOperators(req, res) {
  const operators = await prisma.user.findMany({
    where: { role: "OPERATOR", isActive: true },
    select: { id: true, operatorName: true, phone: true, skills: true },
  });
  res.json(operators);
}