# 📝 Histórico de Customizações e Evolução

Registro de todas as alterações arquiteturais, melhorias e novas funcionalidades implementadas no fork [`ClaudioASantana/auto-apply-bot`](https://github.com/ClaudioASantana/auto-apply-bot).

---

### 1. Migração de Ambiente & Dependências
- **Node.js 24 & SQLite:** Atualizado o pacote `better-sqlite3` para a versão `^13.0.3` (com binários pré-compilados), eliminando a necessidade de compiladores C++ locais no Windows.
- **PowerShell Profile:** Adicionados guards de proteção no `Microsoft.PowerShell_profile.ps1` para evitar erros de inicialização com ferramentas auxiliares.

### 2. Integração com OmniRoute Local (OpenAI-Compatible)
- **Suporte a Provedores LLM:** Adicionado suporte ao `LLM_PROVIDER=openai` além do Gemini nativo.
- **Tool Calling Nativo:** Criada a conversão recursiva de declarações de ferramentas MCP/Custom para o padrão JSON Schema / Function Calling da OpenAI (`obterOpenAITools`).
- **Loop de Execução:** Implementado `executarAgenteOpenAI` em `src/agente.ts` com sliding window (`podarHistoricoOpenAI`) e tolerância a endpoints sem exigência de chave de API.
- **Custo Zero:** Integrado ao `src/token-tracker.ts` para registrar custo $0,00 nos modelos locais do OmniRoute.

### 3. Sistema Human-in-the-Loop & Radar de Oportunidades
- **Banco de Dados SQLite (`src/database.ts`):**
  - Novas colunas na tabela `vagas_vistas`: `status_aprovacao` e `descricao_resumo`.
  - Funções de gestão: `listarVagasRadar()`, `atualizarStatusAprovacao()`, `obterVagasAprovadasParaAplicar()`.
  - Lazy initialization defensiva (`garantirBancoAberto()`).
- **Dashboard Interativo (`src/dashboard.ts`):**
  - Interface escura reformulada com cards de métricas em tempo real.
  - Tabela do Radar com botões interativos `[✅ Aprovar]` e `[❌ Descartar]`.
  - Rota de API POST `/api/vagas/status`.
  - Script standalone `src/dashboard-standalone.ts` e comando `npm run dashboard`.
- **Regras do Agente (`src/agente.ts` & `src/tools.ts`):**
  - Tool `verificar_vaga_aprovada`: se `REQUER_APROVACAO=true`, o agente só preenche formulários de vagas aprovadas pelo usuário no painel.

### 4. Integração com o Motor Freehire (`src/freehire.ts`)
- **Conexão com API Pública Keyless:** Consumo direto do endpoint `https://freehire.me/api/v1/jobs/search`.
- **Descoberta Rápida:** Coleta de vagas em ATSs corporativos (Greenhouse, Lever, Quickin, Gupy) sem sobrecarga de renderização no navegador.
- **Normalização de Stack:** Mapeamento automático de aliases de tecnologias (`dotnet` ➔ `.NET`, `csharp` ➔ `C#`, etc.).
- **Tool `buscar_vagas_freehire`:** Permite ao agente solicitar novas vagas ao motor a qualquer momento.

### 5. Suporte a Contratos Freelance / B2B e Vagas em PT-BR (Brasil)
- **Freelance & Contratos:**
  - Filtro por `employment_type=contract` e detecção de taxas horárias (USD/h, EUR/h, BRL/h).
  - Identificação visual no Dashboard com a badge `[Freelance/PJ]`.
  - Botão de sincronização rápida `[💼 Sincronizar PJ/Freelance BR]`.
- **Vagas Nacionais e Proteção de Idioma:**
  - Filtro por `countries=br` e detecção de língua (`posting_language: pt`).
  - Proteção eliminatória em `src/scoring.ts`: vagas que exigem inglês fluente ou avançado são automaticamente descartadas caso o candidato não tenha a fluência declarada.
  - Botão dedicado `[🇧🇷 Sincronizar Vagas Brasil (PT-BR)]` e aba de filtro `[🇧🇷 Apenas PT-BR]`.

