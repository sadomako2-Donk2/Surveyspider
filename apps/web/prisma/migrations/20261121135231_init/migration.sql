-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'ANALYST', 'MEMBER');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'GHS', 'GBP', 'EUR');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('REGISTERED', 'INTEREST', 'CONFIRMED', 'ATTENDED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'LIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE', 'MULTI', 'RATING', 'LIKERT', 'TEXT', 'NUMBER');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('APPROVED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EnquiryType" AS ENUM ('ANALYTICS', 'CONSULTANCY', 'TRAINING', 'CONTACT');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'IN_PROGRESS', 'WON', 'CLOSED');

-- CreateEnum
CREATE TYPE "FieldworkStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "passwordHash" TEXT,
    "googleSubject" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantProfile" (
    "userId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "level" TEXT NOT NULL DEFAULT '',
    "format" TEXT NOT NULL DEFAULT '',
    "duration" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "outcomes" TEXT[],
    "audience" TEXT NOT NULL DEFAULT '',
    "certificate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSession" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "courseId" TEXT NOT NULL,
    "startsOn" DATE,
    "endsOn" DATE,
    "location" TEXT NOT NULL DEFAULT '',
    "seats" INTEGER NOT NULL DEFAULT 0,
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sessionId" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'REGISTERED',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "organisation" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "ownerId" TEXT NOT NULL,
    "organisationId" TEXT,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "rewardMinor" INTEGER NOT NULL DEFAULT 0,
    "rewardCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "targetResponses" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "screening" JSONB NOT NULL DEFAULT '{}',
    "attentionCheck" BOOLEAN NOT NULL DEFAULT false,
    "libraryHeadline" TEXT,
    "libraryPublishedAt" TIMESTAMP(3),
    "launchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyVersion" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "consentText" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "versionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "scale" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "surveyVersionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "surveyId" TEXT NOT NULL,
    "surveyVersionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "consentRecordId" TEXT,
    "status" "ResponseStatus" NOT NULL DEFAULT 'APPROVED',
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "rewardMinor" INTEGER NOT NULL DEFAULT 0,
    "rewardCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "passedAttention" BOOLEAN,
    "speeder" BOOLEAN NOT NULL DEFAULT false,
    "durationSeconds" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightAction" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "surveyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "why" TEXT NOT NULL DEFAULT '',
    "questionId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "assignee" TEXT NOT NULL DEFAULT '',
    "dueOn" DATE,
    "kpi" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "type" "EnquiryType" NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "requesterId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "organisation" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "service" TEXT NOT NULL DEFAULT '',
    "timeline" TEXT NOT NULL DEFAULT '',
    "budget" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldworkRequest" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "ref" TEXT NOT NULL,
    "status" "FieldworkStatus" NOT NULL DEFAULT 'NEW',
    "requesterId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "organisation" TEXT NOT NULL DEFAULT '',
    "preferredStart" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "inputs" JSONB NOT NULL,
    "quote" JSONB NOT NULL,
    "quoteTotalUsd" INTEGER NOT NULL,
    "surveySnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldworkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "organisationId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_legacyId_key" ON "User"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_slug_key" ON "Organisation"("slug");

-- CreateIndex
CREATE INDEX "Membership_organisationId_idx" ON "Membership"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organisationId_key" ON "Membership"("userId", "organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_legacyId_key" ON "Course"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CourseSession_legacyId_key" ON "CourseSession"("legacyId");

-- CreateIndex
CREATE INDEX "CourseSession_courseId_startsOn_idx" ON "CourseSession"("courseId", "startsOn");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_legacyId_key" ON "Enrollment"("legacyId");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");

-- CreateIndex
CREATE INDEX "Enrollment_sessionId_status_idx" ON "Enrollment"("sessionId", "status");

-- CreateIndex
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Survey_legacyId_key" ON "Survey"("legacyId");

-- CreateIndex
CREATE INDEX "Survey_ownerId_idx" ON "Survey"("ownerId");

-- CreateIndex
CREATE INDEX "Survey_status_idx" ON "Survey"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyVersion_surveyId_number_key" ON "SurveyVersion"("surveyId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Question_versionId_position_key" ON "Question"("versionId", "position");

-- CreateIndex
CREATE INDEX "ConsentRecord_participantId_idx" ON "ConsentRecord"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Response_legacyId_key" ON "Response"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Response_consentRecordId_key" ON "Response"("consentRecordId");

-- CreateIndex
CREATE INDEX "Response_surveyVersionId_idx" ON "Response"("surveyVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Response_surveyId_participantId_key" ON "Response"("surveyId", "participantId");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_responseId_questionId_key" ON "Answer"("responseId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "InsightAction_legacyId_key" ON "InsightAction"("legacyId");

-- CreateIndex
CREATE INDEX "InsightAction_surveyId_idx" ON "InsightAction"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_legacyId_key" ON "Enquiry"("legacyId");

-- CreateIndex
CREATE INDEX "Enquiry_type_status_idx" ON "Enquiry"("type", "status");

-- CreateIndex
CREATE INDEX "Enquiry_requesterId_idx" ON "Enquiry"("requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldworkRequest_legacyId_key" ON "FieldworkRequest"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldworkRequest_ref_key" ON "FieldworkRequest"("ref");

-- CreateIndex
CREATE INDEX "FieldworkRequest_status_idx" ON "FieldworkRequest"("status");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantProfile" ADD CONSTRAINT "ParticipantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CourseSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyVersion" ADD CONSTRAINT "SurveyVersion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SurveyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_surveyVersionId_fkey" FOREIGN KEY ("surveyVersionId") REFERENCES "SurveyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_surveyVersionId_fkey" FOREIGN KEY ("surveyVersionId") REFERENCES "SurveyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_consentRecordId_fkey" FOREIGN KEY ("consentRecordId") REFERENCES "ConsentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightAction" ADD CONSTRAINT "InsightAction_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightAction" ADD CONSTRAINT "InsightAction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldworkRequest" ADD CONSTRAINT "FieldworkRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Rules that Prisma's schema language can't express. Keep them in this file.
-- ============================================================================

-- Emails are stored lower-case so uniqueness can't be dodged with capitals.
ALTER TABLE "User" ADD CONSTRAINT "User_email_lowercase" CHECK ("email" = lower("email"));

-- Sensible values.
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_seats_nonnegative" CHECK ("seats" >= 0);
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_fee_nonnegative" CHECK ("feeMinor" >= 0);
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_dates_ordered" CHECK ("endsOn" IS NULL OR "startsOn" IS NULL OR "endsOn" >= "startsOn");
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_numbers_nonnegative" CHECK ("rewardMinor" >= 0 AND "targetResponses" >= 0 AND "estimatedMinutes" >= 0);
ALTER TABLE "Response" ADD CONSTRAINT "Response_reward_nonnegative" CHECK ("rewardMinor" >= 0);
ALTER TABLE "ParticipantProfile" ADD CONSTRAINT "ParticipantProfile_adult" CHECK ("age" BETWEEN 18 AND 120);
ALTER TABLE "Question" ADD CONSTRAINT "Question_position_nonnegative" CHECK ("position" >= 0);

-- One active course registration per person, course and date (interest without a date counts as one "date").
CREATE UNIQUE INDEX "Enrollment_one_active_per_person"
  ON "Enrollment" ("userId", "courseId", COALESCE("sessionId", ''))
  WHERE "status" <> 'CANCELLED';

-- A registration's date must belong to the same course.
CREATE FUNCTION afri_enrollment_session_matches_course() RETURNS trigger AS $$
BEGIN
  IF NEW."sessionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "CourseSession" s WHERE s.id = NEW."sessionId" AND s."courseId" = NEW."courseId"
  ) THEN
    RAISE EXCEPTION 'Enrollment session % does not belong to course %', NEW."sessionId", NEW."courseId"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "Enrollment_session_matches_course"
  BEFORE INSERT OR UPDATE OF "sessionId", "courseId" ON "Enrollment"
  FOR EACH ROW EXECUTE FUNCTION afri_enrollment_session_matches_course();

-- Published survey versions are immutable: they can be read, never changed or deleted.
-- The only allowed change is publishing a draft (publishedAt NULL -> a timestamp).
CREATE FUNCTION afri_protect_published_version() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."publishedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Survey version % is published and cannot be deleted', OLD.id USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD."publishedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Survey version % is published and cannot be changed', OLD.id USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "SurveyVersion_immutable_when_published"
  BEFORE UPDATE OR DELETE ON "SurveyVersion"
  FOR EACH ROW EXECUTE FUNCTION afri_protect_published_version();

CREATE FUNCTION afri_protect_published_questions() RETURNS trigger AS $$
DECLARE
  vid TEXT;
BEGIN
  vid := CASE WHEN TG_OP = 'DELETE' THEN OLD."versionId" ELSE NEW."versionId" END;
  IF EXISTS (SELECT 1 FROM "SurveyVersion" v WHERE v.id = vid AND v."publishedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'Questions of published survey version % cannot be changed', vid USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."versionId" <> NEW."versionId" AND EXISTS (
    SELECT 1 FROM "SurveyVersion" v WHERE v.id = OLD."versionId" AND v."publishedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Questions cannot be moved out of a published survey version' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "Question_immutable_when_published"
  BEFORE INSERT OR UPDATE OR DELETE ON "Question"
  FOR EACH ROW EXECUTE FUNCTION afri_protect_published_questions();

-- Responses must be given to a published version of the same survey, and answers must
-- belong to questions of that version.
CREATE FUNCTION afri_response_version_check() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "SurveyVersion" v
    WHERE v.id = NEW."surveyVersionId" AND v."surveyId" = NEW."surveyId" AND v."publishedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Responses must use a published version of survey %', NEW."surveyId" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "Response_uses_published_version"
  BEFORE INSERT OR UPDATE OF "surveyId", "surveyVersionId" ON "Response"
  FOR EACH ROW EXECUTE FUNCTION afri_response_version_check();

CREATE FUNCTION afri_answer_question_check() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Response" r JOIN "Question" q ON q."versionId" = r."surveyVersionId"
    WHERE r.id = NEW."responseId" AND q.id = NEW."questionId"
  ) THEN
    RAISE EXCEPTION 'Answer question % is not part of the response''s survey version', NEW."questionId" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "Answer_question_in_version"
  BEFORE INSERT OR UPDATE OF "responseId", "questionId" ON "Answer"
  FOR EACH ROW EXECUTE FUNCTION afri_answer_question_check();

-- The audit log is append-only.
CREATE FUNCTION afri_audit_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent rows cannot be changed or deleted' USING ERRCODE = 'integrity_constraint_violation';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "AuditEvent_append_only"
  BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION afri_audit_append_only();
CREATE TRIGGER "AuditEvent_no_truncate"
  BEFORE TRUNCATE ON "AuditEvent"
  FOR EACH STATEMENT EXECUTE FUNCTION afri_audit_append_only();
