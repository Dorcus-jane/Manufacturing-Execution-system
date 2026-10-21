-- AlterTable
ALTER TABLE "JobStage" ADD COLUMN     "checklistCompletions" JSONB,
ADD COLUMN     "lotNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "qcAnswers" JSONB;
