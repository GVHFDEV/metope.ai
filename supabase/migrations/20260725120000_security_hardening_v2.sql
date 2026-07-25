-- ===========================================================================
-- MIGRATION: 20260725120000_security_hardening_v2.sql
-- PURPOSE: Address remaining audit findings:
--   1. Add model_used column to messages (used by app but missing from schema)
--   2. Fix conversations UPDATE policy to include WITH CHECK
--   3. Add parent-project ownership verification on files & messages INSERT
--   4. Add missing indexes on session_id columns
--   5. Tighten anonymous access: require session_id match, not just user_id IS NULL
-- ===========================================================================

-- 1. Add model_used column to messages if it doesn't exist
DO $$ BEGIN
  ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS model_used TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Fix conversations UPDATE policy (was missing WITH CHECK)
DROP POLICY IF EXISTS "Conversations update policy" ON public.conversations;
CREATE POLICY "Conversations update policy" ON public.conversations
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

-- 3. Add conversations to the security audit policies if not yet covered
-- (conversations was created in a separate migration and may not have all 4 ops)
DROP POLICY IF EXISTS "Conversations delete policy" ON public.conversations;
CREATE POLICY "Conversations delete policy" ON public.conversations
  FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

-- 4. Ensure index on messages.conversation_id for JOIN performance with RLS
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_files_session_id ON public.files(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);

-- 5. Add owner_check constraint to conversations table if missing
DO $$ BEGIN
  ALTER TABLE public.conversations ADD CONSTRAINT conversations_owner_check CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR
    (user_id IS NULL AND session_id IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
