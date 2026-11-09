# 🤖 Auto-Apply-Bot — Documentação do Projeto

Sistema autônomo e inteligente para busca, pontuação, filtragem e candidatura automatizada a vagas de emprego, com **supervisão humana interativa (Human-in-the-Loop)**, suporte a **LLMs locais via OmniRoute** e integração com o motor global de vagas **Freehire**.

---

## 📌 Repositórios e Links Importantes

| Recurso | URL | Descrição |
| :--- | :--- | :--- |
| **Repositório Fork (Principal)** | [`https://github.com/ClaudioASantana/auto-apply-bot`](https://github.com/ClaudioASantana/auto-apply-bot) | Versão customizada para Cláudio Amorim com Dashboard Interativo, OmniRoute e Freehire. |
| **Repositório Upstream** | [`https://github.com/LuisMIguelFurlanettoSousa/auto-apply-bot`](https://github.com/LuisMIguelFurlanettoSousa/auto-apply-bot) | Código base original do robô de candidaturas com Playwright MCP e Gemini. |
| **Freehire Engine** | [`https://github.com/strelov1/freehire`](https://github.com/strelov1/freehire) | Mecanismo open-source de busca de vagas em ATSs (Greenhouse, Lever, Workday, etc.). |
| **API Pública do Freehire** | `https://freehire.me/api/v1/jobs` | Endpoint REST para busca estruturada e keyless de vagas de tecnologia. |
| **Servidor LLM (OmniRoute)** | `http://192.168.1.10:20130/v1` | Endpoint compatível com OpenAI alimentando o raciocínio do agente com modelo `auto/smart`. |
| **Dashboard Web Local** | `http://localhost:3000` | Painel de controle, métricas, aprovação humana e radar de vagas. |
| **Chrome Debugger (CDP)** | `http://127.0.0.1:9222` | Porta de conexão do Playwright MCP no navegador do usuário. |

---

## 🧭 Índice da Documentação

1. [**Arquitetura e Fluxo do Sistema**](file:///c:/Users/claud/repos/pessoal/auto-apply-bot/docs/arquitetura-e-fluxo.md)
   - Visão dos componentes (OmniRoute, Playwright MCP, SQLite, Freehire e Dashboard).
   - Ciclo de vida de uma vaga (Descoberta ➔ Pontuação ➔ Radar ➔ Aprovação ➔ Aplicação).

2. [**Guia de Uso e Comandos**](file:///c:/Users/claud/repos/pessoal/auto-apply-bot/docs/guia-de-uso.md)
   - Como abrir o Dashboard (`npm run dashboard`).
   - Como rodar o robô no terminal (`npm start`).
   - Modos de operação: `DRY_RUN`, `REQUER_APROVACAO`, Filtros PT-BR e Freelance/PJ.

3. [**Histórico de Customizações e Evolução**](file:///c:/Users/claud/repos/pessoal/auto-apply-bot/docs/historico-de-mudancas.md)
   - Tudo o que foi adaptado e desenvolvido a partir do repositório original.
