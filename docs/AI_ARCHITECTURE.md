# Metope AI — Arquitetura de Inteligência Artificial

> **Versão**: 0.1.0 (MVP)
> **Última atualização**: Julho 2025
> **Documento técnico**: Fluxo de orquestração, modelos, APIs, problemas conhecidos e evolução

---

## 1. Visão Geral da Arquitetura de IA

O Metope AI utiliza uma arquitetura de **orquestração multi-modelo em 2 estágios** (Multi-Stage Agentic Model Routing), implementada em uma única Supabase Edge Function (`ai-chat`) que roda em Deno. A filosofia central é "**conversa entre modelos**": um agente perceptivo extrai dados brutos (PDFs, imagens, web) e um agente de síntese constrói a resposta final.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE EDGE FUNCTION (ai-chat)              │
│                                                                     │
│  ┌────────────────┐     ┌──────────────────┐     ┌──────────────┐  │
│  │  INTENT        │────▶│  STAGE 1:        │────▶│  STAGE 2:    │  │
│  │  ANALYZER      │     │  PERCEPTION      │     │  SYNTHESIS   │  │
│  │  (Regex-based) │     │  (Gemini Flash   │     │  (Kimi K2.5) │  │
│  │                │     │   Lite)          │     │              │  │
│  └────────────────┘     └──────────────────┘     └──────────────┘  │
│         │                       │                       │          │
│    planExecutionGraph()    Google API              OpenAI-compat   │
│    → AgentPlanJSON          + googleSearch           API           │
│                             + inlineData             + tools      │
│                             (base64)                 + CoT        │
│                                                                     │
│  Saída: { response, modelUsed, plan }                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Modelos de IA Utilizados

### 2.1 Moonshot AI — Kimi K2 Thinking (Modelo Padrão de Fábrica)

| Atributo | Valor |
|---|---|
| **Model ID** | `moonshotai.kimi-k2-thinking` |
| **Provider** | Moonshot AI via AWS Bedrock Mantle / API |
| **Protocolo** | OpenAI-compatible Chat Completions |
| **Thinking** | **Ativado por Padrão** (Thinking ON out-of-the-box) |
| **Função** | Chat técnico padrão, síntese de respostas e formatação com raciocínio integrado |

### 2.2 xAI — Grok 4.3 (Modelo de Pensamento Avançado & Troca de Grafo)

| Atributo | Valor |
|---|---|
| **Model ID** | `xai.grok-4.3` |
| **Provider** | xAI via AWS Bedrock Mantle / API (`us-east-2`) |
| **Gatilho de Troca** | Ativação do botão de Pensamento Avançado (`forceThinking: true`) OU detecção pelo Grafo de Intenção (cálculos estruturais, normas ABNT, memoriais, plantas) |
| **Função** | Raciocínio arquitetônico profundo, análise espacial avançada e Chain-of-Thought complexo |

### 2.2 Google — Gemini 3.5 Flash Lite (Modelo Perceptivo)

| Atributo | Valor |
|---|---|
| **Model ID** | `gemini-3.5-flash-lite` (configurável via `GEMINI_MODEL_ID`) |
| **Provider** | Google AI Studio |
| **Endpoint** | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| **Autenticação** | `?key={GEMINI_API_KEY}` (query parameter) |
| **Função** | OCR de PDFs/imagens, extração visual, Google Search Grounding |

**Capacidades utilizadas**:
- **Multimodal**: Recebe binários (PDF/PNG/JPG) em base64 via `inlineData`
- **Google Search Grounding**: Quando `tools: [{ googleSearch: {} }]` é enviado, o modelo pesquisa na web e retorna `groundingMetadata.groundingChunks` com URLs de fontes
- Extração de texto visual: nomes de proprietários, engenheiros, quadro de áreas, carimbo de projeto

**Limitações conhecidas**:
- Modelo "lite" pode não capturar detalhes finos em plantas baixas de alta complexidade
- Latência adicional ao enviar arquivos grandes em base64

---

## 3. Fluxo de Execução Detalhado

### 3.1 Cadeia de Invocação

```
[Usuário digita no ChatPanel]
       │
       ▼
[StorageService.sendChat()]
       │
       ├─ 1. Persiste mensagem do user no Postgres
       ├─ 2. Carrega mensagens anteriores da conversa
       │
       ▼
[callGeminiApi()] → supabase.functions.invoke('ai-chat')
       │
       ▼
[Edge Function ai-chat (Deno)]
       │
       ├── 3. Validação de Auth (header Authorization ou apikey)
       ├── 4. Parse do body JSON
       │
       ▼
[planExecutionGraph()]  ← DECISION POINT
       │
       ├── Analisa o prompt text com regex patterns
       ├── Verifica flags: forceSearch, forceThinking
       │
       ▼
[AgentPlanJSON] = {
    requires_perception_gemini: boolean,
    requires_web_search: boolean,
    requires_complex_synthesis_kimi: boolean,  // sempre true
    reason: string
}
```

### 3.2 O Analisador de Intenção Contextual (`planExecutionGraph`)

Esta é a função central de roteamento que decide **quais modelos serão acionados**. Atualmente é **baseada em regex**, não em IA.

#### Regras de Decisão

```typescript
// Web Search (Google Grounding)
needsWebSearch = forceSearch || /pesquisar|buscar na web|notícias|norma|legislação|hoje|atualizado/i

// Análise de Documentos (Gemini Multimodal)
asksToAnalyzeDocument =
    /\[FOCO DE ANÁLISE PRIORITÁRIO/i     // Tag injetada ao mencionar arquivo
  || /@\S+/i                              // Menção de arquivo com @
  || /\.(pdf|png|jpe?g|webp|dwg|dxf)/i   // Extensão de arquivo no texto
  || /analis(e|ar)|leia|leitura|no arquivo|neste documento|na imagem|
      na planta|no pdf|proprietário|titular|engenheiro|quadro de áreas|carimbo/i

// Decisão Final
requiresGemini = needsWebSearch || asksToAnalyzeDocument
```

#### Matriz de Roteamento

| Cenário | Gemini Flash Lite | Kimi K2.5 | Badges |
|---|:---:|:---:|---|
| "O que é uma planta baixa?" | ❌ | ✅ | `kimi-k2.5` |
| "Me explique o Burj Khalifa" | ❌ | ✅ | `kimi-k2.5` |
| 🌐 Busca web ativada | ✅ | ✅ | `gemini + kimi` |
| "Analise este PDF @projeto.pdf" | ✅ | ✅ | `gemini + kimi` |
| 🧠 Thinking ativado | ❌ | ✅ (CoT) | `kimi-k2.5` |
| 🧠 + 🌐 ambos ativos | ✅ | ✅ (CoT) | `gemini + kimi` |

### 3.3 Stage 1: Agente de Percepção (Gemini)

Executado **somente quando** `plan.requires_perception_gemini === true`.

```
[Gemini Perception Agent]
       │
       ├── Para cada arquivo no array files[]:
       │   ├── Se tem content_text → injeta como texto com label
       │   ├── Se tem url → fetch binário → base64 → inlineData
       │   └── Detecta mime_type (PDF → application/pdf, PNG → image/png)
       │
       ├── Constrói prompt do orquestrador:
       │   "[INSTRUÇÃO DO ORQUESTRADOR DE PERCEPÇÃO]..."
       │   + arquivos injetados
       │   + "[SOLICITAÇÃO DO USUÁRIO]: {prompt}"
       │
       ├── Adiciona tools se web search:
       │   tools: [{ googleSearch: {} }]
       │
       ├── POST para Gemini API generateContent
       │
       └── Extrai:
           ├── geminiPerceptionOutput = candidates[0].content.parts[0].text
           └── webSources[] = groundingMetadata.groundingChunks[].web
```

**Conversão Base64**: Utiliza um chunked approach com `chunkSize = 8192` bytes para evitar stack overflow em arquivos grandes, convertendo `Uint8Array` → `String.fromCharCode` → `btoa()`.

### 3.4 Stage 2: Agente de Síntese (Kimi K2.5)

Executado **sempre**, independente do resultado do Stage 1.

```
[Kimi K2.5 Synthesis Agent]
       │
       ├── System Prompt: METOPE_SYSTEM_PROMPT
       │   └── Se forceThinking: + instrução de Chain-of-Thought
       │
       ├── User Content construído em camadas:
       │   ├── [RELATÓRIO DE PERCEPÇÃO DO GEMINI] (se Stage 1 produziu)
       │   ├── [ARQUIVO ANEXADO DO PROJETO] (content_text dos files)
       │   ├── [HISTÓRICO DA CONVERSA] (últimas 6 mensagens)
       │   └── {userPrompt}
       │
       ├── Tools: [generate_floor_plan, analyze_layout_design,
       │           generate_memorial_descriptive, summarize_project]
       │
       ├── POST para OpenAI-compatible endpoint
       │
       └── Processa resposta:
           ├── rawText = message.content
           ├── Tool Calls → validateToolInput() → solveFloorPlanEdge()
           └── webSources → deduplicação → append ao texto
```

### 3.5 Tool Calling e Geração de Planta Baixa

Quando o Kimi K2.5 decide invocar `generate_floor_plan`:

```
1. Kimi retorna tool_calls[{ function: { name: "generate_floor_plan", arguments: "{...}" } }]
2. Edge Function parseia os arguments JSON
3. validateToolInput() sanitiza: area_total_m2, comodos[], restricoes_terreno
4. solveFloorPlanEdge() calcula geometria:
   - buildingWidth = √(area × 1.33 aspect ratio)
   - buildingDepth = area / buildingWidth
   - Para cada cômodo: targetArea = (minArea / totalMin) × areaTarget
   - Layout em grid: currentX += side, wrap para próxima row se exceder largura
5. Resultado JSON embutido na resposta como ```floorplan_data```
6. Frontend detecta o bloco, parseia, e abre o FloorPlanCanvas (Konva.js)
```

---

## 4. Configuração de Secrets e APIs

### Supabase Edge Function Secrets

| Secret Name | Uso |
|---|---|
| `OPENAI_API_KEY` | API key para AWS Bedrock Mantle (Kimi K2.5), fallback para Gemini |
| `OPENAI_BASE_URL` | `https://bedrock-mantle.us-east-2.api.aws/v1` |
| `GEMINI_API_KEY` | API key para Google AI Studio (Gemini Flash Lite) |
| `GEMINI_MODEL_ID` | `gemini-3.5-flash-lite` (configurável) |
| `BEDROCK_MODEL_ID` | `moonshotai.kimi-k2.5` (configurável) |

### Frontend Environment Variables (`.env.local`)

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima/pública do Supabase |

> [!IMPORTANT]
> **Zero API keys de IA no frontend.** Todas as chaves de modelos estão exclusivamente no Supabase Secrets, acessíveis apenas pelo Edge Function em runtime Deno.

---

## 5. Problemas Atuais Conhecidos

### 5.1 Problemas Críticos

#### P1: Roteamento baseado em Regex é frágil

O `planExecutionGraph()` usa pattern matching simples para decidir se aciona o Gemini. Isso causa:

- **Falsos negativos**: O usuário pergunta "quem assinou o projeto?" sem mencionar "proprietário" ou "engenheiro" → Gemini não é acionado, Kimi responde sem os dados do PDF
- **Falsos positivos**: O usuário digita "o arquivo de normas é importante" → regex detecta "arquivo" e aciona Gemini desnecessariamente
- **Não analisa contexto semântico**: A regex não entende intenção, apenas palavras-chave

#### P2: Badge de modelo incorreta em certos cenários

- O Kimi K2.5 é **sempre** adicionado à lista de modelos usados (linha 415), mesmo que a resposta falhe ou seja um fallback
- O Gemini é adicionado apenas quando retorna texto, mas a badge pode exibir "gemini" em queries que não necessitavam de percepção visual

#### P3: Leitura de documentos inconsistente

- **Arquivos de texto** (TXT, MD, JSON) são indexados com `content_text` na hora do upload e enviados como texto puro ao Gemini e Kimi
- **PDFs e imagens** dependem do fetch da URL + conversão base64 no Edge Function. Se o signed URL expirou (>1h), o fetch falha silenciosamente e o Gemini não recebe o arquivo
- **Sem OCR client-side**: PDFs não são parseados no frontend. O campo `content_text` fica vazio para PDFs, dependendo 100% do Gemini para extração

#### P4: Histórico de conversa limitado

- O Edge Function envia apenas as **6 últimas mensagens** como contexto (slice(-6))
- Não há sumarização de histórico — em conversas longas, o modelo perde todo o contexto anterior
- Os previous messages são concatenados como texto puro, sem distinção clara de tokens

### 5.2 Problemas de Performance

#### P5: Base64 encoding no Edge Function

- Arquivos grandes (PDFs de 5-10MB) são convertidos para base64 inline, o que:
  - Triplica o tamanho do payload (~133% de overhead)
  - Pode causar timeouts no Edge Function (limite de 60s do Supabase)
  - Consome memória significativa no runtime Deno

#### P6: Latência dupla em queries multimodais

- Queries que acionam o Gemini sofrem 2 chamadas sequenciais de API:
  1. Gemini (percepção) → ~2-5s
  2. Kimi (síntese) → ~3-8s
- Total: ~5-13s, versus ~3-8s para queries diretas ao Kimi

### 5.3 Problemas de UX/Funcionalidade

#### P7: Sem streaming de resposta

- A resposta completa é aguardada e exibida de uma vez
- Não há typing indicator granular ou streaming token-by-token
- Em respostas longas (memoriais descritivos), o usuário espera 10-15s sem feedback

#### P8: API Route `/api/chat` duplicada e não utilizada

- O arquivo `src/app/api/chat/route.ts` implementa uma rota de API Next.js com rate limiting
- Porém o frontend **nunca usa esta rota** — chama diretamente `supabase.functions.invoke('ai-chat')` via SDK
- A rota existe mas é dead code, causando confusão na arquitetura

---

## 6. Riscos Operacionais

### 6.1 Riscos de Custo

| Risco | Impacto | Mitigação Atual |
|---|---|---|
| Chamadas desnecessárias ao Gemini (falsos positivos no regex) | Custo por token multiplied | Regex pode ser refinada, mas é inerentemente imprecisa |
| Base64 de arquivos grandes triplica tokens enviados ao Gemini | Alto custo por request | Nenhuma (sem compressão ou file URI) |
| Sem cache de respostas | Mesma pergunta = mesma cobrança | Nenhum cache implementado |
| Sem limite de tokens no prompt do Kimi | Histórico longo = custo alto | Apenas slice(-6) de mensagens |

### 6.2 Riscos de Confiabilidade

| Risco | Impacto | Mitigação Atual |
|---|---|---|
| Edge Function timeout (60s Supabase) com PDFs grandes | Request falha sem resposta | Chunked base64, mas sem controle de tamanho |
| Dependência de signed URLs com TTL de 1h | Arquivos podem ficar inacessíveis durante processamento | Nenhuma |
| Single point of failure no AWS Bedrock Mantle | Se o endpoint cai, toda a IA para | Nenhum fallback implementado |
| Gemini API rate limits (Google) | Muitas requests simultâneas podem ser throttled | Nenhum retry/backoff |

---

## 7. Evolução Histórica das Principais Alterações

| Data | Alteração | Motivação |
|---|---|---|
| v0.1.0 (início) | API Route `/api/chat` como proxy para Gemini | Manter API keys fora do frontend |
| v0.1.1 | Migração para Supabase Edge Function | Centralizar secrets e eliminar dependência do Next.js API route |
| v0.1.2 | Adição do Kimi K2.5 como modelo primário | Gemini sozinho tinha limitações de raciocínio técnico |
| v0.1.3 | Arquitetura multi-modelo (Gemini Perception + Kimi Synthesis) | Separar capacidades: visão/web (Gemini) vs. raciocínio (Kimi) |
| v0.1.4 | Intent Analyzer com regex | Evitar acionar Gemini para perguntas genéricas |
| v0.1.5 | Modo de Pensamento Avançado (🧠) | Chain-of-Thought controlado pelo usuário |
| v0.1.6 | Contextual Intent Analysis | Não acionar Gemini apenas por ter arquivo no projeto |
| v0.1.7 | Tool Calling para geração de plantas | Solver geométrico determinístico no Edge Function |
| v0.1.8 | Troca para Gemini 3.5 Flash Lite | Modelo anterior descontinuado |

---

## 8. Sistema de Busca na Web (Google Search Grounding)

### Como Funciona

1. **Ativação**: Botão 🌐 no input ou detecção automática via regex (`pesquisar|norma|legislação|hoje|atualizado`)
2. **Mecanismo**: O Gemini API recebe `tools: [{ googleSearch: {} }]` no payload
3. **Processamento**: O Gemini executa a busca internamente e retorna:
   - Texto com informações da web integradas na resposta
   - `groundingMetadata.groundingChunks[].web` com `{ uri, title }` das fontes
4. **Exibição**: As fontes são deduplicadas por URL e anexadas ao final da resposta como links Markdown numerados
5. **Rate Limiting**: Máximo de 30 buscas forçadas por hora por IP/sessão (implementado no API Route, mas **não no Edge Function**)

### Limitações

- O Google Search Grounding é uma feature do Gemini API, não um scraper independente
- Não é possível controlar quais sites são pesquisados ou excluir resultados
- A qualidade dos resultados depende do modelo Gemini interpretar corretamente a query
- Não há cache de resultados de busca — a mesma pergunta gera uma nova busca

---

## 9. System Prompt do Metope AI

O system prompt define o comportamento e a personalidade do assistente. Pontos-chave:

```
- Tom: estritamente profissional, técnico, preciso e objetivo
- Proibido: emojis, linguagem promocional
- Formato: Markdown estruturado (H2/H3, tabelas, negrito em termos técnicos)
- Terminologia: arquitetônica (layout, programa de necessidades, insolação, NBR 9050)
- Regra crítica: "Quando o usuário solicitar GERAR planta baixa → INVOCAR tool
  IMEDIATAMENTE no primeiro turno, SEM fazer perguntas de esclarecimento"
- Perguntas conceituais → Resposta em texto técnico, SEM invocar ferramentas
```

---

## 10. Diagrama Completo do Fluxo de Dados

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│                                                                  │
│  ChatPanel.tsx                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ User Input → handleSendMessage()                            │ │
│  │   ├── forceSearch? (botão 🌐)                               │ │
│  │   ├── forceThinking? (botão 🧠)                             │ │
│  │   └── mentionedFiles[] (sistema @arquivo)                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                       │
│                          ▼                                       │
│  StorageService.sendChat()                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 1. addMessage(user) → INSERT no Postgres                    │ │
│  │ 2. getConversationMessages() → últimas mensagens            │ │
│  │ 3. callGeminiApi() → supabase.functions.invoke('ai-chat')   │ │
│  │ 4. addMessage(assistant, modelUsed) → INSERT no Postgres    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                           │
              HTTPS (Supabase SDK)
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                  SUPABASE EDGE FUNCTION (Deno)                   │
│                                                                  │
│  ┌──────────────────┐                                            │
│  │ Auth Check       │ ← Authorization header ou apikey           │
│  └────────┬─────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                            │
│  │ planExecution    │ ← Regex-based Intent Analysis              │
│  │ Graph()          │ → AgentPlanJSON                             │
│  └────────┬─────────┘                                            │
│           │                                                      │
│     ┌─────┴─────────────────────────┐                            │
│     │ requires_perception_gemini?   │                            │
│     │                               │                            │
│  ┌──▼──────────┐              ┌─────▼───────┐                    │
│  │ STAGE 1:    │              │ SKIP STAGE 1│                    │
│  │ Gemini API  │              │             │                    │
│  │ • base64    │              └─────┬───────┘                    │
│  │ • googleSearch               │                              │
│  │ • inlineData │                   │                            │
│  └──────┬──────┘                    │                            │
│         │ geminiPerceptionOutput    │                            │
│         └───────┬───────────────────┘                            │
│                 │                                                │
│                 ▼                                                │
│  ┌──────────────────┐                                            │
│  │ STAGE 2:         │                                            │
│  │ Kimi K2.5 API    │                                            │
│  │ • system prompt  │                                            │
│  │ • perception     │                                            │
│  │   output injected│                                            │
│  │ • tools[]        │                                            │
│  │ • temperature=0.2│                                            │
│  └────────┬─────────┘                                            │
│           │                                                      │
│     ┌─────┴─────────────────────────┐                            │
│     │ Has tool_calls?               │                            │
│     │                               │                            │
│  ┌──▼──────────────┐         ┌──────▼──────────┐                 │
│  │ generate_floor  │         │ No tools        │                 │
│  │ _plan()         │         │ → rawText only   │                 │
│  │ → validateTool  │         └──────┬──────────┘                 │
│  │ → solveFloorPlan│                │                            │
│  │ → JSON append   │                │                            │
│  └──────┬──────────┘                │                            │
│         └───────┬───────────────────┘                            │
│                 │                                                │
│                 ▼                                                │
│  ┌──────────────────┐                                            │
│  │ validateOutput() │                                            │
│  │ Append webSources│                                            │
│  │ Deduplicate      │                                            │
│  │ models[]         │                                            │
│  └────────┬─────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  Response JSON: { response, modelUsed, plan }                    │
└──────────────────────────────────────────────────────────────────┘
```
