-- ============================================================
-- TAO Recruit AI — Migration 006: Evaluations Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- ── Evaluations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id        UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id          UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  job_id                UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  technical_score       INTEGER NOT NULL CHECK (technical_score >= 0 AND technical_score <= 100),
  communication_score   INTEGER NOT NULL CHECK (communication_score >= 0 AND communication_score <= 100),
  experience_score      INTEGER NOT NULL CHECK (experience_score >= 0 AND experience_score <= 100),
  problem_solving_score INTEGER NOT NULL CHECK (problem_solving_score >= 0 AND problem_solving_score <= 100),
  culture_fit_score     INTEGER NOT NULL CHECK (culture_fit_score >= 0 AND culture_fit_score <= 100),
  overall_score         INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  recommendation        TEXT NOT NULL, -- 'highly_recommended', 'recommended', 'consider', 'not_recommended'
  recruiter_summary     TEXT NOT NULL DEFAULT '',
  ai_rationale          TEXT NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(application_id) -- One evaluation per application
);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Evaluations policies
CREATE POLICY "Candidates can view own evaluations"
  ON evaluations FOR SELECT
  USING (candidate_id = auth.uid());

CREATE POLICY "Recruiters can manage all evaluations"
  ON evaluations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

-- ── Performance Indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_evaluations_application_id ON evaluations(application_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_candidate_id ON evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_job_id ON evaluations(job_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_overall_score ON evaluations(overall_score DESC);
