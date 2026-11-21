-- The latest AI insight report for a survey. Only the survey owner can read it (see src/server/ai).
ALTER TABLE "Survey" ADD COLUMN "aiReport" JSONB;
