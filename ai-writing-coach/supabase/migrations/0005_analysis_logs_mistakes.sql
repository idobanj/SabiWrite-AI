-- ============================================================================
-- analysis_logs.mistakes — Phase 4 (Review Session support)
-- ============================================================================
-- Stores the per-mistake array that Gemini returned, so the History page's
-- "Review Session" button can fully re-render the past analysis (with
-- per-mistake explanations and tips) without re-calling Gemini.
--
-- Old rows (pre-migration) will have NULL here and Review Session will
-- gracefully fall back to "original vs corrected" only.
-- ============================================================================

alter table public.analysis_logs
  add column if not exists mistakes jsonb;
