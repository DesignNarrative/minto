-- =========================================================================
-- Minto: AI Meeting MOM Generator — Database Schema Migration (001_initial.sql)
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- =========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Meeting',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'failed')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  language_detected TEXT DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by user and creation date
CREATE INDEX IF NOT EXISTS idx_meetings_user_created ON public.meetings(user_id, created_at DESC);

-- 2. Transcript Chunks Table
CREATE TABLE IF NOT EXISTS public.transcript_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  speaker TEXT,
  language TEXT,
  start_time REAL NOT NULL DEFAULT 0,
  end_time REAL NOT NULL DEFAULT 0,
  confidence REAL,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast retrieval of ordered chunks for a meeting
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_meeting_index ON public.transcript_chunks(meeting_id, chunk_index ASC);

-- 3. Minutes of Meeting (MOMs) Table
CREATE TABLE IF NOT EXISTS public.moms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  structured_data JSONB,
  model_used TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  audit_passed BOOLEAN DEFAULT true,
  audit_corrections TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookup by meeting
CREATE INDEX IF NOT EXISTS idx_moms_meeting_id ON public.moms(meeting_id);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each user can only see, update, and delete their own meetings/data
-- =========================================================================

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moms ENABLE ROW LEVEL SECURITY;

-- Meetings Policies: Users manage their own meetings
DROP POLICY IF EXISTS "Users can view own meetings" ON public.meetings;
CREATE POLICY "Users can view own meetings" ON public.meetings
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own meetings" ON public.meetings;
CREATE POLICY "Users can insert own meetings" ON public.meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own meetings" ON public.meetings;
CREATE POLICY "Users can update own meetings" ON public.meetings
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own meetings" ON public.meetings;
CREATE POLICY "Users can delete own meetings" ON public.meetings
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Transcript Chunks Policies: Bound through meeting ownership
DROP POLICY IF EXISTS "Users can view own transcript chunks" ON public.transcript_chunks;
CREATE POLICY "Users can view own transcript chunks" ON public.transcript_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = transcript_chunks.meeting_id
      AND (meetings.user_id = auth.uid() OR meetings.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can insert transcript chunks" ON public.transcript_chunks;
CREATE POLICY "Users can insert transcript chunks" ON public.transcript_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = transcript_chunks.meeting_id
      AND (meetings.user_id = auth.uid() OR meetings.user_id IS NULL)
    )
  );

-- MOMs Policies: Bound through meeting ownership
DROP POLICY IF EXISTS "Users can view own moms" ON public.moms;
CREATE POLICY "Users can view own moms" ON public.moms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = moms.meeting_id
      AND (meetings.user_id = auth.uid() OR meetings.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can insert own moms" ON public.moms;
CREATE POLICY "Users can insert own moms" ON public.moms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = moms.meeting_id
      AND (meetings.user_id = auth.uid() OR meetings.user_id IS NULL)
    )
  );
