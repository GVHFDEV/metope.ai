# Metope AI — Diretrizes do Design System & Visão do Produto

---

## 1. O que é o Metope AI?

O **Metope AI** é um copiloto de inteligência artificial desenvolvido especificamente para arquitetos e projetistas — concebido como o **"Cursor para projetos de arquitetura"**.

A proposta central da plataforma é permitir que o profissional de arquitetura centralize seus projetos e faça o upload de documentações técnicas (plantas baixas em PDF, imagens, programas de necessidades e especificações) para interagir com uma inteligência artificial multimodal (Google Gemini API).

### Capacidades Principais do MVP:
* **Entendimento Multimodal de Plantas**: Leitura e interpretação direta de desenhos arquitetônicos em imagem e PDF.
* **Resumo de Projetos**: Síntese executiva da ficha técnica, área e setorização do projeto.
* **Geração de Memoriais Descritivos**: Produção de minutas técnicas formais divididas por seções (Normas NBR, Alvenarias, Revestimentos, Esquadrias e Instalações).
* **Análise Técnica de Layout**: Avaliação de fluxos de circulação, insolação, ventilação cruzada, acessibilidade (NBR 9050) e ergonomia.

---

## 2. Direção Visual & Princípios de Design System

A interface do Metope AI foi projetada para transmitir rigor técnico, clareza e alta produtividade, inspirando-se em ferramentas de trabalho profissional como o **Bielik IDE**, **Autodesk Fusion** e **Zhipu GLM**.

### Princípios Norteadores:
1. **Linguagem de Ferramenta Técnica (IDE)**: Foco total no conteúdo do projeto e na produtividade do arquiteto.
2. **Tipografia Unificada**: Tipografia sans-serif limpa e contemporânea.
3. **Ausência de Elementos Infantis / Genéricos**: PROIBIDO o uso de emojis, mascotes de IA, gradientes decorativos ou sombras pesadas.
4. **Hierarquia por Contraste e Espaço**: Divisões limpas de 1px e espaçamento generoso.

---

## 3. Paleta de Cores (Color Tokens)

| Token | Código Hex | Aplicação |
| :--- | :--- | :--- |
| **Canvas Background** | `#fafafa` | Fundo principal da área de chat / workspace |
| **Panel / Card Background** | `#ffffff` | Cartões de mensagens, caixas de input e modals |
| **Sidebar Background** | `#f8f9fa` | Barra lateral de arquivos e navegação |
| **Border Neutral** | `#e4e4e7` | Linhas divisórias de 1px e contornos de cartões |
| **Text Primary** | `#09090b` | Títulos, nomes de projetos e texto principal |
| **Text Secondary / Muted** | `#71717a` | Legendas, tamanhos de arquivos e timestamps |
| **Accent Primary (Terracota)** | `#BA4E20` | Destaque principal, botões de ação e ícones de arquivo |
| **Accent Light Background** | `#fdf5f2` | Fundo suave de hover e itens selecionados |

---

## 4. Tipografia (Typography)

Toda a plataforma utiliza a fonte **Satoshi Variable** como a **única tipografia oficial**:

* **Fonte Principal**: `Satoshi Variable` (Normal e Itálico) alocada em `/public/fonts/`.
* **Configuração**: Carregada nativamente via `next/font/local` no `layout.tsx` e injetada no CSS global através de `--font-sans`.
* **Hierarquia**:
  * **H1 / Pergunta Central**: 30px (`text-3xl`), Peso 700 (Bold), Tracking `-0.02em`.
  * **H2 / Títulos Técnicos**: 14px (`text-sm`), Peso 700 (Bold), Caixa Alta.
  * **Corpo de Texto / Chat**: 12px (`text-xs`), Peso 400 (Regular), Entrelinha `leading-relaxed`.
  * **Metadados / Código**: 10px-11px (`text-[10px]`), Peso 500 (Mono), Caixa Alta.

---

## 5. Logotipo & Iconografia

* **Logotipo**: `public/logo.svg` vetorial. Exibido **uma única vez** no topo da barra lateral (`Sidebar`) em formato compacto (`h-4.5`).
* **Ícones**: Linhas finas monocromáticas fornecidas pela biblioteca `lucide-react`.
* **Regra Estrita**: Nenhum emoji ou ícone colorido decorativo deve ser utilizado na interface.

---

## 6. Padrões de Layout e Componentes IDE

### Sidebar Lateral:
* **Foco Único**: Exibe apenas o logo no topo, a área de drag-and-drop (`Upload de Arquivos`), busca de arquivos e a lista de documentos do projeto ativo.

### Header Superior:
* **Seletor de Projetos Integrado**: Exibe o nome do projeto ativo. Ao clicar, abre o menu dropdown contendo a lista de projetos salvos e a ação de `Criar Novo Projeto`.

### Canvas de Chat (Referência Bielik):
* **Estado Inicial**: Pergunta centralizada *"Em que posso ajudar com seu projeto?"* + Caixa de input flutuante central + 3 cards de atalho rápido (`Resumir projeto`, `Gerar memorial descritivo`, `Analisar layout`).
* **Estado Ativo**: Thread técnica fluida com pareceres da IA em Markdown e caixa de envio fixada no rodapé.
* **Scrollbars**: Personalizadas para serem ultra-finas e discretas (5px), sem barras cinzas pesadas ou setas nativas de navegador.
