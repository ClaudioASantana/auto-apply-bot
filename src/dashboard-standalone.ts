import 'dotenv/config';
import { inicializarBanco } from './database.js';
import { iniciarDashboard } from './dashboard.js';
import { inicializarLogger, log } from './logger.js';

inicializarLogger();
inicializarBanco();

const port = parseInt(process.env.DASHBOARD_PORT || '3000', 10);
iniciarDashboard(port);

log('INFO', '============================================================');
log('INFO', '  JOB BOT - Painel de Controle e Radar Standalone');
log('INFO', '============================================================');
log('INFO', `Dashboard interativo ativo em http://localhost:${port}`);
log('INFO', 'Acesse no navegador para revisar, aprovar ou descartar vagas.');
log('INFO', 'Pressione Ctrl+C para encerrar.');

process.on('SIGINT', () => {
  log('INFO', 'Encerrando dashboard...');
  process.exit(0);
});

