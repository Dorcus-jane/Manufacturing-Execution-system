import prisma from "../config/prisma.js";

function parseDateRange(req) {
  const { from, to } = req.query;
  return {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };
}

// GET /api/stats/jobs?from=&to= — Job History (FR-4.6.1-1)
export async function jobHistory(req, res) {
  const { from, to } = parseDateRange(req);

  const jobs = await prisma.job.findMany({
    where: {
      status: { in: ["COMPLETED", "CANCELLED"] },
      ...(from && to ? { completedAt: { gte: from, lte: to } } : {}),
    },
    include: {
      line: { select: { name: true } },
      stages: {
        select: { stageName: true, actualStartedAt: true, actualEndedAt: true, status: true },
        orderBy: { stageOrder: "asc" },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  const shaped = jobs.map((j) => ({
    jobId: j.jobId,
    lineName: j.line.name,
    productName: j.productName,
    targetQuantity: j.targetQuantity,
    unit: j.unit,
    completionDate: j.completedAt,
    status: j.status,
    stageBreakdown: j.stages.map((s) => ({
      stageName: s.stageName,
      status: s.status,
      durationMinutes:
        s.actualStartedAt && s.actualEndedAt
          ? Math.round((new Date(s.actualEndedAt) - new Date(s.actualStartedAt)) / 60000)
          : null,
    })),
  }));

  res.json(shaped);
}

// GET /api/stats/faults?from=&to= — Fault Analytics (FR-4.6.2)
export async function faultAnalytics(req, res) {
  const { from, to } = parseDateRange(req);

  const faults = await prisma.faultLog.findMany({
    where: from && to ? { loggedAt: { gte: from, lte: to } } : {},
    select: { category: true, severity: true, loggedAt: true, resolvedAt: true },
  });

  const byCategory = {};
  for (const f of faults) {
    const key = f.category || "Uncategorized";
    if (!byCategory[key]) byCategory[key] = { category: key, frequency: 0, minor: 0, critical: 0 };
    byCategory[key].frequency += 1;
    if (f.severity === "CRITICAL") byCategory[key].critical += 1;
    else byCategory[key].minor += 1;
  }

  res.json({
    totalFaults: faults.length,
    minorCount: faults.filter((f) => f.severity === "MINOR").length,
    criticalCount: faults.filter((f) => f.severity === "CRITICAL").length,
    byCategory: Object.values(byCategory).sort((a, b) => b.frequency - a.frequency),
  });
}

// GET /api/stats/scrap?from=&to= — Scrap Analytics (FR-4.6.3-1)
export async function scrapAnalytics(req, res) {
  const { from, to } = parseDateRange(req);

  const entries = await prisma.scrapLog.findMany({
    where: from && to ? { loggedAt: { gte: from, lte: to } } : {},
    include: {
      job: { select: { jobId: true, line: { select: { name: true } } } },
      stage: { select: { stageName: true } },
    },
    orderBy: { loggedAt: "desc" },
  });

  const shaped = entries.map((e) => ({
    lineName: e.job.line.name,
    process: e.stage?.stageName || "—",
    scrapType: e.scrapType,
    quantity: e.quantity,
    unit: e.unit,
    jobId: e.job.jobId,
    loggedAt: e.loggedAt,
  }));

  res.json(shaped);
}

// GET /api/stats/operators — Operator Activity, descriptive only (FR-4.6.4)
export async function operatorActivity(req, res) {
  const operators = await prisma.user.findMany({
    where: { role: "OPERATOR" },
    include: {
      jobStages: { where: { status: "COMPLETED" }, select: { actualStartedAt: true, actualEndedAt: true, estimatedDurationMinutes: true } },
      faultsReported: { select: { id: true } },
    },
  });

  const result = operators.map((op) => {
    const completed = op.jobStages;
    const durations = completed
      .filter((s) => s.actualStartedAt && s.actualEndedAt)
      .map((s) => (new Date(s.actualEndedAt) - new Date(s.actualStartedAt)) / 60000);

    const avgActual = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

    const estimates = completed.filter((s) => s.estimatedDurationMinutes != null).map((s) => s.estimatedDurationMinutes);
    const avgEstimate = estimates.length ? estimates.reduce((a, b) => a + b, 0) / estimates.length : null;

    return {
      name: op.operatorName,
      entriesCompleted: completed.length,
      avgActualDurationMinutes: avgActual ? Math.round(avgActual * 10) / 10 : null,
      avgBlueprintEstimateMinutes: avgEstimate ? Math.round(avgEstimate * 10) / 10 : null,
      totalFaultsLogged: op.faultsReported.length,
    };
  });

  res.json(result);
}