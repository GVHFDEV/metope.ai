import { NextResponse } from 'next/server';
import { callGeminiApi } from '@/lib/gemini';
import { ProjectFile } from '@/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userPrompt, files, actionType } = body as {
      userPrompt: string;
      files: ProjectFile[];
      actionType?: 'summary' | 'memorial' | 'layout_analysis' | 'general';
    };
    let { previousMessages } = body as { previousMessages?: { role: 'user' | 'assistant'; content: string }[] };

    if (!userPrompt && (!actionType || actionType === 'general')) {
      return NextResponse.json({ error: 'Prompt do usuário é obrigatório.' }, { status: 400 });
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
    });

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in API /api/chat:', error);
    // Security: Sanitized error response - no internal stack trace or detail leak
    return NextResponse.json(
      { error: 'Falha no processamento do chat. Verifique os logs internos.' }, 
      { status: 500 }
    );
  }
}
