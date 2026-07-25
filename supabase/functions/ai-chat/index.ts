// Supabase Edge Function: ai-chat
// Handles Multi-Step Agentic Model Routing ("Conversa entre Modelos"),
// Perception Extraction with Google Gemini 3.5 Flash Lite for PDFs/Images/Web Search,
// Synthesis & Architectural Thinking with Kimi K2.5 / GLM-5,
// Advanced Thinking Mode Toggle, Tool Calling for Floor Plan Generation, Input/Output Validation, and Auth Checks.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const METOPE_SYSTEM_PROMPT = `Você é o Metope AI, um copiloto de inteligência artificial especializado em arquitetura, engenharia civil e análise de projetos prediais.

REGRAS DE CONDUTA E ESTILO DE COMUNICAÇÃO:
1. Tom estritamente profissional, técnico, preciso e objetivo. Sem linguagem promocional ou vendedor.
2. NUNCA use emojis em suas respostas.
3. Formate suas respostas em Markdown estruturado, com títulos claros em H2/H3, tabelas de especificações quando aplicável, listas organizadas e destaque em negrito para termos técnicos (ex: **pé-direito**, **ventilação cruzada**, **taxa de ocupação**, **NBR 9050**, **memorial descritivo**).
4. Utilize terminologia arquitetônica adequada (layout, programa de necessidades, circulação, insolação, cota, taxa de permeabilidade, iluminação natural, especificação de acabamentos).
5. Quando o usuário fizer perguntas conceituais ou teóricas ("O que é uma planta baixa?", "Como funciona a taxa de ocupação?", "Me explique as cotas deste PDF"), RESPONDA COM EXPOSIÇÃO TÉCNICA EM MARKDOWN. NÃO invoque a ferramenta de geração de planta baixa para perguntas teóricas.
6. QUANDO O USUÁRIO SOLICITAR PARA CRIAR, GERAR OU DESENHAR UMA PLANTA BAIXA OU LAYOUT: INVOQUE IMEDIATAMENTE A FERRAMENTA \`generate_floor_plan\` NO PRIMEIRO TURNO. NUNCA FAÇA PERGUNTAS DE ESCLARECIMENTO OU INTERROGATÓRIOS. Adote dimensões e cômodos padrão sensatos (ex: residência de 120m² com 2 a 3 quartos) para qualquer detalhe não fornecido.`;

// OpenAPI/OpenAI-compatible Tool Specifications
const openAiTools = [
  {
    type: 'function',
    function: {
      name: 'generate_floor_plan',
      description:
        'INVOQUE IMEDIATAMENTE sempre que a intenção do usuário for criar, gerar ou desenhar uma nova planta baixa ou layout 2D. Invoque no mesmo turno com cômodos e dimensões padrão.',
      parameters: {
        type: 'object',
        properties: {
          area_total_m2: { type: 'number', description: 'Área total construída em m²' },
          titulo_estudo: { type: 'string', description: 'Título do estudo de layout' },
          comodos: {
            type: 'array',
            description: 'Lista de cômodos',
            items: {
              type: 'object',
              properties: {
                nome: { type: 'string' },
                area_min_m2: { type: 'number' },
                area_max_m2: { type: 'number' },
              },
              required: ['nome', 'area_min_m2', 'area_max_m2'],
            },
          },
          restricoes_terreno: {
            type: 'object',
            properties: {
              largura_m: { type: 'number' },
              profundidade_m: { type: 'number' },
            },
          },
        },
        required: ['area_total_m2', 'comodos'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_layout_design',
      description: 'Análise técnica crítica de layout, circulação e orientação solar.',
      parameters: {
        type: 'object',
        properties: {
          foco_analise: { type: 'string', description: 'Foco da análise' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_memorial_descriptive',
      description: 'Minuta técnica formal de memorial descritivo.',
      parameters: {
        type: 'object',
        properties: {
          tipologia: { type: 'string', description: 'Tipologia do projeto' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarize_project',
      description: 'Resumo executivo do projeto.',
      parameters: {
        type: 'object',
        properties: {
          detalhar_arquivos: { type: 'boolean', description: 'Detalhar arquivos anexados' },
        },
      },
    },
  },
];

// Deterministic Floorplan Geometric Solver inside Edge Function
function solveFloorPlanEdge(intent: {
  area_total_m2: number;
  comodos: { nome: string; area_min_m2: number; area_max_m2: number }[];
  restricoes_terreno?: { largura_m: number; profundidade_m: number };
}, title: string) {
  const areaTarget = intent.area_total_m2 || 120;
  const aspect = 1.33;
  const buildingWidth = Math.sqrt(areaTarget * aspect);
  const buildingDepth = areaTarget / buildingWidth;

  const comodos = intent.comodos && intent.comodos.length > 0 ? intent.comodos : [
    { nome: 'Sala de Estar', area_min_m2: 20, area_max_m2: 25 },
    { nome: 'Cozinha Integrada', area_min_m2: 10, area_max_m2: 14 },
    { nome: 'Suíte Master', area_min_m2: 14, area_max_m2: 18 },
    { nome: 'Banheiro Social', area_min_m2: 4, area_max_m2: 5 },
  ];

  const totalMin = comodos.reduce((sum, c) => sum + (c.area_min_m2 || 10), 0);
  let currentX = 0;
  let currentY = 0;
  let maxRowHeight = 0;

  const roomsData = comodos.map((c, idx) => {
    const minArea = c.area_min_m2 || 10;
    const targetArea = (minArea / (totalMin || 1)) * areaTarget;
    const side = Math.sqrt(targetArea);

    if (currentX + side > buildingWidth && idx > 0) {
      currentX = 0;
      currentY += maxRowHeight;
      maxRowHeight = 0;
    }

    const room = {
      id: `room_${idx}_${Date.now()}`,
      name: c.nome,
      type: c.nome.toLowerCase().includes('banheiro') ? 'wet' : c.nome.toLowerCase().includes('quarto') || c.nome.toLowerCase().includes('suíte') ? 'private' : 'social',
      x: Math.round(currentX * 10) / 10,
      y: Math.round(currentY * 10) / 10,
      width: Math.round(side * 10) / 10,
      height: Math.round(side * 10) / 10,
      area_m2: Math.round(side * side * 10) / 10,
    };

    currentX += side;
    if (side > maxRowHeight) maxRowHeight = side;
    return room;
  });

  return {
    metadata: {
      titulo: title,
      area_total_m2: areaTarget,
      data_geracao: new Date().toISOString(),
      versao_algoritmo: '2.0.0-edge',
    },
    terreno: {
      largura_m: intent.restricoes_terreno?.largura_m || Math.ceil(buildingWidth + 4),
      profundidade_m: intent.restricoes_terreno?.profundidade_m || Math.ceil(buildingDepth + 6),
      recuo_frontal_m: 5,
      recuo_posterior_m: 3,
      recuo_lateral_m: 1.5,
    },
    edificacao: {
      largura_m: Math.round(buildingWidth * 10) / 10,
      profundidade_m: Math.round(buildingDepth * 10) / 10,
      comodos: roomsData,
    },
  };
}

// Strict Input Parameter Validation
function validateToolInput(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any
): { isValid: boolean; sanitizedInput: any; error?: string } {
  if (!input || typeof input !== 'object') {
    return { isValid: false, sanitizedInput: {}, error: 'Parâmetros de entrada inválidos ou ausentes.' };
  }

  if (toolName === 'generate_floor_plan') {
    const area_total_m2 = typeof input.area_total_m2 === 'number' && input.area_total_m2 > 0 ? input.area_total_m2 : 120;
    const titulo_estudo = typeof input.titulo_estudo === 'string' && input.titulo_estudo.trim() ? input.titulo_estudo.trim() : 'Estudo de Layout Arquitetônico';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let comodos: any[] = [];
    if (Array.isArray(input.comodos)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      comodos = input.comodos
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => c && typeof c === 'object')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => ({
          nome: typeof c.nome === 'string' && c.nome.trim() ? c.nome.trim() : 'Cômodo',
          area_min_m2: typeof c.area_min_m2 === 'number' && c.area_min_m2 > 0 ? c.area_min_m2 : 10,
          area_max_m2: typeof c.area_max_m2 === 'number' && c.area_max_m2 > 0 ? c.area_max_m2 : 15,
        }));
    }

    if (comodos.length === 0) {
      comodos = [
        { nome: 'Sala de Estar', area_min_m2: 20, area_max_m2: 25 },
        { nome: 'Cozinha Integrada', area_min_m2: 10, area_max_m2: 14 },
        { nome: 'Suíte Master', area_min_m2: 14, area_max_m2: 18 },
        { nome: 'Banheiro Social', area_min_m2: 4, area_max_m2: 5 },
      ];
    }

    let restricoes_terreno;
    if (input.restricoes_terreno && typeof input.restricoes_terreno === 'object') {
      restricoes_terreno = {
        largura_m: typeof input.restricoes_terreno.largura_m === 'number' && input.restricoes_terreno.largura_m > 0 ? input.restricoes_terreno.largura_m : 12,
        profundidade_m: typeof input.restricoes_terreno.profundidade_m === 'number' && input.restricoes_terreno.profundidade_m > 0 ? input.restricoes_terreno.profundidade_m : 10,
      };
    }

    return {
      isValid: true,
      sanitizedInput: { area_total_m2, titulo_estudo, comodos, restricoes_terreno },
    };
  }

  return { isValid: true, sanitizedInput: input };
}

// Strict Output Response Validation
function validateOutputResponse(text: string): string {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('A resposta gerada pela IA está vazia ou malformada.');
  }

  const trimmed = text.trim();
  if (trimmed.length < 5) {
    throw new Error('A resposta gerada não atinge os critérios mínimos de integridade.');
  }

  return trimmed;
}

interface AgentPlanJSON {
  requires_perception_gemini: boolean;
  requires_web_search: boolean;
  requires_complex_synthesis_kimi: boolean;
  reason: string;
}

// Contextual Intent Analyzer & Execution Planner Agent
function planExecutionGraph({
  userPrompt,
  forceSearch,
  forceThinking,
}: {
  userPrompt: string;
  actionType?: string;
  forceSearch?: boolean;
  forceThinking?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files?: any[];
}): AgentPlanJSON {
  const needsWebSearch = !!forceSearch || /pesquisar|buscar na web|notícias|norma|legislação|hoje|atualizado/i.test(userPrompt);

  // CONTEXTUAL INTENT CHECK: Does the prompt text explicitly ask to read/analyze a document/image or mention indexed files (@file, .pdf, .png)?
  const asksToAnalyzeDocument =
    /\[FOCO DE ANÁLISE PRIORITÁRIO/i.test(userPrompt) ||
    /@\S+/i.test(userPrompt) ||
    /\.(pdf|png|jpe?g|webp|dwg|dxf)/i.test(userPrompt) ||
    /analis(e|ar)|leia|leitura|no arquivo|neste documento|na imagem|na planta|no pdf|proprietário|titular|engenheiro|quadro de áreas|carimbo/i.test(userPrompt);

  const requiresGemini = needsWebSearch || asksToAnalyzeDocument;

  return {
    requires_perception_gemini: requiresGemini,
    requires_web_search: needsWebSearch,
    requires_complex_synthesis_kimi: true,
    reason: requiresGemini
      ? 'Agente Perceptivo Gemini Flash Lite (Análise de PDF/Imagem/Web) + Síntese Kimi K2.5'
      : forceThinking
      ? 'Modo de Pensamento Avançado Ativado (Raciocínio Profundo Kimi K2.5)'
      : 'Chat Geral Técnico (Kimi K2.5 Thinking Model)',
  };
}

serve(async (req: Request) => {
  // Handle CORS Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth & Session check
    const authHeader = req.headers.get('Authorization');
    const apikey = req.headers.get('apikey');

    if (!authHeader && !apikey) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Token de autenticação ou chave API ausente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { userPrompt, files = [], actionType = 'general', previousMessages = [], forceSearch = false, forceThinking = false } = body;

    if (!userPrompt && actionType === 'general') {
      return new Response(
        JSON.stringify({ error: 'O prompt do usuário é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Agent Planner Decision Graph (Contextual Intent Analysis)
    const plan = planExecutionGraph({
      userPrompt: userPrompt || '',
      actionType,
      forceSearch: !!forceSearch,
      forceThinking: !!forceThinking,
      files,
    });

    console.log(`[AI Agent Orchestrator Plan]:`, JSON.stringify(plan, null, 2));

    let geminiPerceptionOutput = '';
    const webSources: { title: string; url: string }[] = [];
    const modelsUsedList: string[] = [];

    // STAGE 1: Gemini Perception Agent (Visual PDF/Image OCR, Binary Base64 Data & Web Grounding)
    if (plan.requires_perception_gemini) {
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('OPENAI_API_KEY') || '';
      if (geminiApiKey) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geminiParts: any[] = [];
        let geminiPrompt = `[INSTRUÇÃO DO ORQUESTRADOR DE PERCEPÇÃO]: Você é o agente visual e leitor de documentos do Metope AI. Analise o documento/imagem em anexo ou faça a busca web se solicitado. Transcreva e extraia TODOS os fatos e nomes visíveis: Nome do proprietário, autor do projeto, engenheiro(a), área total, cotas e recuos.\n\n`;

        for (const f of files) {
          if (f.content_text) {
            geminiParts.push({ text: `[DOCUMENTO/TEXTO ANEXO: ${f.name}]\n${f.content_text}\n---\n` });
          }
          if (f.url) {
            try {
              const fileRes = await fetch(f.url);
              if (fileRes.ok) {
                const arrayBuf = await fileRes.arrayBuffer();
                const uint8 = new Uint8Array(arrayBuf);
                
                // Fast chunked base64 conversion to prevent call stack overflow / timeouts
                let binaryStr = '';
                const chunkSize = 8192;
                for (let i = 0; i < uint8.length; i += chunkSize) {
                  binaryStr += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + chunkSize)));
                }
                const base64Data = btoa(binaryStr);
                const mimeType = f.mime_type || (String(f.name).toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png');

                geminiParts.push({
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  },
                });
                geminiPrompt += `[ARQUIVO MULTIMODAL INCLUÍDO EM BASE64: ${f.name} (${mimeType})]\n`;
              }
            } catch (fetchErr) {
              console.warn(`[Edge Function] Erro ao baixar arquivo ${f.name}:`, fetchErr);
            }
          }
        }

        geminiParts.push({ text: geminiPrompt + `\n[SOLICITAÇÃO DO USUÁRIO]: ${userPrompt}` });

        const geminiModelId = Deno.env.get('GEMINI_MODEL_ID') || 'gemini-2.5-flash-lite';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelId}:generateContent?key=${geminiApiKey}`;
        const toolsPayload = plan.requires_web_search ? [{ googleSearch: {} }] : [];

        const gRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: geminiParts }],
            systemInstruction: { parts: [{ text: METOPE_SYSTEM_PROMPT }] },
            tools: toolsPayload,
          }),
        });

        if (gRes.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const gData: any = await gRes.json();
          const candidate = gData.candidates?.[0];
          geminiPerceptionOutput = candidate?.content?.parts?.[0]?.text || '';

          if (geminiPerceptionOutput.trim()) {
            // ONLY add Gemini Flash Lite badge if the API call actually succeeded and returned text!
            modelsUsedList.push('gemini-3.5-flash-lite');
          }

          const chunks = candidate?.groundingMetadata?.groundingChunks || [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const chunk of chunks as any[]) {
            if (chunk.web && chunk.web.uri) {
              webSources.push({ title: chunk.web.title || chunk.web.uri, url: chunk.web.uri });
            }
          }
        } else {
          const errText = await gRes.text().catch(() => '');
          console.warn(`[Edge Function] Chamada ao Gemini Flash Lite falhou (HTTP ${gRes.status}):`, errText);
        }
      }
    }

    // STAGE 2: Master Architectural Thinking Agent (Kimi K2.5 / GLM-5)
    modelsUsedList.push(Deno.env.get('BEDROCK_MODEL_ID') || 'moonshotai.kimi-k2.5');

    const apiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('BEDROCK_API_KEY') || Deno.env.get('GEMINI_API_KEY') || '';
    const baseUrl = (Deno.env.get('OPENAI_BASE_URL') || 'https://bedrock-mantle.us-east-1.api.aws/v1').replace(/\/$/, '');

    if (!apiKey) {
      throw new Error('Secret OPENAI_API_KEY não configurado nas Secrets do Supabase.');
    }

    let systemPromptToUse = METOPE_SYSTEM_PROMPT;
    if (forceThinking) {
      systemPromptToUse += `\n\n[MODO DE PENSAMENTO AVANÇADO E RACIOCÍNIO ESTRUTURADO ATIVADO]: Execute uma análise minuciosa passo a passo (Chain of Thought), detalhando premissas estruturais, normas técnicas ABNT aplicáveis, cálculos dimensionais e recomendações arquitetônicas de alto nível antes da conclusão final.`;
    }

    let finalPromptContent = '';

    if (geminiPerceptionOutput.trim()) {
      finalPromptContent += `[RELATÓRIO DE PERCEPÇÃO E EXTRAÇÃO VISUAL DO GEMINI]:\n${geminiPerceptionOutput}\n---\n`;
    }

    for (const f of files) {
      if (f.content_text) {
        finalPromptContent += `[ARQUIVO ANEXADO DO PROJETO: ${f.name}]\n${f.content_text}\n---\n`;
      }
    }

    if (previousMessages.length > 0) {
      const summary = previousMessages
        .slice(-6)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) => `${String(m.role).toUpperCase()}: ${m.content}`)
        .join('\n\n');
      finalPromptContent += `[HISTÓRICO DA CONVERSA]:\n${summary}\n---\n`;
    }

    finalPromptContent += userPrompt;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: Deno.env.get('BEDROCK_MODEL_ID') || 'moonshotai.kimi-k2.5',
        messages: [
          { role: 'system', content: systemPromptToUse },
          { role: 'user', content: finalPromptContent },
        ],
        tools: openAiTools,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errData: any = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || errData.message || `HTTP ${response.status} na API de IA`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();
    const message = data.choices?.[0]?.message;
    let rawText = message?.content || '';
    const toolCalls = message?.tool_calls || [];

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function?.name || '';
      let rawInput = {};
      try {
        rawInput = JSON.parse(toolCall.function?.arguments || '{}');
      } catch (_e) {
        // ignore
      }

      const { isValid, sanitizedInput } = validateToolInput(toolName, rawInput);
      if (isValid && toolName === 'generate_floor_plan') {
        const floorPlanData = solveFloorPlanEdge(sanitizedInput, sanitizedInput.titulo_estudo || 'Estudo de Layout Arquitetônico');
        if (!rawText.trim()) {
          rawText = `## ESTUDO TÉCNICO DE LAYOUT ARQUITETÔNICO\n\nCom base nas premissas solicitadas, foi gerada a proposta preliminar de planta baixa com área construída de **${sanitizedInput.area_total_m2}m²** e setorização dos ambientes.`;
        }
        rawText += `\n\n\`\`\`floorplan_data\n${JSON.stringify(floorPlanData, null, 2)}\n\`\`\``;
      }
    }

    // Append Web Sources if present
    const uniqueSources = Array.from(new Map(webSources.map((s) => [s.url, s])).values());
    if (uniqueSources.length > 0) {
      rawText += `\n\n---\n`;
      uniqueSources.forEach((src, i) => {
        rawText += `${i + 1}. [${src.title}](${src.url})\n`;
      });
    }

    // 2. Output Validation Step
    const validatedText = validateOutputResponse(rawText);

    // Deduplicate models used
    const uniqueModels = Array.from(new Set(modelsUsedList)).join(' + ');

    return new Response(
      JSON.stringify({
        response: validatedText,
        modelUsed: uniqueModels,
        plan: plan,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno na Edge Function';
    console.error('[AI Edge Function Error]:', err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
