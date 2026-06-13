-- ============================================================
-- TAO Recruit AI — Migration 003: Applications & Documents
-- Run this AFTER migration 002 in your Supabase SQL editor
-- ============================================================

-- ── Enums ───────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE application_status AS ENUM (
      'applied', 'screening', 'interview', 'evaluation', 'shortlisted', 'offered', 'rejected', 'withdrawn'
    );
  END IF;
END$$;

-- ── Applications ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id               UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id         UUID NOT NULL REFERENCES user_profiles(id),
  status               application_status NOT NULL DEFAULT 'applied',
  resume_url           TEXT,
  portfolio_url        TEXT,
  cover_letter         TEXT,
  applied_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, candidate_id) -- A candidate can only apply once per job
);

-- ── Candidate Documents (Storage metadata) ────────────────────
CREATE TABLE IF NOT EXISTS candidate_documents (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  file_name            TEXT NOT NULL,
  file_size            INTEGER NOT NULL,
  file_type            TEXT NOT NULL,
  storage_path         TEXT NOT NULL,
  uploaded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── updated_at trigger ───────────────────────────────────────
CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;

-- Applications: Recruiters can view all, candidates can view their own
CREATE POLICY "Recruiters can view all applications"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

CREATE POLICY "Candidates can view own applications"
  ON applications FOR SELECT
  USING (candidate_id = auth.uid());

CREATE POLICY "Candidates can create applications"
  ON applications FOR INSERT
  WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "Candidates can update own applications"
  ON applications FOR UPDATE
  USING (candidate_id = auth.uid());

CREATE POLICY "Recruiters can update applications"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

-- Candidate Documents: Candidate owns them, Recruiters can view
CREATE POLICY "Candidates can manage own documents"
  ON candidate_documents FOR ALL
  USING (candidate_id = auth.uid())
  WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "Recruiters can view candidate documents"
  ON candidate_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

-- ── Performance Indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_documents_candidate_id ON candidate_documents(candidate_id);
