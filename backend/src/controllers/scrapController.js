import prisma from "../config/prisma.js";

// POST /api/scrap — Operator logs wasted material (FR-4.1.8-1)
export async function logScrap(req, res) {
  const { jobId, stageId, scrapType, quantity, unit, notes } = req.body;
  if (!jobId || !scrapType || quantity === undefined || !unit) {
    return res.status(400).json({ error: "jobId, scrapType, quantity, and unit are required" });
  }

  const entry = await prisma.scrapLog.create({
    data: { jobId, stageId, operatorId: req.user.id, scrapType, quantity, unit, notes },
  });

  res.status(201).json(entry);
}

// GET /api/scrap?jobId= — for stats/manager views later
export async function listScrap(req, res) {
  const { jobId } = req.query;
  const entries = await prisma.scrapLog.findMany({
    where: jobId ? { jobId } : {},
    include: { operator: { select: { operatorName: true } } },
    orderBy: { loggedAt: "desc" },
  });
  res.json(entries);
}