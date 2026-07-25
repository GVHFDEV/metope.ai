import { supabase } from '@/lib/supabase';
import { ProjectFile } from '@/types';

export interface GenerateChatRequest {
  userPrompt: string;
  files: ProjectFile[];
  actionType?: 'general' | 'summary' | 'memorial' | 'layout_analysis' | 'generate_floorplan';
  previousMessages?: { role: 'user' | 'assistant'; content: string }[];
  forceSearch?: boolean;
  forceThinking?: boolean;
}

/**
  * Invokes the secure Supabase Edge Function ('ai-chat') which holds all AI API keys
  * (Gemini, AWS Bedrock Mantle, Grok/GLM-5/Kimi) as encrypted Secrets.
  * Includes automatic retry and detailed error parsing from Supabase FunctionsHttpError context.
  */
export async function callGeminiApi({
  userPrompt,
  files,
  actionType = 'general',
  previousMessages = [],
  forceSearch = false,
  forceThinking = false,
}: GenerateChatRequest): Promise<{ response: string; modelUsed: string }> {
  const payload = {
    userPrompt,
    files: files.map((f) => ({
      name: f.name,
      content_text: f.content_text,
      mime_type: f.mime_type,
      type: f.type,
      url: f.url,
    })),
    actionType,
    previousMessages: previousMessages.map((m) => ({ role: m.role, content: m.content })),
    forceSearch: !!forceSearch,
    forceThinking: !!forceThinking,
  };

  let lastError: Error | null = null;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: payload,
      });

      if (error) {
        let serverMessage = error.message;

        // Try to extract exact JSON error body returned by the Edge Function
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errContext = (error as any).context;
        if (errContext && typeof errContext.json === 'function') {
          try {
            const errJson = await errContext.json();
            if (errJson && errJson.error) {
              serverMessage = errJson.error;
            }
          } catch (_e) {
            // ignore JSON parse failure
          }
        }

        throw new Error(serverMessage || 'Falha na comunicação com a Supabase Edge Function ai-chat.');
      }

      if (!data || !data.response) {
        throw new Error('Resposta vazia retornada pela Supabase Edge Function ai-chat.');
      }

      return {
        response: data.response,
        modelUsed: data.modelUsed || 'moonshotai.kimi-k2-thinking',
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[callGeminiApi] Tentativa ${attempt} de ${maxAttempts} falhou:`, lastError.message);

      // If it's a rate limit or prompt size error, don't retry, fail immediately
      if (lastError.message.includes('Limite') || lastError.message.includes('excede')) {
        break;
      }

      if (attempt < maxAttempts) {
        // Wait 1 second before retrying
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
  }

  const message = lastError?.message || 'Erro desconhecido';
  console.error('Erro final ao chamar a Supabase Edge Function ai-chat:', message);
  throw new Error(`Falha no serviço de IA (${message}). Certifique-se de implantar a Edge Function com '--no-verify-jwt' e cadastrar as Secrets no Supabase Dashboard.`);
}
