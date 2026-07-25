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
 * Zero API keys are stored or exposed in the Next.js frontend codebase or local .env files.
 */
export async function callGeminiApi({
  userPrompt,
  files,
  actionType = 'general',
  previousMessages = [],
  forceSearch = false,
  forceThinking = false,
}: GenerateChatRequest): Promise<{ response: string; modelUsed: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
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
      },
    });

    if (error) {
      // Fallback message if Edge Function is not yet deployed on local environment
      throw new Error(error.message || 'Falha na comunicação com a Supabase Edge Function ai-chat.');
    }

    if (!data || !data.response) {
      throw new Error('Resposta vazia retornada pela Supabase Edge Function ai-chat.');
    }

    return {
      response: data.response,
      modelUsed: data.modelUsed || 'moonshotai.kimi-k2.5',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('Erro ao chamar a Supabase Edge Function ai-chat:', err);
    throw new Error(`O serviço de IA (Supabase Edge Function) está indisponível ou aguardando implantação das Secrets no Supabase (${message}). Por favor, tente novamente.`);
  }
}
