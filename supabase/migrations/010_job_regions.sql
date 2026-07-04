-- ============================================================
-- TAO Recruit AI — Migration 010: Job Regions (Nigeria)
-- Run this in your Supabase SQL editor
-- ============================================================

-- Drop the old flat TEXT[] column if it exists, then add a
-- structured JSONB[] column to store {state, lga} pairs.
ALTER TABLE jobs DROP COLUMN IF EXISTS regions;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS regions JSONB[] NOT NULL DEFAULT '{}';

-- GIN index for efficient filtering by region
CREATE INDEX IF NOT EXISTS idx_jobs_regions ON jobs USING gin(regions);
