-- ============================================================
-- TAO Recruit AI — Migration 009: Extended Candidate Profile
-- Run this in your Supabase SQL editor AFTER migration 008.
-- ============================================================

-- ── 1. Add bio and skills fields to candidate_profiles ───────
ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- ── 2. Add UPDATE policy for candidate_profiles (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'candidate_profiles'
      AND policyname = 'Candidates can update own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Candidates can update own profile"
        ON candidate_profiles FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;
END $$;

-- ── 3. Add SELECT policy so recruiters can view all profiles ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'candidate_profiles'
      AND policyname = 'Recruiters can view all candidate profiles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Recruiters can view all candidate profiles"
        ON candidate_profiles FOR SELECT
        USING (true)
    $policy$;
  END IF;
END $$;
