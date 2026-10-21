import prisma from "../config/prisma.js";

// POST /api/lines — Executive only
export async function createLine(req, res) {
  const { lineCode, name, description, targetProduct, targetDate, managerId } = req.body;
  if (!lineCode || !name || !targetProduct || !managerId) {
    return res.status(400).json({ error: "lineCode, name, targetProduct, and managerId are required" });
  }

  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (!manager || manager.role !== "MANAGER" || !manager.isActive) {
    return res.status(400).json({ error: "managerId must reference an active Manager" });
  }

  const existingAssignment = await prisma.productionLine.findUnique({ where: { managerId } });
  if (existingAssignment) {
    return res.status(409).json({ error: "This Manager is already assigned to a Production Line" });
  }

  const line = await prisma.productionLine.create({
    data: {
      lineCode, name, description, targetProduct,
      targetDate: targetDate ? new Date(targetDate) : null,
      managerId,
      createdById: req.user.id,
    },
  });

  res.status(201).json(line);
}

// GET /api/lines — Executive sees all; Manager sees only their own
export async function listLines(req, res) {
  const where = req.user.role === "MANAGER" ? { managerId: req.user.id } : {};
  const lines = await prisma.productionLine.findMany({
    where,
    include: { manager: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(lines);
}

// GET /api/lines/:id
export async function getLine(req, res) {
  const line = await prisma.productionLine.findUnique({
    where: { id: req.params.id },
    include: { manager: true, jobs: true },
  });
  if (!line) return res.status(404).json({ error: "Line not found" });
  if (req.user.role === "MANAGER" && line.managerId !== req.user.id) {
    return res.status(403).json({ error: "Not your assigned line" });
  }
  res.json(line);
}