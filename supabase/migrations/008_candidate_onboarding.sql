-- ============================================================
-- TAO Recruit AI — Migration 008: Candidate Onboarding Details
-- Run this in your Supabase SQL editor AFTER migration 007.
-- ============================================================

-- ── 1. Add CV/Resume fields to candidate_profiles ────────────
ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS resume_name TEXT;

-- ── 2. Add INSERT policy for candidate_profiles ──────────────
-- Permits authenticated candidates to insert their own profile
CREATE POLICY "Candidates can insert own profile"
  ON candidate_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
