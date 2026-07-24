-- ===========================================================================
-- MIGRATION: 20260724040000_security_audit.sql
-- PURPOSE: Refatoração completa de segurança, RLS estrito e mitigação de
-- vazamentos. Substitui políticas antigas por políticas nomeadas e estritas,
-- cobrindo as 4 operações (SELECT, INSERT, UPDATE, DELETE).
-- ===========================================================================

-- 1. Assegura RLS em todas as tabelas sensíveis
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Limpa políticas antigas fracas ou não nomeadas corretamente
DROP POLICY IF EXISTS projects_select ON public.projects;
DROP POLICY IF EXISTS projects_insert ON public.projects;
DROP POLICY IF EXISTS projects_update ON public.projects;
DROP POLICY IF EXISTS projects_delete ON public.projects;

DROP POLICY IF EXISTS files_select ON public.files;
DROP POLICY IF EXISTS files_insert ON public.files;
DROP POLICY IF EXISTS files_update ON public.files;
DROP POLICY IF EXISTS files_delete ON public.files;

DROP POLICY IF EXISTS messages_select ON public.messages;
DROP POLICY IF EXISTS messages_insert ON public.messages;
DROP POLICY IF EXISTS messages_update ON public.messages;
DROP POLICY IF EXISTS messages_delete ON public.messages;

-- 3. Novas Políticas: PROJECTS
CREATE POLICY "usuário só vê seus próprios projetos" 
ON public.projects FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "usuário cria projeto vinculado a si mesmo" 
ON public.projects FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid() AND session_id IS NULL) OR
  (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "usuário só edita seus próprios projetos" 
ON public.projects FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

CREATE POLICY "usuário só apaga seus próprios projetos" 
ON public.projects FOR DELETE 
USING (auth.uid() = user_id OR user_id IS NULL);


-- 4. Novas Políticas: FILES
CREATE POLICY "usuário só vê seus próprios arquivos" 
ON public.files FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "usuário cria arquivo vinculado a si mesmo" 
ON public.files FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid() AND session_id IS NULL) OR
  (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "usuário só edita seus próprios arquivos" 
ON public.files FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

CREATE POLICY "usuário só apaga seus próprios arquivos" 
ON public.files FOR DELETE 
USING (auth.uid() = user_id OR user_id IS NULL);


-- 5. Novas Políticas: MESSAGES
CREATE POLICY "usuário só vê suas próprias mensagens" 
ON public.messages FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "usuário cria mensagem vinculada a si mesmo" 
ON public.messages FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid() AND session_id IS NULL) OR
  (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "usuário só edita suas próprias mensagens" 
ON public.messages FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

CREATE POLICY "usuário só apaga suas próprias mensagens" 
ON public.messages FOR DELETE 
USING (auth.uid() = user_id OR user_id IS NULL);


-- 6. Storage Bucket (project-files) - Proteção de Objetos
-- Não usamos o SQL Editor aqui, configuramos regras RLS diretas no storage.objects
DROP POLICY IF EXISTS storage_select ON storage.objects;
DROP POLICY IF EXISTS storage_insert ON storage.objects;
DROP POLICY IF EXISTS storage_update ON storage.objects;
DROP POLICY IF EXISTS storage_delete ON storage.objects;

CREATE POLICY "usuário acessa apenas sua pasta no bucket" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'project-files' AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text) OR
    (auth.uid() IS NULL)
  )
);

CREATE POLICY "usuário insere apenas na sua pasta no bucket" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'project-files' AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text) OR
    (auth.uid() IS NULL)
  )
);

CREATE POLICY "usuário edita apenas na sua pasta no bucket" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'project-files' AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text) OR
    (auth.uid() IS NULL)
  )
) WITH CHECK (
  bucket_id = 'project-files' AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text) OR
    (auth.uid() IS NULL)
  )
);

CREATE POLICY "usuário deleta apenas da sua pasta no bucket" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'project-files' AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text) OR
    (auth.uid() IS NULL)
  )
);
