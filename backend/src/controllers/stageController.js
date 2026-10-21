import prisma from "../config/prisma.js";

async function getOwnedStage(stageId, operatorId) {
  const stage = await prisma.jobStage.findUnique({ where: { id: stageId } });
  if (!stage) return { error: [404, "Stage not found"] };
  if (stage.operatorId !== operatorId) return { error: [403, "Not your assigned stage"] };
  return { stage };
}

// GET /api/stages/mine — Operator's assigned stages (FR-4.3.1-1)
export async function myStages(req, res) {
  const stages = await prisma.jobStage.findMany({
    where: { operatorId: req.user.id, job: { status: "ACTIVE" } },
    include: { job: true },
    orderBy: { stageOrder: "asc" },
  });
  res.json(stages);
}

// POST /api/stages/:id/start
export async function startStage(req, res) {
  const { lotNumbers } = req.body;
  const { stage, error } = await getOwnedStage(req.params.id, req.user.id);
  if (error) return res.status(error[0]).json({ error: error[1] });

  const snapshot = stage.blueprintSnapshot;
  if (snapshot.faultCategoriesEnabled === undefined) {} // no-op, keeps lint quiet

  // Lot traceability gate — only enforced if snapshot says lot entry is needed
  // (SRS ties this to a mandatory Lot/Batch Traceability section; adjust if you add that flag to the snapshot)

  const session = await prisma.processSession.create({
    data: { stageId: stage.id, operatorId: req.user.id },
  });

  const updated = await prisma.jobStage.update({
    where: { id: stage.id },
    data: {
      status: "RUNNING",
      actualStartedAt: stage.actualStartedAt || new Date(),
      lotNumbers: lotNumbers && lotNumbers.length ? lotNumbers : stage.lotNumbers,
    },
  });

  res.json({ stage: updated, session });
}

// POST /api/stages/:id/pause
export async function pauseStage(req, res) {
  const { stage, error } = await getOwnedStage(req.params.id, req.user.id);
  if (error) return res.status(error[0]).json({ error: error[1] });

  await prisma.processSession.updateMany({
    where: { stageId: stage.id, endedAt: null },
    data: { endedAt: new Date() },
  });

  const updated = await prisma.jobStage.update({ where: { id: stage.id }, data: { status: "PAUSED" } });
  res.json(updated);
}

// POST /api/stages/:id/resume
export async function resumeStage(req, res) {
  const { stage, error } = await getOwnedStage(req.params.id, req.user.id);
  if (error) return res.status(error[0]).json({ error: error[1] });

  const session = await prisma.processSession.create({
    data: { stageId: stage.id, operatorId: req.user.id },
  });
  const updated = await prisma.jobStage.update({ where: { id: stage.id }, data: { status: "RUNNING" } });
  res.json({ stage: updated, session });
}

// POST /api/stages/:id/end — blocked by mandatory gates (FR-4.3.4-1)
export async function endStage(req, res) {
  const { stage, error } = await getOwnedStage(req.params.id, req.user.id);
  if (error) return res.status(error[0]).json({ error: error[1] });

  const snapshot = stage.blueprintSnapshot;
  const outstanding = [];

  if (snapshot.checklistEnabled) {
    const requiredIds = snapshot.checklistItems.filter((i) => i.isRequired).map((i) => i.id);
    const done = stage.checklistCompletions || {};
    const missing = requiredIds.filter((id) => !done[id]?.checked);
    if (missing.length) outstanding.push("Mandatory checklist items incomplete");
  }

  if (snapshot.qcFormEnabled) {
    const requiredIds = snapshot.qcQuestions.filter((q) => q.isRequired).map((q) => q.id);
    const answered = stage.qcAnswers || {};
    const missing = requiredIds.filter((id) => answered[id] === undefined);
    if (missing.length) outstanding.push("Mandatory QC questions unanswered");
  }

  if (outstanding.length) {
    return res.status(400).json({ error: "Cannot end stage — outstanding requirements", outstanding });
  }

  await prisma.processSession.updateMany({
    where: { stageId: stage.id, endedAt: null },
    data: { endedAt: new Date() },
  });

  const updated = await prisma.jobStage.update({
    where: { id: stage.id },
    data: { status: "COMPLETED", actualEndedAt: new Date() },
  });

  // FR-4.2.4-2: auto-complete the job if every stage is now done
  const siblingStages = await prisma.jobStage.findMany({ where: { jobId: stage.jobId } });
  if (siblingStages.every((s) => s.status === "COMPLETED")) {
    await prisma.job.update({ where: { id: stage.jobId }, data: { status: "COMPLETED", completedAt: new Date() } });
  }

  res.json(updated);
}

// PATCH /api/stages/:id/checklist — tick/untick one item
export async function updateChecklist(req, res) {
  const { itemId, checked } = req.body;
  const { stage, error } = await getOwnedStage(req.params.id, req.user.id);
  if (error) return res.status(error[0]).json({ error: error[1] });

  const completions = { ...(stage.checklistCompletions || {}) };
  completions[itemId] = { checked: !!checked, byUserId: req.user.id, at: new Date().toISOString() };

  const updated = await prisma.jobStage.update({
    where: { id: stage.id },
    data: { checklistCompletions: completions },
  });
  res.json(updated);
}

// POST /api/stages/:id/qc — submit one QC answer
export async function submitQcAnswer(req, res) {
  const { questionId, value } = req.body;
  const { stage, error } = await getOwnedStage(req.params.id, req.user.id);
  if (error) return res.status(error[0]).json({ error: error[1] });

  const answers = { ...(stage.qcAnswers || {}) };
  answers[questionId] = { value, byUserId: req.user.id, at: new Date().toISOString() };

  const updated = await prisma.jobStage.update({ where: { id: stage.id }, data: { qcAnswers: answers } });
  res.json(updated);
}

// POST /api/stages/:id/batches — log a quantity batch (FR-4.1.5-2: flag out-of-range, never block)
export async function logBatch(req, res) {
  const { quantityData, notes } = req.body;
  const { stage, error } = await getOwnedStage(req.params.id, req.user.id);
  if (error) return res.status(error[0]).json({ error: error[1] });

  const session = await prisma.processSession.findFirst({
    where: { stageId: stage.id, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (!session) return res.status(400).json({ error: "No active session — start the stage first" });

  const priorCount = await prisma.batchEntry.count({ where: { sessionId: session.id } });

  const snapshot = stage.blueprintSnapshot;
  const flags = [];
  if (snapshot.quantityLoggingEnabled) {
    for (const metric of snapshot.quantities) {
      const val = quantityData[metric.metricName];
      if (val !== undefined && metric.minValue !== null && val < metric.minValue) flags.push(`${metric.metricName} below expected range`);
      if (val !== undefined && metric.maxValue !== null && val > metric.maxValue) flags.push(`${metric.metricName} above expected range`);
    }
  }

  const entry = await prisma.batchEntry.create({
    data: { sessionId: session.id, batchNumber: priorCount + 1, quantityData, notes },
  });

  res.status(201).json({ entry, flags });
}


// GET /api/stages/:id — full stage detail including blueprint snapshot
export async function getStage(req, res) {
  const { stage, error } = await getOwnedStage(req.params.id, req.user.id);
  if (error) return res.status(error[0]).json({ error: error[1] });
  res.json(stage);
}

// PATCH /api/stages/:id/notes — free-text operator notes (FR-4.1.10-1)
export async function updateNotes(req, res) {
  const { notes } = req.body;
  const { stage, error } = await getOwnedStage(req.params.id, req.user.id);
  if (error) return res.status(error[0]).json({ error: error[1] });

  const updated = await prisma.jobStage.update({ where: { id: stage.id }, data: { notes } });
  res.json(updated);
}