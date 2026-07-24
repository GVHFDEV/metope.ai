# Metope AI — Documentação de Produto & Design System

---

## 1. Visão Geral do Produto

### O que é o Metope AI?
O **Metope AI** é um copiloto de inteligência artificial desenvolvido especificamente para **arquitetos, engenheiros civis e projetistas**. Assim como o *Cursor* revolucionou o desenvolvimento de código oferecendo contexto profundo sobre repositórios inteiros, o Metope AI atua como um parceiro de trabalho técnico que entende o contexto completo de um projeto de arquitetura — incluindo plantas baixas em PDF, imagens, memoriais e documentos técnicos.

### Principais Capacidades
- **Gestão de Projetos & Contexto Multimodal**: Permite carregar documentos, imagens de plantas e PDFs diretamente na área de trabalho do projeto.
- **Análise Inteligente de Layout**: Avalia a setorização dos ambientes (social, íntima e de serviço), fluxos de circulação, ergometria e insolação natural.
- **Gerador de Memorial Descritivo**: Elabora minutas técnicas formais divididas por seções (Normas de Referência, Alvenarias, Revestimentos, Esquadrias e Instalações).
- **Resumo Executivo do Projeto**: Sintetiza especificações, metragem e programa de necessidades.

---

## 2. Direção Visually & Filosofia Estética

O design do Metope AI foi concebido para parecer uma **ferramenta de trabalho profissional e técnica** (como *Autodesk Fusion*, *Zhipu GLM* e *Bielik App*), e não um aplicativo de consumo genérico.

### Princípios Norteadores
1. **Clareza e Minimalismo**: Interface limpa, organizada e funcional, priorizando o conteúdo e a produtividade do arquiteto.
2. **Monocromatismo com Acento Terracota**: Predominância de tons neutros de branco, cinza claro e preto, utilizando a cor `#BA4E20` (Terracota Arquitetônico) como cor única de destaque para ações principais e estados ativos.
3. **Hierarquia por Tipografia e Espaço**: A diferenciação visual ocorre por peso de fonte, tamanho e espaço em branco — não por cores chamativas.
4. **Densidade Técnica**: Alta densidade de informação sem poluição visual.

---

## 3. Design System & Tokens Globais

### Tipografia Exclusiva: Satoshi Variable
A plataforma utiliza exclusivamente a família tipográfica **Satoshi Variable** em toda a interface.

- **Fonte Primária**: `Satoshi, sans-serif`
- **Pesos Utilizados**:
  - `400 (Regular)`: Corpo de texto, mensagens e legendas.
  - `500 (Medium)`: Rótulos de botões, nomes de arquivos e itens de menu.
  - `600 (Semibold)`: Títulos de seções, cabeçalhos e destaques.
  - `700 (Bold)`: Pergunta principal da tela inicial e títulos H1/H2.

### Cores & Palette
```css
/* Canvas & Fundo */
--canvas-bg: #fafafa;       /* Fundo principal do chat/canvas */
--card-bg: #ffffff;         /* Fundo de cartões, modais e mensagens */
--sidebar-bg: #f8f9fa;      /* Fundo da barra lateral esquerda */

/* Bordas & Divisores */
--border-color: #e4e4e7;    /* Borda sutil de 1px */
--border-hover: #d4d4d8;    /* Borda em hover */

/* Tipografia */
--text-primary: #09090b;    /* Texto principal e títulos */
--text-secondary: #71717a;  /* Metadados, tamanhos e rótulos */
--text-muted: #a1a1aa;      /* Placeholders de busca/input */

/* Cor de Destaque (Accent) */
--accent: #BA4E20;          /* Terracota Arquitetônico (Ações principais) */
--accent-hover: #9c3f19;    /* Hover do botão principal */
--accent-light: #fdf5f2;    /* Fundo ativo sutil em seleções */
```

### Formas & Raios de Canto (Border Radius)
- `rounded-xl (12px)`: Cartões de entrada de texto, cards de atalho rápido e modais.
- `rounded-lg (8px)`: Botões principais e caixa de upload.
- `rounded-md (6px)`: Itens da lista de arquivos e campos de busca.
- `rounded-sm (4px)`: Badges de categoria e tags técnicas.

### Rolagem & Custom Scrollbar
- Nenhuma barra de rolagem nativa (com setas ou trilhas cinzas espessas) deve ficar exposta.
- Utilização da classe `.no-scrollbar` ou trilhas customizadas com largura de `4px` e tom `#e4e4e7`.

---

## 4. Estrutura dos Componentes

### 1. Barra Lateral (Sidebar)
- **Topo**: Exibe o logotipo vetorial `logo.svg` em formato compacto (`h-4.5`), presente **apenas uma vez** em toda a aplicação.
- **Upload Box**: Bloco pontilhado para upload por arrasto (drag & drop) com o texto **"Upload de Arquivos"**.
- **Lista de Arquivos**: Exibe o ícone correspondente ao tipo (`FileText`, `ImageIcon`, `FileCode`), nome do arquivo, tamanho em KB/MB e botões de ação para pré-visualização e exclusão.

### 2. Cabeçalho Superior (Header Bar)
- **Seletor de Projetos**: Botão interativo que exibe o nome do projeto ativo.
- **Dropdown de Projetos**: Ao ser clicado, abre um menu dropdown limpo exibindo:
  - Lista de projetos cadastrados com indicador de seleção.
  - Botão **`Criar Novo Projeto`** com ícone `Plus`.

### 3. Canvas de Chat (Bielik Inspired Layout)
- **Estado Inicial (Tela Limpa)**:
  - Título centralizado: **"Em que posso ajudar com seu projeto?"**
  - Caixa de texto flutuante elevada com barra de ferramentas para envio.
  - **3 Cards de Atalho Rápido** dispostos horizontalmente abaixo do campo de input:
    1. `[ Resumir projeto ]`
    2. `[ Gerar memorial descritivo ]`
    3. `[ Analisar layout ]`
- **Estado Ativo (Conversa em Andamento)**:
  - Thread contínua com pareceres técnicos da IA formatados em Markdown limpo.
  - Botão sutil de cópia de texto.
  - Entrada de mensagens fixada no rodapé sem legendas redundantes.

---

## 5. Regras de Design e Proibições Estritas

> [!CAUTION]
> **Padrões Proibidos na Interface:**
> 1. **Zero Emojis**: Estritamente proibido o uso de emojis na UI ou em mensagens geradas pelo sistema.
> 2. **Sem Badges Coloridos Decorativos**: Sem pills ou badges como "NOVO", "BETA" ou bolhas decorativas.
> 3. **Sem Gradientes**: Proibidos gradientes em fundos, textos ou botões.
> 4. **Sem Bordas Laterais Marrons / Sombras Pesadas**: Mensagens e cards utilizam apenas bordas neutras de 1px (`#e4e4e7`).
> 5. **Sem Mascote / Avatar de Robô**: A IA é representada discretamente pelo nome **METOPE AI**.
> 6. **Sem Scrollbar Nativo Exposto**: Barras de rolagem pesadas do navegador devem ser ocultadas ou estilizadas minimamente.
