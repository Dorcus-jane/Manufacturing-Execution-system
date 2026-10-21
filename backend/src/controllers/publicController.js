import prisma from "../config/prisma.js";

// GET /api/public/stats — no auth required, safe aggregate counts only
export async function publicStats(req, res) {
  const activeLines = await prisma.productionLine.count({ where: { isActive: true } });
  const activeJobs = await prisma.job.count({ where: { status: "ACTIVE" } });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaysBatches = await prisma.batchEntry.findMany({
    where: { loggedAt: { gte: startOfDay } },
    select: { quantityData: true },
  });

  // Sums every numeric value across all logged quantity metrics today.
  // Note: this mixes units (kg, L, units) into one number since blueprints
  // define their own metrics — treat it as a rough activity indicator, not
  // a precise volume figure, unless your lines are standardized on one unit.
  let todayOutput = 0;
  for (const batch of todaysBatches) {
    if (batch.quantityData && typeof batch.quantityData === "object") {
      for (const value of Object.values(batch.quantityData)) {
        const num = Number(value);
        if (!isNaN(num)) todayOutput += num;
      }
    }
  }

  res.json({ activeLines, activeJobs, todayOutput: Math.round(todayOutput) });
}