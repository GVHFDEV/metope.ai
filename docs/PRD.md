# Metope AI — Product Requirements Document (PRD)

> **Versão**: 0.1.0 (MVP)
> **Última atualização**: Julho 2025
> **Autor**: Equipe Metope

---

## 1. Visão Geral e Objetivo

O **Metope AI** é uma plataforma de copiloto de inteligência artificial voltada exclusivamente para profissionais de **arquitetura, engenharia civil e análise de projetos prediais**. A plataforma combina um ambiente visual estilo IDE (Integrated Development Environment) com capacidades multimodais de IA, permitindo que arquitetos e engenheiros interajam com documentos técnicos, plantas baixas e dados de projeto via chat inteligente.

### Objetivo Central

Eliminar a fricção entre a produção documental de projetos arquitetônicos e a tomada de decisão técnica, fornecendo um assistente que:

- **Lê e interpreta** documentos PDF, imagens de plantas, carimbo de projeto, quadro de áreas
- **Gera automaticamente** estudos de layout e plantas baixas 2D parametrizadas
- **Pesquisa normas e legislação** em tempo real via Web Grounding
- **Redige** memoriais descritivos, resumos executivos e fichas técnicas
- **Raciocina** sobre restrições dimensionais, taxa de ocupação, recuos e programa de necessidades

---

## 2. Público-Alvo

| Perfil | Uso Principal |
|---|---|
| Arquitetos autônomos | Geração rápida de estudos de layout, memoriais descritivos e análise de projetos |
| Escritórios de arquitetura | Centralizar documentação de múltiplos projetos com IA assistente |
| Engenheiros civis | Análise de metragem, normas ABNT, verificação de cotas |
| Estudantes de Arquitetura/Engenharia | Aprendizado interativo e consultas técnicas |

---

## 3. Funcionalidades Oferecidas (MVP)

### 3.1 Gerenciamento de Projetos
- Criação, edição e exclusão de projetos com categorização (Residencial, Comercial, Corporativo, Interiores, Outro)
- Cada projeto possui uma sidebar de árvore de arquivos, conversas independentes e um gerenciador de arquivos

### 3.2 Sistema de Conversas Multi-thread
- Múltiplas conversas por projeto (threads independentes)
- Renomeação e exclusão de threads
- Histórico persistido no banco de dados

### 3.3 Upload e Indexação de Documentos
- Upload via drag-and-drop ou seletor de arquivos
- Formatos suportados: PDF, PNG, JPG, JPEG, SVG, WebP, TXT, MD, DOC, DOCX
- Armazenamento seguro no Supabase Storage (bucket privado)
- URLs assinadas com expiração de 1 hora para acesso aos arquivos
- Indexação de texto para arquivos plain-text (TXT, MD, JSON)
- Envio de binários em base64 para o Gemini (PDFs e imagens)

### 3.4 Menção de Arquivos no Chat (`@arquivo`)
- Sistema de autocomplete que referencia arquivos do projeto diretamente na mensagem
- Os arquivos mencionados são injetados automaticamente no contexto da IA

### 3.5 Chat com IA Multi-Modelo
- **Modelo Primário (Síntese)**: Kimi K2.5 (Moonshot AI) via AWS Bedrock Mantle — raciocínio técnico e geração de resposta
- **Modelo Perceptivo (Visão/Web)**: Gemini 3.5 Flash Lite — OCR de PDFs/imagens, Google Search Grounding
- Exibição de badges dos modelos utilizados em cada resposta
- Modo de pensamento avançado (Chain-of-Thought) ativável via botão 🧠

### 3.6 Busca na Web em Tempo Real
- Ativação via botão 🌐 no input ou detecção automática por regex de palavras-chave
- Google Search Grounding via Gemini API
- Fontes web citadas ao final de cada resposta como links clicáveis

### 3.7 Geração Algorítmica de Plantas Baixas 2D
- **Tool Calling**: O modelo Kimi invoca a função `generate_floor_plan` com parâmetros estruturados
- **Solver geométrico determinístico** no Edge Function calcula posições e dimensões dos cômodos
- Canvas 2D interativo renderizado com **Konva.js** (React-Konva)
- Pan, zoom, seleção de cômodos, redimensionamento e exportação PNG
- Dados da planta armazenados como JSON no banco e no gerenciador de arquivos

### 3.8 Quick Actions (Atalhos de Análise Rápida)
| Ação | Função |
|---|---|
| Resumir projeto | Sintetiza ficha técnica e documentos do projeto ativo |
| Gerar memorial descritivo | Minuta técnica formal de memorial descritivo |
| Analisar layout | Avalia fluxos de circulação, insolação e setorização |

### 3.9 Renderização Markdown Avançada
- Markdown com GFM (GitHub Flavored Markdown) via `react-markdown`
- Suporte a LaTeX/KaTeX para fórmulas matemáticas e cálculos estruturais
- Tabelas estilizadas, listas, blocos de código com syntax highlighting
- Links de fontes web estilizados como pills clicáveis

### 3.10 Modo Escuro / Claro
- Toggle via botão na sidebar (Sun/Moon)
- Persistência via `localStorage`
- Classe `.dark` aplicada ao `<html>` com variante Tailwind CSS v4 customizada
- Cobertura em 100% dos componentes da plataforma

---

## 4. Estrutura e Arquitetura Técnica

### 4.1 Stack Tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| **Framework** | Next.js (App Router, Turbopack) | 16.2.11 |
| **Runtime** | React | 19.2.4 |
| **Linguagem** | TypeScript | 5.x |
| **Estilização** | Tailwind CSS v4 | 4.x |
| **Animações** | Framer Motion | 12.42.2 |
| **Ícones** | Lucide React | 1.26.0 |
| **Canvas 2D** | Konva.js + React-Konva | 10.3.0 / 19.2.5 |
| **Markdown** | react-markdown + remark-gfm + rehype-katex | 10.1.0 |
| **Math/LaTeX** | KaTeX | 0.18.1 |
| **Backend (BaaS)** | Supabase (Postgres + Auth + Storage + Edge Functions) | 2.110.8 (JS SDK) |
| **IA Primária** | Moonshot AI Kimi K2.5 (via AWS Bedrock Mantle) | — |
| **IA Perceptiva** | Google Gemini 3.5 Flash Lite | — |
| **Edge Runtime** | Deno (Supabase Edge Functions) | 0.168.0 |

### 4.2 Arquitetura de Componentes

```
src/
├── app/
│   ├── page.tsx              ← Página principal (state management centralizado)
│   ├── globals.css           ← Design system (variáveis CSS, Tailwind v4, KaTeX)
│   ├── layout.tsx            ← Layout raiz (fontes, metadata SEO)
│   └── api/chat/route.ts     ← API Route (rate limiting, fallback)
├── components/ide/
│   ├── Sidebar.tsx           ← Sidebar de navegação (projetos, conversas, tema)
│   ├── ChatPanel.tsx         ← Painel principal de chat (mensagens, input, welcome)
│   ├── MarkdownRenderer.tsx  ← Renderizador de Markdown com KaTeX, tabelas, fontes
│   ├── ProjectFilesManager.tsx ← Gerenciador de arquivos do projeto
│   ├── FilePreviewModal.tsx  ← Modal de visualização de arquivos (imagem/PDF/texto)
│   ├── ProjectModal.tsx      ← Modal de criação/edição de projetos
│   ├── AuthModal.tsx         ← Modal de login/registro
│   ├── AuthPanel.tsx         ← Painel de autenticação na sidebar
│   ├── FloorPlanCanvas.tsx   ← Canvas 2D interativo para plantas baixas (Konva)
│   ├── Header.tsx            ← Barra superior (seletor de projetos)
│   ├── IDETabBar.tsx         ← Barra de abas (chat / planta baixa)
│   └── QuickActions.tsx      ← Barra de atalhos de análise rápida
├── lib/
│   ├── supabase.ts           ← Cliente Supabase (anon key, session ID)
│   ├── auth.ts               ← Serviço de autenticação (email/senha, Google OAuth)
│   ├── gemini.ts             ← Invocação da Edge Function ai-chat via Supabase SDK
│   └── storage.ts            ← Camada de dados (CRUD de projetos, arquivos, mensagens)
└── types/
    ├── index.ts              ← Tipos TypeScript (Project, ProjectFile, ChatMessage, etc.)
    └── supabase.ts           ← Tipos gerados do banco Supabase
```

### 4.3 Arquitetura de Dados (Supabase Postgres)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   projects   │──1:N──│ conversations │──1:N──│   messages   │
│              │       │              │       │              │
│ id (uuid)    │       │ id (uuid)    │       │ id (uuid)    │
│ user_id      │       │ project_id   │       │ conversation_id│
│ session_id   │       │ title        │       │ project_id   │
│ name         │       │ user_id      │       │ role         │
│ description  │       │ session_id   │       │ content      │
│ category     │       │ created_at   │       │ action_type  │
│ created_at   │       │ updated_at   │       │ model_used   │
│ updated_at   │       └──────────────┘       │ created_at   │
└──────┬───────┘                              └──────────────┘
       │
       │──1:N──┌──────────────┐       ┌──────────────────────┐
               │    files     │       │  Supabase Storage    │
               │              │       │  (Bucket: project-   │
               │ id (uuid)    │───────│   files)             │
               │ project_id   │       │  Privado, signed URL │
               │ user_id      │       └──────────────────────┘
               │ session_id   │
               │ name         │
               │ storage_path │
               │ content_text │
               │ mime_type    │
               │ size         │
               │ created_at   │
               └──────────────┘
```

### 4.4 Modelo de Propriedade e Acesso

- **Usuários autenticados**: Projetos vinculados via `user_id` (UUID do Supabase Auth)
- **Usuários anônimos**: Projetos vinculados via `session_id` (UUID gerado localmente e salvo em `localStorage`)
- **Migração anônimo → conta**: Ao fazer login, a função RPC `claim_session_project` transfere a propriedade dos projetos da sessão anônima para a conta do usuário
- **Row Level Security (RLS)**: Enforced no nível do banco Supabase para todas as tabelas

---

## 5. Segurança

### 5.1 Proteções Implementadas

| Camada | Mecanismo |
|---|---|
| **API Keys de IA** | Armazenadas exclusivamente como Supabase Secrets (Deno.env) no Edge Function. Zero chaves no frontend ou `.env.local` |
| **Autenticação** | Supabase Auth com email/senha e Google OAuth. Rate limiting de 2s entre tentativas no frontend |
| **Row Level Security** | RLS habilitado em todas as tabelas Postgres (projects, files, messages, conversations) |
| **Storage** | Bucket `project-files` configurado como privado. Acesso apenas via signed URLs com TTL de 1h |
| **Sanitização de Input** | Validação de comprimento (max 5000 chars), sanitização de nomes de arquivo (remoção de caracteres especiais) |
| **Rate Limiting (Search)** | Max 30 pesquisas web forçadas por hora por IP/sessão no API Route |
| **Validação de Output** | Verificação de integridade mínima da resposta da IA (não-vazia, >= 5 chars) |
| **Validação de Tool Input** | Parâmetros de ferramentas sanitizados antes da execução (áreas, nomes de cômodos) |
| **CORS** | Headers configurados no Edge Function (origin: *, métodos: POST/OPTIONS) |
| **Tradução de Erros** | Mensagens de erro do Supabase Auth traduzidas para PT-BR, sem exposição de detalhes internos |

### 5.2 Riscos de Segurança Conhecidos

> [!CAUTION]
> Os seguintes riscos são identificados mas ainda não corrigidos nesta versão MVP.

1. **CORS `Access-Control-Allow-Origin: *`**: O Edge Function aceita requests de qualquer origem. Em produção, deve ser restrito ao domínio da aplicação.

2. **Edge Function `--no-verify-jwt`**: A flag de deploy desabilita a verificação de JWT do Supabase no Edge Function. Qualquer pessoa com a URL e a anon key pode invocar a função diretamente.

3. **Ausência de Rate Limiting no Edge Function**: O rate limiting existe apenas no API Route do Next.js (`/api/chat`), mas a Edge Function é invocada diretamente pelo SDK do Supabase, contornando essa camada.

4. **Anon Key exposta no frontend**: A `NEXT_PUBLIC_SUPABASE_ANON_KEY` é pública por design do Supabase, mas depende inteiramente do RLS estar correto e completo. Qualquer falha no RLS pode expor dados.

5. **Session ID previsível**: O fallback `Math.random().toString(36)` para geração de session ID é criptograficamente fraco. Embora `crypto.randomUUID()` seja usado quando disponível, o fallback pode ser previsível.

6. **Sem proteção contra Prompt Injection**: Não há sanitização do conteúdo do prompt do usuário antes de ser enviado aos modelos de IA. Um prompt malicioso pode manipular o system prompt ou extrair informações.

7. **File URLs em texto de conteúdo**: As signed URLs dos arquivos são incluídas na resposta do Gemini e podem ser logadas ou cacheadas, potencialmente permitindo acesso temporário aos arquivos.

8. **Dependência `@clerk/nextjs` não utilizada**: O package.json inclui `@clerk/nextjs` que não é utilizado no código (a autenticação é via Supabase Auth), aumentando a superfície de ataque desnecessariamente.

---

## 6. Fluxo de Uso Principal

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Acessar    │────▶│  Criar ou    │────▶│  Upload de    │
│  Plataforma │     │  Selecionar  │     │  Documentos   │
│             │     │  Projeto     │     │  (PDF/IMG)    │
└─────────────┘     └──────────────┘     └───────┬───────┘
                                                 │
                    ┌──────────────┐     ┌───────▼───────┐
                    │  Respostas   │◀────│  Interagir    │
                    │  com badges  │     │  via Chat     │
                    │  de modelo   │     │  (texto,@file)│
                    └──────┬───────┘     └───────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Texto   │ │  Planta  │ │  Fontes  │
        │  Markdown│ │  2D      │ │  Web     │
        │  + LaTeX │ │  Canvas  │ │  (links) │
        └──────────┘ └──────────┘ └──────────┘
```

---

## 7. Deployment

| Componente | Hospedagem |
|---|---|
| Frontend Next.js | Vercel (recomendado) ou qualquer provider com suporte a Next.js 16 |
| Backend (DB, Auth, Storage) | Supabase Cloud |
| Edge Function (`ai-chat`) | Supabase Edge Functions (Deno Deploy) |
| IA Kimi K2.5 | AWS Bedrock Mantle (`bedrock-mantle.us-east-1.api.aws`) |
| IA Gemini Flash Lite | Google AI Studio (`generativelanguage.googleapis.com`) |
