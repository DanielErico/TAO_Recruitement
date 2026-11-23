-- ============================================================
-- TAO Recruit AI — Migration 012: Plan B Assessment Support
-- ============================================================
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor).
--
-- What this migration covers:
--   1. Relax NOT NULL constraints on evaluations score columns
--      (Plan B AI may legitimately produce 0 for tab-switch-penalised
--       legacy records; more importantly the UPSERT path must succeed
--       even when individual flat scores are null before structured JSON
--       parsing populates them.)
--   2. Add a nullable `job_fit_score` column to candidate_ai_analysis
--      (the pipeline page reads cv_analysis.job_fit_score which the
--       legacy cv_analyses table had; this mirrors it on the new table.)
--   3. Ensure the `responsibilities` column exists on jobs
--      (assessment-engine.ts and submit/reset routes read job.responsibilities;
--       migration 002 defines it but older databases may be missing it.)
--   4. Add service-role bypass policies on interviews and interview_responses
--      (the Plan B submit route uses createAdminClient() which runs as
--       service_role and must be able to INSERT/UPDATE freely.)
--   5. Add a service-role bypass policy on evaluations
--      (same reason — the submit and reset routes upsert evaluations via
--       the admin client.)
--   6. Performance index on interview_responses.created_at
--      (the submit route orders responses by created_at ascending.)
-- ============================================================


-- ── 1. Relax evaluations score constraints ───────────────────
--
-- The original schema has NOT NULL on every score column.
-- When the AI returns a tab-switch-penalised evaluation the
-- individual scores may all be 0, but that is still valid data.
-- The structured JSON block inside ai_rationale carries the real
-- competency breakdown. Relaxing to allow NULL makes future
-- partial upserts safe.
--
-- NOTE: We also drop the CHECK > 0 lower bounds so that a
-- legitimate 0 score can be stored without a constraint violation.

ALTER TABLE evaluations
  ALTER COLUMN technical_score       DROP NOT NULL,
  ALTER COLUMN communication_score   DROP NOT NULL,
  ALTER COLUMN experience_score      DROP NOT NULL,
  ALTER COLUMN problem_solving_score DROP NOT NULL,
  ALTER COLUMN culture_fit_score     DROP NOT NULL;

-- Drop existing check constraints and replace with nullable-aware ones
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_technical_score_check;
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_communication_score_check;
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_experience_score_check;
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_problem_solving_score_check;
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_culture_fit_score_check;
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_overall_score_check;

ALTER TABLE evaluations
  ADD CONSTRAINT evaluations_technical_score_check
    CHECK (technical_score IS NULL OR (technical_score >= 0 AND technical_score <= 100)),
  ADD CONSTRAINT evaluations_communication_score_check
    CHECK (communication_score IS NULL OR (communication_score >= 0 AND communication_score <= 100)),
  ADD CONSTRAINT evaluations_experience_score_check
    CHECK (experience_score IS NULL OR (experience_score >= 0 AND experience_score <= 100)),
  ADD CONSTRAINT evaluations_problem_solving_score_check
    CHECK (problem_solving_score IS NULL OR (problem_solving_score >= 0 AND problem_solving_score <= 100)),
  ADD CONSTRAINT evaluations_culture_fit_score_check
    CHECK (culture_fit_score IS NULL OR (culture_fit_score >= 0 AND culture_fit_score <= 100)),
  ADD CONSTRAINT evaluations_overall_score_check
    CHECK (overall_score >= 0 AND overall_score <= 100);

-- Also make recruiter_summary and ai_rationale default to '' so the
-- UPSERT never fails on a missing value
ALTER TABLE evaluations
  ALTER COLUMN recruiter_summary SET DEFAULT '',
  ALTER COLUMN ai_rationale      SET DEFAULT '';


-- ── 2. Add job_fit_score to candidate_ai_analysis ────────────
--
-- The pipeline page (and legacy CV analysis display) reads
-- cv_analysis.job_fit_score. The new candidate_ai_analysis table
-- stores overall_score instead. Add job_fit_score as a generated
-- column alias so both names work.

ALTER TABLE candidate_ai_analysis
  ADD COLUMN IF NOT EXISTS job_fit_score INTEGER
    GENERATED ALWAYS AS (overall_score) STORED;


-- ── 3. Ensure jobs.responsibilities exists ───────────────────
--
-- Migration 002 defines this column but some early database
-- setups may have been created before it was added.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS responsibilities TEXT NOT NULL DEFAULT '';


-- ── 4. Service-role bypass on interviews ────────────────────
--
-- The Plan B submit route uses createAdminClient() (service role).
-- Without a bypass policy the UPSERT will be blocked by RLS.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'interviews'
      AND policyname = 'Service role full access on interviews'
  ) THEN
    CREATE POLICY "Service role full access on interviews"
      ON interviews FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'interview_responses'
      AND policyname = 'Service role full access on interview_responses'
  ) THEN
    CREATE POLICY "Service role full access on interview_responses"
      ON interview_responses FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;


-- ── 5. Service-role bypass on evaluations ───────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'evaluations'
      AND policyname = 'Service role full access on evaluations'
  ) THEN
    CREATE POLICY "Service role full access on evaluations"
      ON evaluations FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;


-- ── 6. Service-role bypass on applications ──────────────────
--
-- The reset route updates application status via admin client.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'applications'
      AND policyname = 'Service role full access on applications'
  ) THEN
    CREATE POLICY "Service role full access on applications"
      ON applications FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;


-- ── 7. Index on interview_responses.created_at ───────────────

CREATE INDEX IF NOT EXISTS idx_interview_responses_created_at
  ON interview_responses(created_at ASC);


-- ── 8. Index on evaluations.recommendation ───────────────────
--
-- Recruiter dashboards filter/group by recommendation frequently.

CREATE INDEX IF NOT EXISTS idx_evaluations_recommendation
  ON evaluations(recommendation);


-- ============================================================
-- Done. Verify with:
--   SELECT column_name, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_name IN ('evaluations','candidate_ai_analysis','jobs')
--   ORDER BY table_name, ordinal_position;
-- ============================================================

