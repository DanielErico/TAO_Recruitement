-- ============================================================
-- TAO Recruit AI — Migration 011: Fix cascade delete for candidate accounts
-- Run this in your Supabase SQL editor to allow deleting candidates
-- ============================================================

-- The applications.candidate_id FK was missing ON DELETE CASCADE.
-- This blocked Supabase from deleting auth.users records that had
-- any applications, even though all other tables were correctly set.

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_candidate_id_fkey;

ALTER TABLE applications
  ADD CONSTRAINT applications_candidate_id_fkey
  FOREIGN KEY (candidate_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;
