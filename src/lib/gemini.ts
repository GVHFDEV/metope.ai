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
export async function callGeminiApi(
  {
    userPrompt,
    files,
    actionType = 'general',
    previousMessages = [],
    forceSearch = false,
    forceThinking = false,
  }: GenerateChatRequest,
  onProgress?: (stage: string, message: string) => void
): Promise<{ response: string; modelUsed: string }> {
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

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let finalResponse = { response: '', modelUsed: '' };
      
      if (reader) {
        let buffer = '';
        let currentEvent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              currentEvent = '';
              continue;
            }

            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.substring(6).trim();
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.substring(5).trim();
              try {
                const dataJson = JSON.parse(dataStr);
                if (currentEvent === 'stage' && onProgress) {
                  onProgress(dataJson.stage, dataJson.message);
                } else if (currentEvent === 'chunk' && onProgress) {
                  onProgress('chunk', dataJson.text);
                } else if (currentEvent === 'done') {
                  finalResponse = dataJson;
                } else if (currentEvent === 'error') {
                  throw new Error(dataJson.error || 'Erro na Edge Function');
                }
              } catch (e) {
                if (e instanceof Error && !e.message.includes('JSON')) throw e;
              }
            }
          }
        }

        // Process any remaining text in buffer after stream completes
        if (buffer.trim()) {
          const lines = buffer.split(/\r?\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.substring(6).trim();
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.substring(5).trim();
              try {
                const dataJson = JSON.parse(dataStr);
                if (currentEvent === 'done') {
                  finalResponse = dataJson;
                } else if (currentEvent === 'error') {
                  throw new Error(dataJson.error || 'Erro na Edge Function');
                }
              } catch (e) {
                if (e instanceof Error && !e.message.includes('JSON')) throw e;
              }
            }
          }
        }
      }

      if (!finalResponse.response) {
        throw new Error('Resposta vazia retornada pela Supabase Edge Function ai-chat.');
      }

      return {
        response: finalResponse.response,
        modelUsed: finalResponse.modelUsed || 'moonshotai.kimi-k2-thinking',
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[callGeminiApi] Tentativa ${attempt} de ${maxAttempts} falhou:`, lastError.message);

      if (lastError.message.includes('Limite') || lastError.message.includes('excede')) {
        break;
      }
      if (attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
  }

  const message = lastError?.message || 'Erro desconhecido';
  console.error('Erro final ao chamar a Supabase Edge Function ai-chat:', message);
  throw new Error(`Falha no serviço de IA (${message}).`);
}
