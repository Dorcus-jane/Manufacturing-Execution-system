import prisma from "../config/prisma.js";

// POST /api/blueprints — Manager only
export async function createBlueprint(req, res) {
  

  const {
    name, description, stationTag, category, estimatedDurationMinutes,
    guidelinesEnabled, guidelinesContent,
    checklistEnabled, checklistValidationTiming, checklistItems,
    quantityLoggingEnabled, quantities,
    qcFormEnabled, qcQuestions,
    faultCategoriesEnabled, faultCategories,
  } = req.body;

  if (!name) return res.status(400).json({ error: "name is required" });

  const anyEnabled = guidelinesEnabled || checklistEnabled || quantityLoggingEnabled || qcFormEnabled || faultCategoriesEnabled;
  if (!anyEnabled) {
    return res.status(400).json({ error: "At least one section must be enabled (FR-4.1.1-2)" });
  }

  const existing = await prisma.blueprint.findUnique({ where: { name } });
  if (existing) return res.status(409).json({ error: "A blueprint with this name already exists" });

  const blueprint = await prisma.blueprint.create({
    data: {
      name, description, stationTag, category, estimatedDurationMinutes,
      guidelinesEnabled: !!guidelinesEnabled,
      guidelinesContent: guidelinesEnabled ? guidelinesContent : null,
      checklistEnabled: !!checklistEnabled,
      checklistValidationTiming: checklistEnabled ? checklistValidationTiming : null,
      quantityLoggingEnabled: !!quantityLoggingEnabled,
      qcFormEnabled: !!qcFormEnabled,
      faultCategoriesEnabled: !!faultCategoriesEnabled,

      checklistItems: checklistEnabled && checklistItems ? {
        create: checklistItems.map((item, i) => ({
          itemText: item.itemText, isRequired: item.isRequired ?? true, sortOrder: i,
        })),
      } : undefined,

      quantities: quantityLoggingEnabled && quantities ? {
        create: quantities.map((q, i) => ({
          metricName: q.metricName, unitLabel: q.unitLabel,
          minValue: q.minValue ?? null, maxValue: q.maxValue ?? null,
          inputFrequency: q.inputFrequency || "ONCE", sortOrder: i,
        })),
      } : undefined,

      qcQuestions: qcFormEnabled && qcQuestions ? {
        create: qcQuestions.map((q, i) => ({
          questionText: q.questionText, responseType: q.responseType || "PASS_FAIL",
          numericMinValue: q.numericMinValue ?? null, numericMaxValue: q.numericMaxValue ?? null,
          isRequired: q.isRequired ?? true, sortOrder: i,
        })),
      } : undefined,

      faultCategories: faultCategoriesEnabled && faultCategories ? {
        create: faultCategories.map((f, i) => ({
          faultName: f.faultName, severity: f.severity || "MINOR", sortOrder: i,
        })),
      } : undefined,
    },
    include: { checklistItems: true, quantities: true, qcQuestions: true, faultCategories: true },
  });

  res.status(201).json(blueprint);
}

// GET /api/blueprints — active library (non-archived)
export async function listBlueprints(req, res) {
  const blueprints = await prisma.blueprint.findMany({
    where: { isArchived: false },
    include: { checklistItems: true, quantities: true, qcQuestions: true, faultCategories: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(blueprints);
}

// PATCH /api/blueprints/:id/archive — Manager only (FR-4.1.1-3)
export async function archiveBlueprint(req, res) {
  const blueprint = await prisma.blueprint.update({
    where: { id: req.params.id },
    data: { isArchived: true },
  });
  res.json(blueprint);
}