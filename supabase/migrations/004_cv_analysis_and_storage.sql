-- ============================================================
-- TAO Recruit AI — Migration 004: CV Analysis & Storage
-- Run this in your Supabase SQL editor
-- ============================================================

-- ── CV Analyses Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cv_analyses (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id        UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id          UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  job_id                UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Extracted fields
  full_name             TEXT,
  email                 TEXT,
  phone                 TEXT,
  location              TEXT,
  skills                TEXT[] NOT NULL DEFAULT '{}',
  education             JSONB NOT NULL DEFAULT '[]',
  certifications        TEXT[] NOT NULL DEFAULT '{}',
  work_experience       JSONB NOT NULL DEFAULT '[]',
  
  -- AI Evaluation metrics
  professional_summary  TEXT NOT NULL DEFAULT '',
  strengths             TEXT[] NOT NULL DEFAULT '{}',
  weaknesses            TEXT[] NOT NULL DEFAULT '{}',
  recommendations       TEXT NOT NULL DEFAULT '',
  job_fit_score         INTEGER NOT NULL CHECK (job_fit_score >= 0 AND job_fit_score <= 100),
  raw_json              JSONB NOT NULL DEFAULT '{}',
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(application_id)
);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE cv_analyses ENABLE ROW LEVEL SECURITY;

-- Policies for CV Analyses
CREATE POLICY "Candidates can view own CV analysis"
  ON cv_analyses FOR SELECT
  USING (candidate_id = auth.uid());

CREATE POLICY "Recruiters can manage all CV analyses"
  ON cv_analyses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

-- ── Performance Indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cv_analyses_application_id ON cv_analyses(application_id);
CREATE INDEX IF NOT EXISTS idx_cv_analyses_candidate_id ON cv_analyses(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cv_analyses_job_id ON cv_analyses(job_id);
CREATE INDEX IF NOT EXISTS idx_cv_analyses_job_fit_score ON cv_analyses(job_fit_score DESC);

-- ── Storage Bucket Setup ──────────────────────────────────────
-- Enable storage bucket for resumes if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket policies for storage.objects
-- Note: Check if policies already exist to avoid errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access for Resumes'
  ) THEN
    CREATE POLICY "Public Read Access for Resumes" ON storage.objects
      FOR SELECT USING (bucket_id = 'resumes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Insert Access for Resumes'
  ) THEN
    CREATE POLICY "Public Insert Access for Resumes" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'resumes');
  END IF;
END$$;
