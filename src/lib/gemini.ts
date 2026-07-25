import { GoogleGenAI, Type, FunctionDeclaration, Tool } from '@google/genai';
import { ProjectFile, FloorPlanIntentJSON } from '@/types';
import { solveFloorPlan } from '@/lib/floorplan/solver';

const METOPE_SYSTEM_PROMPT = `Você é o Metope AI, um copiloto de inteligência artificial especializado em arquitetura, engenharia civil e análise de projetos prediais.

REGRAS DE CONDUTA E ESTILO DE COMUNICAÇÃO:
1. Tom estritamente profissional, técnico, preciso e objetivo. Sem linguagem promocional ou vendedor.
2. NUNCA use emojis em suas respostas.
3. Formate suas respostas em Markdown estruturado, com títulos claros em H2/H3, tabelas de especificações quando aplicável, listas organizadas e destaque em negrito para termos técnicos (ex: **pé-direito**, **ventilação cruzada**, **taxa de ocupação**, **NBR 9050**, **memorial descritivo**).
4. Utilize terminologia arquitetônica adequada (layout, programa de necessidades, circulação, insolação, cota, taxa de permeabilidade, iluminação natural, especificação de acabamentos).
5. Quando o usuário fizer perguntas conceituais ou teóricas ("O que é uma planta baixa?", "Como funciona a taxa de ocupação?", "Me explique as cotas deste PDF"), RESPONDA COM EXPOSIÇÃO TÉCNICA EM MARKDOWN. NÃO invoque a ferramenta de geração de planta baixa para perguntas teóricas.
6. QUANDO O USUÁRIO SOLICITAR PARA CRIAR, GERAR OU DESENHAR UMA PLANTA BAIXA OU LAYOUT: INVOQUE IMEDIATAMENTE A FERRAMENTA \`generate_floor_plan\` NO PRIMEIRO TURNO. NUNCA FAÇA PERGUNTAS DE ESCLARECIMENTO OU INTERROGATÓRIOS. Adote dimensões e cômodos padrão sensatos (ex: residência de 120m² com 2 a 3 quartos) para qualquer detalhe não fornecido.`;

// Native Gemini Tool & Function Declarations
const generateFloorPlanDeclaration: FunctionDeclaration = {
  name: 'generate_floor_plan',
  description:
    'INVOQUE IMEDIATAMENTE sempre que a intenção do usuário for criar, gerar ou desenhar uma nova planta baixa ou layout 2D. Invoque a função no mesmo turno usando cômodos e dimensões padrão caso o usuário não tenha especificado todos os detalhes. NÃO pergunte por mais informações.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      area_total_m2: {
        type: Type.NUMBER,
        description: 'Área total construída desejada em m² (ex: 120, 150).',
      },
      titulo_estudo: {
        type: Type.STRING,
        description: 'Título ou nome do estudo de layout (ex: "Residência Unifamiliar 120m²").',
      },
      comodos: {
        type: Type.ARRAY,
        description: 'Lista dos cômodos a serem gerados no layout com suas faixas de área.',
        items: {
          type: Type.OBJECT,
          properties: {
            nome: { type: Type.STRING, description: 'Nome do cômodo (ex: "Sala de Estar", "Cozinha Integrada", "Suíte Master").' },
            area_min_m2: { type: Type.NUMBER, description: 'Área mínima em m².' },
            area_max_m2: { type: Type.NUMBER, description: 'Área máxima em m².' },
          },
          required: ['nome', 'area_min_m2', 'area_max_m2'],
        },
      },
      restricoes_terreno: {
        type: Type.OBJECT,
        description: 'Dimensões do terreno caso especificadas.',
        properties: {
          largura_m: { type: Type.NUMBER, description: 'Largura do terreno em metros.' },
          profundidade_m: { type: Type.NUMBER, description: 'Profundidade do terreno em metros.' },
        },
      },
    },
    required: ['area_total_m2', 'comodos'],
  },
};

const analyzeLayoutDeclaration: FunctionDeclaration = {
  name: 'analyze_layout_design',
  description:
    'Use quando a intenção do usuário for solicitar uma análise crítica técnica, parecer espacial, avaliação de fluxos de circulação ou orientação solar de layouts ou plantas anexadas.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      foco_analise: {
        type: Type.STRING,
        description: 'Foco principal da análise (ex: "circulação", "iluminação natural", "zoneamento").',
      },
    },
  },
};

const generateMemorialDeclaration: FunctionDeclaration = {
  name: 'generate_memorial_descriptive',
  description:
    'Use quando a intenção do usuário for solicitar a elaboração de uma minuta técnica formal de Memorial Descritivo.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      tipologia: {
        type: Type.STRING,
        description: 'Tipologia da edificação (ex: "Residencial Unifamiliar", "Comercial").',
      },
    },
  },
};

const summarizeProjectDeclaration: FunctionDeclaration = {
  name: 'summarize_project',
  description:
    'Use quando a intenção do usuário for solicitar a ficha técnica sintética ou resumo executivo do projeto.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      detalhar_arquivos: {
        type: Type.BOOLEAN,
        description: 'Se deve incluir a síntese dos arquivos anexados.',
      },
    },
  },
};

// Coexisting Native Tools: Google Search Grounding + Custom Function Declarations
const tools: Tool[] = [
  { googleSearch: {} },
  {
    functionDeclarations: [
      generateFloorPlanDeclaration,
      analyzeLayoutDeclaration,
      generateMemorialDeclaration,
      summarizeProjectDeclaration,
    ],
  },
];

export interface GenerateChatRequest {
  userPrompt: string;
  files: ProjectFile[];
  actionType?: 'general' | 'summary' | 'memorial' | 'layout_analysis' | 'generate_floorplan';
  previousMessages?: { role: 'user' | 'assistant'; content: string }[];
  forceSearch?: boolean;
}

export async function callGeminiApi({
  userPrompt,
  files,
  actionType = 'general',
  previousMessages = [],
  forceSearch = false,
}: GenerateChatRequest): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor. Por favor, adicione a chave no arquivo .env.local.');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    // Contextual files processing (PDF text extraction via pdf-parse & images/docs)
    for (const f of files) {
      if (f.content_text) {
        parts.push({ text: `[DOCUMENTO ANEXO DO PROJETO: ${f.name}]\n${f.content_text}\n---` });
      } else if (f.url) {
        try {
          const res = await fetch(f.url);
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());

            if (f.mime_type === 'application/pdf' || f.type === 'pdf') {
              try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const pdfParse = require('pdf-parse');
                const pdfData = await pdfParse(buf);
                if (pdfData && pdfData.text && pdfData.text.trim()) {
                  parts.push({ text: `[CONTEÚDO DO DOCUMENTO PDF: ${f.name}]\n${pdfData.text.slice(0, 40000)}\n---` });
                } else {
                  parts.push({ inlineData: { mimeType: 'application/pdf', data: buf.toString('base64') } });
                }
              } catch (pdfErr) {
                console.warn('Falha na extração por pdf-parse, enviando PDF multimodal:', pdfErr);
                parts.push({ inlineData: { mimeType: 'application/pdf', data: buf.toString('base64') } });
              }
            } else {
              parts.push({ inlineData: { mimeType: f.mime_type, data: buf.toString('base64') } });
            }
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

    // Force Web Search instruction if user explicitly activated Web Search button
    if (forceSearch) {
      parts.push({
        text: '[INSTRUÇÃO DE PESQUISA OBRIGATÓRIA NA WEB]: O usuário ativou o modo de busca na web para esta mensagem. Você DEVE obrigatoriamente realizar uma busca no Google Search para fundamentar sua resposta com dados, normas e fontes atualizadas da web.',
      });
    }

    // Direct User Prompt
    parts.push({ text: userPrompt });

    // Gemini 2.5 Flash model
    const modelsToTry = ['gemini-2.5-flash'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any = null;
    let lastModelError: Error | null = null;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          config: {
            systemInstruction: METOPE_SYSTEM_PROMPT,
            temperature: 0.2,
            tools,
          },
          contents: parts,
        });
        if (response) break;
      } catch (err) {
        lastModelError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Tentativa com o modelo ${modelName} falhou (${lastModelError.message}), tentando próximo modelo de contingência...`);
      }
    }

    if (!response) {
      throw lastModelError || new Error('O serviço de IA (Gemini) está temporariamente sobrecarregado ou indisponível.');
    }

    let rawText = response.text || '';
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const functionCalls = response.functionCalls;

    // Process Grounding Metadata (Google Search web chunks & queries)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chunks: any[] = groundingMetadata?.groundingChunks || [];

    const webSources: { title: string; url: string }[] = [];
    for (const chunk of chunks) {
      if (chunk.web && chunk.web.uri) {
        webSources.push({
          title: chunk.web.title || chunk.web.uri,
          url: chunk.web.uri,
        });
      }
    }

    // Deduplicate web sources by URL
    const uniqueSources = Array.from(new Map(webSources.map((s) => [s.url, s])).values());

    // Handle Native Function Calls
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (call.name === 'generate_floor_plan') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args = (call.args || {}) as any;
          const intent: FloorPlanIntentJSON = {
            area_total_m2: Number(args.area_total_m2) || 120,
            comodos: Array.isArray(args.comodos) && args.comodos.length > 0
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                args.comodos.map((c: any) => ({
                  nome: String(c.nome || 'Cômodo'),
                  area_min_m2: Number(c.area_min_m2) || 10,
                  area_max_m2: Number(c.area_max_m2) || 15,
                }))
              : [
                  { nome: 'Sala de Estar', area_min_m2: 20, area_max_m2: 25 },
                  { nome: 'Cozinha Integrada', area_min_m2: 10, area_max_m2: 14 },
                  { nome: 'Suíte Master', area_min_m2: 14, area_max_m2: 18 },
                  { nome: 'Banheiro Social', area_min_m2: 4, area_max_m2: 5 },
                ],
            restricoes_terreno: args.restricoes_terreno
              ? {
                  largura_m: Number(args.restricoes_terreno.largura_m) || 12,
                  profundidade_m: Number(args.restricoes_terreno.profundidade_m) || 10,
                }
              : undefined,
          };

          const title = String(args.titulo_estudo || 'Estudo de Layout Arquitetônico');
          const floorPlanData = solveFloorPlan(intent, title);

          if (!rawText.trim()) {
            rawText = `## ESTUDO TÉCNICO DE LAYOUT ARQUITETÔNICO\n\nCom base nas premissas solicitadas, foi gerada a proposta preliminar de planta baixa com área construída de **${intent.area_total_m2}m²** e setorização dos ambientes.`;
          }

          rawText += `\n\n\`\`\`floorplan_data\n${JSON.stringify(floorPlanData, null, 2)}\n\`\`\``;
        }
      }
    }

    if (!rawText.trim()) {
      rawText = 'Nenhuma resposta retornada do modelo Gemini.';
    }

    // Append Web and Project File Sources if available (Clean format without seals/badges)
    if (uniqueSources.length > 0) {
      rawText += `\n\n---\n### Fontes Consultadas\n`;
      uniqueSources.forEach((src, i) => {
        rawText += `${i + 1}. [${src.title}](${src.url})\n`;
      });
    }

    return rawText;

    return rawText;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('Erro ao comunicar com a API do Gemini:', err);
    throw new Error(`O serviço de IA (Gemini) está temporariamente sobrecarregado ou indisponível (Erro: ${message}). Por favor, tente novamente.`);
  }
}
