-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EXECUTIVE', 'MANAGER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "ChecklistValidationTiming" AS ENUM ('BEFORE_START', 'BEFORE_END', 'BOTH');

-- CreateEnum
CREATE TYPE "QcResponseType" AS ENUM ('YES_NO', 'NUMERIC', 'TEXT', 'PASS_FAIL');

-- CreateEnum
CREATE TYPE "InputFrequency" AS ENUM ('ONCE', 'PER_BATCH', 'HOURLY');

-- CreateEnum
CREATE TYPE "FaultSeverity" AS ENUM ('MINOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStageStatus" AS ENUM ('PENDING', 'AVAILABLE', 'RUNNING', 'PAUSED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "fullName" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "operatorName" TEXT,
    "phone" TEXT,
    "pin" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLine" (
    "id" TEXT NOT NULL,
    "lineCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetProduct" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "managerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ProductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blueprint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stationTag" TEXT,
    "category" TEXT,
    "estimatedDurationMinutes" INTEGER,
    "guidelinesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "checklistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quantityLoggingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "qcFormEnabled" BOOLEAN NOT NULL DEFAULT false,
    "faultCategoriesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "guidelinesContent" TEXT,
    "checklistValidationTiming" "ChecklistValidationTiming",
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintQuantity" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "inputFrequency" "InputFrequency" NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "BlueprintQuantity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintChecklistItem" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "itemText" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "BlueprintChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintQcQuestion" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "responseType" "QcResponseType" NOT NULL,
    "numericMinValue" DOUBLE PRECISION,
    "numericMaxValue" DOUBLE PRECISION,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "BlueprintQcQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintFaultCategory" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "faultName" TEXT NOT NULL,
    "severity" "FaultSeverity" NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "BlueprintFaultCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT,
    "productName" TEXT NOT NULL,
    "targetQuantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "targetDate" TIMESTAMP(3),
    "scheduledStartAt" TIMESTAMP(3),
    "scheduledEndAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lineId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobStage" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "blueprintId" TEXT,
    "blueprintSnapshot" JSONB NOT NULL,
    "stageOrder" INTEGER NOT NULL,
    "stageName" TEXT NOT NULL,
    "stationTag" TEXT,
    "notes" TEXT,
    "estimatedDurationMinutes" INTEGER,
    "status" "JobStageStatus" NOT NULL DEFAULT 'PENDING',
    "operatorId" TEXT NOT NULL,
    "scheduledStartAt" TIMESTAMP(3),
    "scheduledEndAt" TIMESTAMP(3),
    "actualStartedAt" TIMESTAMP(3),
    "actualEndedAt" TIMESTAMP(3),

    CONSTRAINT "JobStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessSession" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ProcessSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "quantityData" JSONB NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "BatchEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaultLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stageId" TEXT,
    "operatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "severity" "FaultSeverity" NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNotes" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaultLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionLine_lineCode_key" ON "ProductionLine"("lineCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionLine_managerId_key" ON "ProductionLine"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "Blueprint_name_key" ON "Blueprint"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobId_key" ON "Job"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobStage_jobId_stageOrder_key" ON "JobStage"("jobId", "stageOrder");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintQuantity" ADD CONSTRAINT "BlueprintQuantity_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintChecklistItem" ADD CONSTRAINT "BlueprintChecklistItem_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintQcQuestion" ADD CONSTRAINT "BlueprintQcQuestion_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintFaultCategory" ADD CONSTRAINT "BlueprintFaultCategory_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStage" ADD CONSTRAINT "JobStage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStage" ADD CONSTRAINT "JobStage_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStage" ADD CONSTRAINT "JobStage_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessSession" ADD CONSTRAINT "ProcessSession_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JobStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessSession" ADD CONSTRAINT "ProcessSession_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchEntry" ADD CONSTRAINT "BatchEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ProcessSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultLog" ADD CONSTRAINT "FaultLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultLog" ADD CONSTRAINT "FaultLog_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JobStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultLog" ADD CONSTRAINT "FaultLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultLog" ADD CONSTRAINT "FaultLog_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
