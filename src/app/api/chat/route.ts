import { NextResponse } from 'next/server';
import { callGeminiApi } from '@/lib/gemini';
import { ProjectFile } from '@/types';

// Simple search rate limiter (max 30 forced search queries per hour per IP/session)
const searchRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkSearchRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = searchRateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    searchRateLimitMap.set(key, { count: 1, resetAt: now + 3600 * 1000 });
    return true;
  }
  if (entry.count >= 30) {
    return false;
  }
  entry.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userPrompt, files, actionType, forceSearch } = body as {
      userPrompt: string;
      files: ProjectFile[];
      actionType?: 'summary' | 'memorial' | 'layout_analysis' | 'general';
      forceSearch?: boolean;
    };
    let { previousMessages } = body as { previousMessages?: { role: 'user' | 'assistant'; content: string }[] };

    if (!userPrompt && (!actionType || actionType === 'general')) {
      return NextResponse.json({ error: 'Prompt do usuário é obrigatório.' }, { status: 400 });
    }

    // Rate Limiting check if forceSearch is enabled
    if (forceSearch) {
      const clientKey = req.headers.get('x-forwarded-for') || 'default-session';
      if (!checkSearchRateLimit(clientKey)) {
        return NextResponse.json(
          { error: 'Limite de buscas na web por sessão atingido (máximo 30 pesquisas por hora). Tente novamente mais tarde.' },
          { status: 429 }
        );
      }
    }
    
    // Security: Input length validation to prevent DOS / token exhaustion
    if (userPrompt && userPrompt.length > 5000) {
      return NextResponse.json({ error: 'O texto excede o limite máximo de 5000 caracteres.' }, { status: 400 });
    }
    
    // Limit previous messages to reasonable amount
    if (previousMessages && previousMessages.length > 50) {
      previousMessages = previousMessages.slice(-50);
    }

    const aiResponse = await callGeminiApi({
      userPrompt: userPrompt || '',
      files: files || [],
      actionType: actionType || 'general',
      previousMessages: previousMessages || [],
      forceSearch: !!forceSearch,
    });

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha no processamento do chat.';
    console.error('Error in API /api/chat:', error);
    return NextResponse.json(
      { error: message }, 
      { status: 500 }
    );
  }
}
