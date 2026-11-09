# 📖 Guia de Uso e Comandos

Este guia reúne o passo a passo para operar o **Auto-Apply-Bot**, sincronizar vagas e gerenciar suas candidaturas.

---

## ⚙️ 1. Pré-Requisitos

1. **Servidor OmniRoute / LLM no ar:**
   - Endpoint: `http://192.168.1.10:20130/v1`
   - Modelo: `auto/smart`

2. **Google Chrome em modo de depuração (CDP):**
   Execute no terminal antes de iniciar o robô:
   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:USERPROFILE\.chrome-debug-profile"
   ```
   *(Faça login prévio nos sites como Gupy e LinkedIn nesta janela).*

---

## 💻 2. Comandos Principais

### Iniciar apenas o Dashboard (Recomendado para revisar e aprovar vagas)
Para abrir a interface web sem rodar o robô de preenchimento:
```powershell
cd auto-apply-bot
npm run dashboard
```
Acesse no seu navegador: **`http://localhost:3000`**

### Iniciar o Robô Completo (Navegação + Preenchimento + Dashboard)
```powershell
cd auto-apply-bot
npm start
```

### Rodar os Testes Automatizados
```powershell
npm run test:run
```

### Checagem de Tipos TypeScript
```powershell
npm run typecheck
```

---

## 🎯 3. Recursos do Dashboard (`http://localhost:3000`)

### Botões de Sincronização Rápida:
* **`[🇧🇷 Sincronizar Vagas Brasil (PT-BR)]`**:
  Consulta o catálogo do Freehire filtrando por empresas no Brasil com vagas em português.
* **`[💼 Sincronizar PJ/Freelance BR]`**:
  Busca contratos por projeto, freelance ou regime PJ no mercado nacional.
* **`[⚡ Sincronizar Remotas]`**:
  Busca oportunidades remotas em língua portuguesa.

### Abas de Filtro do Radar:
* **Todas**: Exibe todas as oportunidades mapeadas.
* **🇧🇷 Apenas PT-BR**: Mostra somente vagas com descrição em português e sem exigência de inglês fluente.
* **Aguardando Aprovação**: Vagas com score alto esperando sua decisão.
* **💼 Freelance / PJ**: Vagas com modelo de contratação por projeto/PJ.
* **Aprovadas**: Fila prioritária pronta para o robô se candidatar.

### Ações na Tabela:
* **`[✅ Aprovar]`**: Marca a vaga como `aprovado`. O robô fará o preenchimento automático.
* **`[❌ Descartar]`**: Marca a vaga como `descartado`. O robô não tocará nela.
* **`[Desfazer / Reativar]`**: Volta a vaga para a fila de decisão.
* **`[Ver Vaga ↗]`**: Abre o link direto no portal/ATS para você inspecionar.

---

## 🛡️ 4. Variáveis de Configuração (`.env`)

```ini
# Provedor LLM (OmniRoute local)
LLM_PROVIDER=openai
OPENAI_BASE_URL=http://192.168.1.10:20130/v1
OPENAI_MODEL=auto/smart
OPENAI_API_KEY=local-omniroute

# Supervisão e Segurança
REQUER_APROVACAO=true   # Garante que só vagas aprovadas por você sejam preenchidas
DRY_RUN=true            # Quando true, faz todo o fluxo mas bloqueia o clique final
SCORE_MINIMO=6          # Nota mínima de compatibilidade para entrar no Radar
LIMITE_DIARIO=10        # Máximo de candidaturas por dia
PORTA_DASHBOARD=3000    # Porta do painel web
CHROME_CDP_URL=http://127.0.0.1:9222
```

