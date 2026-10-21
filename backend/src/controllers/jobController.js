import prisma from "../config/prisma.js";

// POST /api/jobs — Manager only, under their own line
export async function createJob(req, res) {
  const { lineId, jobId, name, productName, targetQuantity, unit, targetDate } = req.body;
  if (!lineId || !jobId || !productName || !targetQuantity || !unit) {
    return res.status(400).json({ error: "lineId, jobId, productName, targetQuantity, and unit are required" });
  }

  const line = await prisma.productionLine.findUnique({ where: { id: lineId } });
  if (!line) return res.status(404).json({ error: "Line not found" });
  if (line.managerId !== req.user.id) {
    return res.status(403).json({ error: "You can only build jobs under your assigned line" });
  }

  const job = await prisma.job.create({
    data: {
      lineId, jobId, name, productName, targetQuantity, unit,
      targetDate: targetDate ? new Date(targetDate) : null,
      createdById: req.user.id,
      status: "DRAFT",
    },
  });

  res.status(201).json(job);
}

// POST /api/jobs/:jobId/stages — add a stage from a blueprint (snapshot taken now — FR-4.1.11-1)
export async function addStage(req, res) {
  const { blueprintId, operatorId, stageOrder, stationTag, notes, scheduledStartAt, scheduledEndAt } = req.body;
  if (!blueprintId || !operatorId || stageOrder === undefined) {
    return res.status(400).json({ error: "blueprintId, operatorId, and stageOrder are required" });
  }

  const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.status !== "DRAFT") return res.status(400).json({ error: "Can only add stages to a Draft job" });

  const line = await prisma.productionLine.findUnique({ where: { id: job.lineId } });
  if (line.managerId !== req.user.id) return res.status(403).json({ error: "Not your job to edit" });

  const blueprint = await prisma.blueprint.findUnique({
    where: { id: blueprintId },
    include: { checklistItems: true, quantities: true, qcQuestions: true, faultCategories: true },
  });
  if (!blueprint) return res.status(404).json({ error: "Blueprint not found" });

  const operator = await prisma.user.findUnique({ where: { id: operatorId } });
  if (!operator || operator.role !== "OPERATOR" || !operator.isActive) {
    return res.status(400).json({ error: "operatorId must reference an active Operator" });
  }

  // FR-4.1.11-1: freeze a full snapshot right now
  const blueprintSnapshot = {
    name: blueprint.name,
    description: blueprint.description,
    guidelinesEnabled: blueprint.guidelinesEnabled,
    guidelinesContent: blueprint.guidelinesContent,
    checklistEnabled: blueprint.checklistEnabled,
    checklistValidationTiming: blueprint.checklistValidationTiming,
    checklistItems: blueprint.checklistItems,
    quantityLoggingEnabled: blueprint.quantityLoggingEnabled,
    quantities: blueprint.quantities,
    qcFormEnabled: blueprint.qcFormEnabled,
    qcQuestions: blueprint.qcQuestions,
    faultCategoriesEnabled: blueprint.faultCategoriesEnabled,
    faultCategories: blueprint.faultCategories,
  };

  const stage = await prisma.jobStage.create({
    data: {
      jobId: job.id,
      blueprintId: blueprint.id,
      blueprintSnapshot,
      stageOrder,
      stageName: blueprint.name,
      stationTag: stationTag || blueprint.stationTag,
      notes,
      estimatedDurationMinutes: blueprint.estimatedDurationMinutes,
      operatorId,
      scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : null,
      scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : null,
      status: "PENDING",
    },
  });

  res.status(201).json(stage);
}

// PATCH /api/jobs/:jobId/activate — FR-4.2.4-1: every stage must have an operator
export async function activateJob(req, res) {
  const job = await prisma.job.findUnique({
    where: { id: req.params.jobId },
    include: { stages: true, line: true },
  });
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.line.managerId !== req.user.id) return res.status(403).json({ error: "Not your job" });
  if (job.stages.length === 0) return res.status(400).json({ error: "Job has no stages" });
  if (job.stages.some((s) => !s.operatorId)) {
    return res.status(400).json({ error: "Every stage must have an assigned operator before activation" });
  }

  const updated = await prisma.$transaction([
    prisma.job.update({ where: { id: job.id }, data: { status: "ACTIVE", startedAt: new Date() } }),
    prisma.jobStage.updateMany({ where: { jobId: job.id }, data: { status: "AVAILABLE" } }),
  ]);

  res.json(updated[0]);
}

// GET /api/jobs — Manager sees own line's jobs; Executive sees all
/*export async function listJobs(req, res) {
  const where = req.user.role === "MANAGER" ? { line: { managerId: req.user.id } } : {};
  const jobs = await prisma.job.findMany({
    where,
    include: { stages: true, line: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(jobs);
}*/

// GET /api/jobs — Manager sees own line's jobs; Executive sees all
export async function listJobs(req, res) {
  const where = req.user.role === "MANAGER" ? { line: { managerId: req.user.id } } : {};
  const jobs = await prisma.job.findMany({
    where,
    include: {
      line: true,
      stages: {
        include: { operator: { select: { operatorName: true } } },
        orderBy: { stageOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(jobs);
}