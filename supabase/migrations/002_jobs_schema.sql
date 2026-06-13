-- ============================================================
-- TAO Recruit AI — Migration 002: Jobs & Departments
-- Run this AFTER migration 001 in your Supabase SQL editor
-- ============================================================

-- ── Employment Type & Experience Level enums ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type') THEN
    CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'internship');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experience_level') THEN
    CREATE TYPE experience_level AS ENUM ('entry', 'mid', 'senior', 'lead', 'executive');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM ('draft', 'published', 'archived', 'closed');
  END IF;
END$$;

-- ── Departments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default departments
INSERT INTO departments (name) VALUES
  ('Engineering'),
  ('Product'),
  ('Design'),
  ('Marketing'),
  ('Sales'),
  ('Operations'),
  ('Human Resources'),
  ('Finance'),
  ('Legal'),
  ('Customer Success')
ON CONFLICT (name) DO NOTHING;

-- ── Jobs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                TEXT NOT NULL,
  department_id        UUID REFERENCES departments(id),
  employment_type      employment_type NOT NULL DEFAULT 'full_time',
  experience_level     experience_level NOT NULL DEFAULT 'mid',
  location             TEXT,
  remote               BOOLEAN NOT NULL DEFAULT FALSE,
  salary_min           INTEGER,
  salary_max           INTEGER,
  description          TEXT NOT NULL DEFAULT '',
  responsibilities     TEXT NOT NULL DEFAULT '',
  requirements         TEXT NOT NULL DEFAULT '',
  skills_required      TEXT[] NOT NULL DEFAULT '{}',
  status               job_status NOT NULL DEFAULT 'draft',
  application_deadline DATE,
  created_by           UUID NOT NULL REFERENCES user_profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── updated_at trigger ───────────────────────────────────────
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Departments: anyone authenticated can read
CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Jobs: published jobs readable by all; full access for recruiters/admins
CREATE POLICY "Anyone can view published jobs"
  ON jobs FOR SELECT
  USING (status = 'published');

CREATE POLICY "Recruiters can view all jobs"
  ON jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

CREATE POLICY "Recruiters can create jobs"
  ON jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

CREATE POLICY "Recruiters can update their own jobs"
  ON jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

CREATE POLICY "Admins can delete jobs"
  ON jobs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── Performance Indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_department_id ON jobs(department_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(application_deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
