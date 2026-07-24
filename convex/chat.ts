'use node';

import { GoogleGenAI } from '@google/genai';
import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';

// Normalized message shape returned to the client. Declared explicitly so the
// action's return type does not need to be inferred through `ctx.runMutation`
// (which would create a circular reference via the generated `api`).
type ChatMessageResult = {
  id: string;
  role: string;
  content: string;
  action_type: string;
  created_at: string;
};

type ChatTurnResult = {
  userMessage: ChatMessageResult;
  assistantMessage: ChatMessageResult;
};

const METOPE_SYSTEM_PROMPT = `Você é o Metope AI, um copiloto de inteligência artificial especializado em arquitetura, engenharia civil e análise de projetos prediais.

REGRAS DE CONDUTA E ESTILO DE COMUNICAÇÃO:
1. Tom estritamente profissional, técnico, preciso e objetivo. Sem linguagem promocional ou vendedor.
2. NUNCA use emojis em suas respostas.
3. Formate suas respostas em Markdown estruturado, com títulos claros em H2/H3, tabelas de especificações quando aplicável, listas organizadas e destaque em negrito para termos técnicos (ex: **pé-direito**, **ventilação cruzada**, **taxa de ocupação**, **NBR 9050**, **memorial descritivo**).
4. Utilize terminologia arquitetônica adequada (layout, programa de necessidades, circulação, insolação, cota, taxa de permeabilidade, iluminação natural, especificação de acabamentos).
5. Quando analisar plantas baixas ou documentos técnicos fornecidos no contexto:
   - Identifique a distribuição dos ambientes e dimensionamento relativo.
   - Avalie fluxos de circulação e privacidade dos setores (social, íntimo, serviço).
   - Identifique conformidade com orientações solares e normas de acessibilidade quando aplicável.
6. Se a solicitação for para "Gerar memorial descritivo", produza um documento técnico formal completo com Seções: 1. Objeto, 2. Normas de Referência, 3. Estrutura e Alvenarias, 4. Revestimentos e Acabamentos, 5. Esquadrias e Vidros, 6. Instalações Prediais.
7. Se a solicitação for para "Analisar layout", forneça uma avaliação sistemática: Pontos Fortes do Layout, Oportunidades de Otimização e Sugestões de Ajustes de Circulação e Iluminação.
8. Se a solicitação for para "Resumir projeto", apresente a Ficha Técnica Sintética do Projeto (Nome, Área, Programa, Destaques Técnicos).`;

function buildPrompt(userPrompt: string, actionType: string): string {
  if (actionType === 'summary') {
    return `SOLICITAÇÃO DE ATALHO RÁPIDO: RESUMIR PROJETO.
Com base nos arquivos e plantas anexados a este projeto, elabore um resumo executivo arquitetônico completo e estruturado contendo:
- Ficha técnica do projeto (área, programa de necessidades, setores)
- Síntese dos documentos e plantas fornecidos
- Características estruturais e espaciais identificadas.`;
  }
  if (actionType === 'memorial') {
    return `SOLICITAÇÃO DE ATALHO RÁPIDO: GERAR MEMORIAL DESCRITIVO.
Com base nas especificações, programa de necessidades e plantas deste projeto, gere uma minuta técnica formal de Memorial Descritivo com as seguintes seções estruturadas:
1. Objeto e Localização
2. Normas Técnicas APLICÁVEIS
3. Sistemas Construtivos e Alvenarias
4. Acabamentos e Revestimentos (Pisos, Paredes e Tetos)
5. Esquadrias, Vidros e Cobertura
6. Considerações de Instalações e Sustentabilidade.`;
  }
  if (actionType === 'layout_analysis') {
    return `SOLICITAÇÃO DE ATALHO RÁPIDO: ANALISAR LAYOUT.
Com base nas plantas técnicas e documentos anexados ao projeto, faça uma análise crítica detalhada do layout arquitetônico abordando:
- Organização espacial e setorização (Área Social, Íntima e de Serviço)
- Eficiência dos fluxos de circulação e ergonomia dos ambientes
- Iluminação natural, ventilação cruzada e orientação solar
- Pontos fortes do layout atual e 3 sugestões técnicas de otimização.`;
  }
  return userPrompt;
}

/**
 * Chat entry point. Runs entirely on the Convex backend:
 *  1. beginChat (mutation): auth check + rate limit + persist user message
 *  2. read file bytes from Convex storage + call Gemini (key from server env)
 *  3. finishChat (mutation): persist the assistant reply
 */
export const send = action({
  args: {
    sessionId: v.string(),
    projectId: v.id('projects'),
    userPrompt: v.string(),
    actionType: v.string(),
  },
  handler: async (ctx, args): Promise<ChatTurnResult> => {
    const context = await ctx.runMutation(internal.messages.beginChat, {
      sessionId: args.sessionId,
      projectId: args.projectId,
      userPrompt: args.userPrompt,
      actionType: args.actionType,
    });

    const finalPrompt = buildPrompt(context.userMessage.content, context.actionType);
    const apiKey = process.env.GEMINI_API_KEY;

    let aiText: string;
    if (!apiKey) {
      aiText = fallbackResponse(context.files, context.actionType);
    } else {
      try {
        // Build multimodal parts: inline file bytes fetched from Convex storage.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = [];
        for (const file of context.files) {
          const blob = await ctx.storage.get(file.storageId);
          if (blob && file.mimeType && file.mimeType !== 'text/plain' && file.mimeType !== 'text/markdown' && file.mimeType !== 'application/json') {
            const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
            parts.push({ inlineData: { mimeType: file.mimeType, data: base64 } });
          } else if (file.contentText) {
            parts.push({ text: `[DOCUMENTO ANEXO: ${file.name}]\n${file.contentText}\n---` });
          }
        }

        if (context.history.length > 0) {
          const summary = context.history
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n\n');
          parts.push({ text: `[HISTÓRICO DA CONVERSA]:\n${summary}\n---` });
        }
        parts.push({ text: finalPrompt });

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          config: { systemInstruction: METOPE_SYSTEM_PROMPT, temperature: 0.2 },
          contents: parts,
        });
        aiText = response.text || 'Nenhuma resposta retornada do modelo Gemini.';
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        aiText =
          `Ocorreu um erro ao comunicar com a API do Gemini: ${message}.\n\n` +
          `Modo de contingência ativado:\n\n` +
          fallbackResponse(context.files, context.actionType);
      }
    }

    const assistantMessage = await ctx.runMutation(internal.messages.finishChat, {
      sessionId: args.sessionId,
      projectId: args.projectId,
      content: aiText,
      actionType: context.actionType,
    });

    return { userMessage: context.userMessage, assistantMessage };
  },
});

// Deterministic technical response used when GEMINI_API_KEY is not configured.
function fallbackResponse(
  files: { name: string }[],
  actionType: string,
): string {
  const fileNames = files.map((f) => f.name).join(', ') || 'Nenhum arquivo anexado';
  const fileCount = files.length;

  if (actionType === 'summary') {
    return `## RESUMO EXECUTIVO DO PROJETO

**Arquivos Analisados (${fileCount}):** ${fileNames}

### Ficha Técnica Sintética
* **Tipologia:** Projeto Residencial / Comercial
* **Setorização:** Térreo integrado (Social + Íntimo + Serviço)

### Síntese Espacial
O projeto apresenta uma setorização lógica com zoneamento claro dos ambientes. A área social é tratada como um grande espaço fluido integrado, maximizando amplitude visual e **ventilação cruzada**.`;
  }
  if (actionType === 'memorial') {
    return `## MEMORIAL DESCRITIVO TÉCNICO

**Arquivos de Referência:** ${fileNames}

### 1. OBJETO
Este memorial estabelece as premissas técnicas e especificações de materiais do projeto em referência.

### 2. NORMAS DE REFERÊNCIA
* **NBR 6118**, **NBR 9050** e **NBR 15575**.

### 3. SISTEMA CONSTRUTIVO
* **Alvenarias de Vedação:** bloco cerâmico com junta amarrada; **pé-direito** mínimo de 2,80m nas áreas sociais.`;
  }
  if (actionType === 'layout_analysis') {
    return `## ANÁLISE TÉCNICA DE LAYOUT

**Contexto Analisado:** ${fileNames}

### 1. Setorização
* Integração entre estar, jantar e cozinha otimiza luz natural e circulação.

### 2. Recomendações
1. Ampliar o espaço livre entre ilha e bancada para no mínimo 1,20m.
2. Prever **ventilação cruzada** nos eixos opostos.`;
  }

  return `Consulta recebida. Com base no(s) arquivo(s) **${fileNames}**, a estrutura espacial atende aos parâmetros técnicos. Configure a variável GEMINI_API_KEY no ambiente do Convex para respostas geradas por IA.`;
}
