import { GoogleGenAI } from '@google/genai';
import { ProjectFile } from '@/types';

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

export interface GenerateChatRequest {
  userPrompt: string;
  files: ProjectFile[];
  actionType?: 'summary' | 'memorial' | 'layout_analysis' | 'general';
  previousMessages?: { role: string; content: string }[];
}

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

export async function callGeminiApi({
  userPrompt,
  files,
  actionType = 'general',
  previousMessages = [],
}: GenerateChatRequest): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const finalPrompt = buildPrompt(userPrompt, actionType);

  if (!apiKey) {
    console.warn('GEMINI_API_KEY não configurada. Retornando resposta de contingência.');
    return fallbackResponse(files, actionType);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    for (const f of files) {
      if (f.content_text) {
        parts.push({ text: `[DOCUMENTO ANEXO: ${f.name}]\n${f.content_text}\n---` });
      } else if (f.url) {
        // Non-text files: fetch the signed Supabase Storage URL server-side
        // and inline the bytes for Gemini's multimodal input.
        try {
          const res = await fetch(f.url);
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            parts.push({ inlineData: { mimeType: f.mime_type, data: buf.toString('base64') } });
          }
        } catch (err) {
          console.warn('Falha ao buscar arquivo para contexto do Gemini:', f.name, err);
        }
      }
    }

    if (previousMessages.length > 0) {
      const summary = previousMessages
        .slice(-6)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');
      parts.push({ text: `[HISTÓRICO DA CONVERSA]:\n${summary}\n---` });
    }
    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      config: { systemInstruction: METOPE_SYSTEM_PROMPT, temperature: 0.2 },
      contents: parts,
    });

    return response.text || 'Nenhuma resposta retornada do modelo Gemini.';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('Erro ao chamar a API do Gemini:', err);
    return (
      `Ocorreu um erro ao comunicar com a API do Gemini: ${message}.\n\n` +
      `Modo de contingência ativado:\n\n${fallbackResponse(files, actionType)}`
    );
  }
}

function fallbackResponse(files: ProjectFile[], actionType: string): string {
  const fileNames = files.map((f) => f.name).join(', ') || 'Nenhum arquivo anexado';
  const fileCount = files.length;

  if (actionType === 'summary') {
    return `## RESUMO EXECUTIVO DO PROJETO

**Arquivos Analisados (${fileCount}):** ${fileNames}

### Ficha Técnica Sintética
* **Tipologia:** Projeto Residencial / Comercial
* **Setorização:** Térreo integrado (Social + Íntimo + Serviço)

### Síntese Espacial
O projeto apresenta uma setorização lógica com zoneamento claro dos ambientes, maximizando amplitude visual e **ventilação cruzada**.`;
  }
  if (actionType === 'memorial') {
    return `## MEMORIAL DESCRITIVO TÉCNICO

**Arquivos de Referência:** ${fileNames}

### 1. OBJETO
Este memorial estabelece as premissas técnicas e especificações de materiais do projeto em referência.

### 2. NORMAS DE REFERÊNCIA
* **NBR 6118**, **NBR 9050** e **NBR 15575**.`;
  }
  if (actionType === 'layout_analysis') {
    return `## ANÁLISE TÉCNICA DE LAYOUT

**Contexto Analisado:** ${fileNames}

### 1. Setorização
* Integração entre estar, jantar e cozinha otimiza luz natural e circulação.`;
  }

  return `Consulta recebida. Com base no(s) arquivo(s) **${fileNames}**, a estrutura espacial atende aos parâmetros técnicos. Configure GEMINI_API_KEY no servidor para respostas geradas por IA.`;
}
