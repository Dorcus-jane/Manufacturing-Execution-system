import prisma from "../config/prisma.js";

// POST /api/faults — Operator reports (FR-4.4.1)
export async function reportFault(req, res) {
  const { jobId, stageId, title, description, category, severity } = req.body;
  if (!jobId || !title || !severity) return res.status(400).json({ error: "jobId, title, and severity are required" });

  const fault = await prisma.faultLog.create({
    data: { jobId, stageId, operatorId: req.user.id, title, description, category, severity },
  });

  // Process entry's running state is NOT changed — FR-4.4.1-4
  res.status(201).json(fault);
}

// GET /api/faults/feed — unresolved faults for the Manager's Attention Feed (FR-4.5.2-1)
export async function attentionFeed(req, res) {
  const faults = await prisma.faultLog.findMany({
    where: { resolvedAt: null, job: { line: { managerId: req.user.id } } },
    include: { job: true, stage: true, operator: { select: { operatorName: true } } },
    orderBy: [{ severity: "desc" }, { loggedAt: "desc" }],
  });
  res.json(faults);
}

// PATCH /api/faults/:id/resolve
export async function resolveFault(req, res) {
  const { action, resolutionNotes } = req.body; // action: "DISMISSED" | "PAUSED_STAGE" | "EMERGENCY_STOP"
  const fault = await prisma.faultLog.findUnique({ where: { id: req.params.id } });
  if (!fault) return res.status(404).json({ error: "Fault not found" });

  if (action === "PAUSED_STAGE" && fault.stageId) {
    await prisma.jobStage.update({ where: { id: fault.stageId }, data: { status: "PAUSED" } });
  }
  if (action === "EMERGENCY_STOP") {
    await prisma.jobStage.updateMany({
      where: { jobId: fault.jobId, status: { in: ["RUNNING", "AVAILABLE"] } },
      data: { status: "PAUSED" },
    });
    await prisma.job.update({ where: { id: fault.jobId }, data: { status: "PAUSED" } });
  }

  const updated = await prisma.faultLog.update({
    where: { id: fault.id },
    data: { resolvedAt: new Date(), resolvedById: req.user.id, resolutionNotes },
  });

  res.json(updated);
}

// GET /api/faults — full fault history for the Manager's line(s), resolved + unresolved (SRS §4.6.2-3 retention)
export async function listFaults(req, res) {
  const faults = await prisma.faultLog.findMany({
    where: { job: { line: { managerId: req.user.id } } },
    include: {
      job: { select: { jobId: true, productName: true } },
      stage: { select: { stageName: true } },
      operator: { select: { operatorName: true, fullName: true } },
    },
    orderBy: { loggedAt: "desc" },
  });
  res.json(faults);
}

// GET /api/faults/critical — Executive only: unresolved Critical faults across ALL lines
export async function criticalAlerts(req, res) {
  const faults = await prisma.faultLog.findMany({
    where: { resolvedAt: null, severity: "CRITICAL" },
    include: {
      job: { select: { jobId: true, productName: true, line: { select: { name: true } } } },
      stage: { select: { stageName: true } },
      operator: { select: { operatorName: true, fullName: true } },
    },
    orderBy: { loggedAt: "desc" },
  });
  res.json(faults);
}