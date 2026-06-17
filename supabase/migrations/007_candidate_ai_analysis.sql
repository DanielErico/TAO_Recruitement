-- ============================================================
-- TAO Recruit AI — Migration 007: Candidate AI Analysis
-- Run this in your Supabase SQL editor BEFORE deploying.
-- ============================================================

-- ── New Table: candidate_ai_analysis ─────────────────────────
-- Primary store for all AI-generated CV analysis results.
-- Replaces reliance on cv_analyses for dashboard display.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_ai_analysis (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  application_id          UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id            UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  job_id                  UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- CV Extraction
  extracted_text          TEXT NOT NULL DEFAULT '',
  extraction_status       TEXT NOT NULL DEFAULT 'pending'
                            CHECK (extraction_status IN ('pending','success','failed','empty')),
  extraction_error        TEXT,

  -- AI Analysis Output
  professional_summary    TEXT NOT NULL DEFAULT '',
  skills                  TEXT[] NOT NULL DEFAULT '{}',
  strengths               TEXT[] NOT NULL DEFAULT '{}',
  risks                   TEXT[] NOT NULL DEFAULT '{}',
  years_of_experience     TEXT NOT NULL DEFAULT '',
  work_experience         JSONB NOT NULL DEFAULT '[]',
  education               JSONB NOT NULL DEFAULT '[]',
  certifications          TEXT[] NOT NULL DEFAULT '{}',
  recommended_role_fit    TEXT NOT NULL DEFAULT '',
  overall_score           INTEGER NOT NULL DEFAULT 0
                            CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Metadata
  ai_model                TEXT NOT NULL DEFAULT 'nvidia/llama-3.1-nemotron-70b-instruct',
  analyzed_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One analysis per application (re-analysis replaces existing row)
  UNIQUE(application_id)
);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_candidate_ai_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidate_ai_analysis_updated_at
  BEFORE UPDATE ON candidate_ai_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_ai_analysis_updated_at();

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE candidate_ai_analysis ENABLE ROW LEVEL SECURITY;

-- Candidates can view their own analysis
CREATE POLICY "Candidates can view own AI analysis"
  ON candidate_ai_analysis FOR SELECT
  USING (candidate_id = auth.uid());

-- Recruiters and admins have full access
CREATE POLICY "Recruiters can manage all AI analyses"
  ON candidate_ai_analysis FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

-- Service role bypass (used by Next.js backend with admin client)
CREATE POLICY "Service role full access"
  ON candidate_ai_analysis FOR ALL
  USING (auth.role() = 'service_role');

-- ── Performance Indexes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_caa_application_id  ON candidate_ai_analysis(application_id);
CREATE INDEX IF NOT EXISTS idx_caa_candidate_id    ON candidate_ai_analysis(candidate_id);
CREATE INDEX IF NOT EXISTS idx_caa_job_id          ON candidate_ai_analysis(job_id);
CREATE INDEX IF NOT EXISTS idx_caa_overall_score   ON candidate_ai_analysis(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_caa_analyzed_at     ON candidate_ai_analysis(analyzed_at DESC);
