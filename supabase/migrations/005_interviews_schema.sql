-- ============================================================
-- TAO Recruit AI — Migration 005: Interviews Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- ── Interviews ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interviews (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  job_id         UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(application_id) -- One interview per application
);

-- ── Interview Responses ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_responses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id  UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_responses ENABLE ROW LEVEL SECURITY;

-- Interviews policies
CREATE POLICY "Candidates can view own interviews"
  ON interviews FOR SELECT
  USING (candidate_id = auth.uid());

CREATE POLICY "Candidates can update own interviews"
  ON interviews FOR UPDATE
  USING (candidate_id = auth.uid());

CREATE POLICY "Recruiters can manage all interviews"
  ON interviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

-- Interview responses policies
CREATE POLICY "Candidates can view own interview responses"
  ON interview_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE id = interview_id AND candidate_id = auth.uid()
    )
  );

CREATE POLICY "Candidates can insert own interview responses"
  ON interview_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE id = interview_id AND candidate_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can view all interview responses"
  ON interview_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'recruiter')
    )
  );

-- ── Performance Indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interview_responses_interview_id ON interview_responses(interview_id);
