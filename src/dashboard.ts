import http from 'http';
import {
  listarCandidaturas,
  obterEstatisticas,
  listarVagasRadar,
  atualizarStatusAprovacao,
  type VagaRadar,
} from './database.js';
import { log } from './logger.js';

let server: http.Server | null = null;

export function escaparHtml(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizarUrl(url: unknown): string {
  const s = String(url ?? '');
  return /^https?:\/\//i.test(s) ? escaparHtml(s) : '#';
}

function gerarHTML(): string {
  const stats = obterEstatisticas();
  const candidaturas = listarCandidaturas(100);
  const radarVagas = listarVagasRadar(100);

  const pendentesCount = radarVagas.filter(v => v.status_aprovacao === 'pendente' && v.score >= 6).length;
  const aprovadasCount = radarVagas.filter(v => v.status_aprovacao === 'aprovado').length;
  const totalRadar = radarVagas.length;

  const linhasRadar = radarVagas.map(v => {
    const scoreClass = v.score >= 7 ? 'high' : v.score >= 5 ? 'mid' : 'low';
    let acoesHtml = '';

    if (v.status_aprovacao === 'pendente') {
      acoesHtml = `
        <button class="btn btn-approve" onclick="alterarStatus(${v.id}, 'aprovado')">✅ Aprovar</button>
        <button class="btn btn-discard" onclick="alterarStatus(${v.id}, 'descartado')">❌ Descartar</button>
      `;
    } else if (v.status_aprovacao === 'aprovado') {
      acoesHtml = `
        <span class="badge badge-approved">Aprovada</span>
        <button class="btn btn-undo" onclick="alterarStatus(${v.id}, 'pendente')">Desfazer</button>
      `;
    } else if (v.status_aprovacao === 'descartado') {
      acoesHtml = `
        <span class="badge badge-discarded">Descartada</span>
        <button class="btn btn-undo" onclick="alterarStatus(${v.id}, 'pendente')">Reativar</button>
      `;
    } else {
      acoesHtml = `<span class="badge badge-applied">Aplicada</span>`;
    }

    const motivoHtml = v.motivo_pulo ? `<div class="sub-info">${escaparHtml(v.motivo_pulo)}</div>` : '';

    return `
      <tr class="radar-row status-${v.status_aprovacao}">
        <td>${escaparHtml(v.data_vista)}</td>
        <td><span class="platform-tag">${escaparHtml(v.plataforma || 'Web')}</span></td>
        <td><strong>${escaparHtml(v.empresa || 'Empresa')}</strong></td>
        <td>
          <div class="job-title">${escaparHtml(v.titulo_vaga || 'Vaga identificada')}</div>
          ${motivoHtml}
        </td>
        <td><span class="score ${scoreClass}">${v.score}</span></td>
        <td><div class="actions-cell">${acoesHtml}</div></td>
        <td><a href="${sanitizarUrl(v.url)}" target="_blank" rel="noopener noreferrer" class="link-open">Ver Vaga ↗</a></td>
      </tr>
    `;
  }).join('');

  const linhasCandidaturas = candidaturas.map(c => `
    <tr>
      <td>${escaparHtml(c.data_aplicacao)}</td>
      <td>${escaparHtml(c.plataforma)}</td>
      <td>${escaparHtml(c.empresa)}</td>
      <td>${escaparHtml(c.titulo_vaga)}</td>
      <td><span class="score ${c.score && c.score >= 7 ? 'high' : c.score && c.score >= 5 ? 'mid' : 'low'}">${c.score || '-'}</span></td>
      <td><span class="status ${escaparHtml(c.status)}">${escaparHtml(c.status)}</span></td>
      <td>${escaparHtml(c.resultado ?? 'aguardando')}</td>
      <td><a href="${sanitizarUrl(c.url)}" target="_blank" rel="noopener noreferrer" class="link-open">Ver ↗</a></td>
    </tr>
  `).join('');

  const plataformasRows = stats.porPlataforma.map(p => `
    <div class="stat-card">
      <div class="stat-value">${p.total}</div>
      <div class="stat-label">${escaparHtml(p.plataforma)}</div>
      <div class="stat-sub">Score medio: ${p.score_medio ? p.score_medio.toFixed(1) : '-'}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Job Bot - Painel de Controle e Radar</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b1120; color: #e2e8f0; padding: 24px; }
  h1 { font-size: 26px; margin-bottom: 20px; color: #f8fafc; display: flex; align-items: center; gap: 10px; }
  h2 { font-size: 18px; margin: 32px 0 16px 0; color: #38bdf8; display: flex; align-items: center; justify-content: space-between; }
  
  .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat-card { background: #1e293b; border-radius: 12px; padding: 18px 22px; min-width: 170px; border: 1px solid #334155; }
  .stat-card.highlight { border-color: #38bdf8; background: #0f2847; }
  .stat-card.warning { border-color: #f59e0b; background: #2a1f0a; }
  .stat-card.success { border-color: #10b981; background: #062b1e; }
  .stat-value { font-size: 32px; font-weight: 700; color: #f8fafc; }
  .stat-label { font-size: 13px; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .stat-sub { font-size: 12px; color: #cbd5e1; margin-top: 4px; }

  .filter-bar { display: flex; gap: 8px; margin-bottom: 16px; }
  .filter-btn { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 6px 14px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
  .filter-btn:hover { background: #334155; color: #fff; }
  .filter-btn.active { background: #0284c7; border-color: #38bdf8; color: #fff; font-weight: 600; }

  table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; margin-bottom: 24px; }
  th { background: #1e293b; padding: 14px 16px; text-align: left; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #334155; }
  td { padding: 12px 16px; border-top: 1px solid #334155; font-size: 14px; vertical-align: middle; }
  tr:hover { background: #243248; }

  .job-title { font-weight: 600; color: #f1f5f9; }
  .sub-info { font-size: 12px; color: #94a3b8; margin-top: 4px; }
  .platform-tag { background: #334155; color: #e2e8f0; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }

  .score { display: inline-block; width: 32px; height: 32px; line-height: 32px; text-align: center; border-radius: 50%; font-size: 13px; font-weight: 700; }
  .score.high { background: #065f46; color: #34d399; border: 1px solid #059669; }
  .score.mid { background: #78350f; color: #fbbf24; border: 1px solid #d97706; }
  .score.low { background: #7f1d1d; color: #f87171; border: 1px solid #dc2626; }

  .actions-cell { display: flex; gap: 8px; align-items: center; }
  .btn { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.15s, transform 0.1s; }
  .btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }
  .btn-approve { background: #059669; color: #ffffff; }
  .btn-discard { background: #475569; color: #cbd5e1; }
  .btn-undo { background: transparent; border: 1px solid #475569; color: #94a3b8; padding: 4px 8px; font-size: 11px; }

  .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block; }
  .badge-approved { background: #064e3b; color: #6ee7b7; border: 1px solid #059669; }
  .badge-discarded { background: #1e293b; color: #64748b; border: 1px solid #334155; }
  .badge-applied { background: #1e3a8a; color: #93c5fd; border: 1px solid #2563eb; }

  .status { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .status.aplicado { background: #166534; color: #4ade80; }
  .status.dry-run { background: #1e40af; color: #93c5fd; }
  
  .link-open { color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 500; }
  .link-open:hover { text-decoration: underline; color: #7dd3fc; }
  .empty { text-align: center; padding: 36px; color: #64748b; font-size: 14px; }
  .toast { position: fixed; bottom: 20px; right: 20px; background: #0f766e; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: none; z-index: 100; }
</style>
</head>
<body>
  <h1>🎯 Job Bot - Painel de Controle</h1>

  <div class="stats">
    <div class="stat-card warning">
      <div class="stat-value" id="count-pendentes">${pendentesCount}</div>
      <div class="stat-label">Aguardando Sua Aprovação</div>
      <div class="stat-sub">Vagas com score ≥ 6</div>
    </div>
    <div class="stat-card success">
      <div class="stat-value" id="count-aprovadas">${aprovadasCount}</div>
      <div class="stat-label">Aprovadas para Aplicação</div>
      <div class="stat-sub">Fila pronta</div>
    </div>
    <div class="stat-card highlight">
      <div class="stat-value">${totalRadar}</div>
      <div class="stat-label">Total no Radar</div>
      <div class="stat-sub">Vagas avaliadas pelo robô</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.hoje.total}</div>
      <div class="stat-label">Candidaturas Hoje</div>
      <div class="stat-sub">Score médio: ${stats.hoje.score_medio ? stats.hoje.score_medio.toFixed(1) : '-'}</div>
    </div>
    ${plataformasRows}
  </div>

  <h2>
    <span>🎯 Radar de Oportunidades (Aprovação Interativa)</span>
    <span style="font-size: 13px; color: #94a3b8; font-weight: normal;">Aprove as vagas para o bot preencher as candidaturas</span>
  </h2>

  <div class="filter-bar">
    <button class="filter-btn active" onclick="filtrar('todas')">Todas (${totalRadar})</button>
    <button class="filter-btn" onclick="filtrar('pendente')">Aguardando Aprovação (${pendentesCount})</button>
    <button class="filter-btn" onclick="filtrar('aprovado')">Aprovadas (${aprovadasCount})</button>
  </div>

  ${radarVagas.length > 0 ? `
  <table id="tabela-radar">
    <thead>
      <tr>
        <th style="width: 130px;">Data</th>
        <th style="width: 100px;">Portal</th>
        <th style="width: 180px;">Empresa</th>
        <th>Vaga & Requisitos</th>
        <th style="width: 70px;">Score</th>
        <th style="width: 220px;">Sua Decisão</th>
        <th style="width: 100px;">Acesso</th>
      </tr>
    </thead>
    <tbody>
      ${linhasRadar}
    </tbody>
  </table>
  ` : '<div class="empty">Nenhuma vaga mapeada no radar ainda. Inicie o bot para escanear os portais.</div>'}

  <h2>📋 Histórico de Candidaturas Realizadas / Simuladas</h2>

  ${candidaturas.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Portal</th>
        <th>Empresa</th>
        <th>Vaga</th>
        <th>Score</th>
        <th>Status</th>
        <th>Resultado</th>
        <th>Link</th>
      </tr>
    </thead>
    <tbody>
      ${linhasCandidaturas}
    </tbody>
  </table>
  ` : '<div class="empty">Nenhuma candidatura concluída ainda.</div>'}

  <div id="toast" class="toast">Status atualizado com sucesso!</div>

  <script>
    async function alterarStatus(id, novoStatus) {
      try {
        const resp = await fetch('/api/vagas/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: novoStatus })
        });
        const data = await resp.json();
        if (data.sucesso) {
          mostrarToast('Vaga atualizada para: ' + novoStatus.toUpperCase());
          setTimeout(() => location.reload(), 500);
        }
      } catch (err) {
        alert('Erro ao atualizar status: ' + err.message);
      }
    }

    function mostrarToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 2000);
    }

    function filtrar(tipo) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      const rows = document.querySelectorAll('.radar-row');
      rows.forEach(r => {
        if (tipo === 'todas') {
          r.style.display = '';
        } else {
          r.style.display = r.classList.contains('status-' + tipo) ? '' : 'none';
        }
      });
    }

    // Auto-refresh a cada 40 segundos se não houver interação recente
    let autoRefresh = setTimeout(() => { location.reload(); }, 40000);
    document.addEventListener('click', () => {
      clearTimeout(autoRefresh);
      autoRefresh = setTimeout(() => { location.reload(); }, 40000);
    });
  </script>
</body>
</html>`;
}

export function iniciarDashboard(port: number): void {
  if (server) return;

  const srv = http.createServer(async (req, res) => {
    // Rota da API para aprovação / descarte de vagas
    if (req.method === 'POST' && req.url === '/api/vagas/status') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const dados = JSON.parse(body) as { id: number; status: 'pendente' | 'aprovado' | 'descartado' | 'aplicado' };
          const ok = atualizarStatusAprovacao(dados.id, dados.status);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sucesso: ok }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sucesso: false, erro: String(err) }));
        }
      });
      return;
    }

    // Página HTML do dashboard
    try {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(gerarHTML());
    } catch {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
      });
      res.end('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Job Bot</title><style>body{background:#0b1120;color:#e2e8f0;font-family:sans-serif;padding:24px;}</style></head><body><h2>Execucao finalizada</h2><p>O banco de dados foi encerrado. Inicie o bot novamente com "npm start" para nova execucao.</p></body></html>');
    }
  });

  srv.on('error', (err) => {
    log('ERRO', `Dashboard: falha na porta ${port} — ${err.message}`);
    server = null;
  });

  srv.listen(port, '127.0.0.1', () => {
    log('INFO', `Dashboard rodando em http://localhost:${port}`);
  });

  server = srv;
}

export function pararDashboard(): void {
  if (server) {
    server.close();
    server = null;
  }
}
