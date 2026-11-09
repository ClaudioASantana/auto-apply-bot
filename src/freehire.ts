import { log } from './logger.js';
import { registrarVagaVista, verificarVagaJaVista } from './database.js';
import { pontuarVaga } from './scoring.js';
import type { Perfil } from './types.js';

export interface FreehireJobItem {
  public_slug: string;
  source: string;
  url: string;
  title: string;
  company: string;
  location?: string;
  work_mode?: string;
  skills?: string[];
  engagement?: string[];
  countries?: string[];
  enrichment?: {
    summary?: string;
    seniority?: string;
    employment_type?: string;
    posting_language?: string;
    english_level?: string;
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
    salary_period?: string;
    requirements?: Array<{ text: string; priority: string }>;
  };
}

export interface FreehireFiltros {
  query?: string;
  work_mode?: 'remote' | 'hybrid' | 'onsite';
  seniority?: 'senior' | 'mid' | 'junior' | 'lead';
  employment_type?: 'contract' | 'freelance' | 'full_time' | 'part_time';
  country?: string;
  apenasBrasil?: boolean;
  apenasPtBr?: boolean;
  apenasFreelance?: boolean;
  limit?: number;
}

export interface FreehireResponse {
  data: FreehireJobItem[];
  meta: {
    limit: number;
    offset: number;
    total: number;
  };
}

/**
 * Busca vagas na API pública keyless do Freehire.me
 */
export async function buscarVagasFreehire(filtros: FreehireFiltros = {}): Promise<FreehireJobItem[]> {
  const url = new URL('https://freehire.me/api/v1/jobs/search');
  url.searchParams.set('q', filtros.query ?? 'dotnet');
  if (filtros.work_mode) url.searchParams.set('work_mode', filtros.work_mode);
  if (filtros.seniority) url.searchParams.set('seniority', filtros.seniority);
  if (filtros.employment_type) {
    url.searchParams.set('employment_type', filtros.employment_type);
  } else if (filtros.apenasFreelance) {
    url.searchParams.set('employment_type', 'contract');
  }
  if (filtros.country) {
    url.searchParams.set('countries', filtros.country);
  } else if (filtros.apenasBrasil || filtros.apenasPtBr) {
    url.searchParams.set('countries', 'br');
  }
  url.searchParams.set('limit', String(filtros.limit ?? 15));

  log('INFO', `[Freehire] Consultando API: ${url.toString()}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'JobBot-AutoApply/1.0',
      },
    });

    if (!res.ok) {
      throw new Error(`Freehire HTTP ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as FreehireResponse;
    log('INFO', `[Freehire] ${json.data?.length ?? 0} vagas encontradas no catálogo (total disponível: ${json.meta?.total ?? 0})`);
    return json.data || [];
  } catch (error) {
    log('WARN', `[Freehire] Falha ao consultar API: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sincroniza vagas do Freehire direto para o Radar de Oportunidades (vagas_vistas).
 */
export async function sincronizarFreehireNoRadar(
  filtros: FreehireFiltros,
  perfil: Perfil,
  scoreMinimo: number = 6
): Promise<{ total: number; novas: number; adicionadasRadar: number }> {
  const vagas = await buscarVagasFreehire(filtros);

  let novas = 0;
  let adicionadasRadar = 0;

  for (const v of vagas) {
    try {
      if (!v.url || !v.title) continue;

      // Remove parâmetros de rastreamento da URL se desejado
      const urlLimpa = v.url.split('?utm_source')[0] || v.url;

      if (verificarVagaJaVista(urlLimpa) || verificarVagaJaVista(v.url)) {
        continue;
      }
      novas++;

      // Extrai tecnologias pedidas e normaliza aliases comuns
      const skillsNormalizadas = (v.skills || []).map(s => {
        const low = s.toLowerCase();
        if (low === 'dotnet') return '.NET';
        if (low === 'csharp') return 'C#';
        return s;
      });
      const techs = skillsNormalizadas.join(', ');
      const reqs = (v.enrichment?.requirements || []).map(r => r.text).join('; ');
      const tecnologiasPedidas = [v.title, techs, reqs].filter(Boolean).join(' | ');

      // Identifica idioma da vaga
      const ehBrasil = (v.countries || []).includes('br') || /brasil|brazil|s[aã]o paulo|rio de janeiro/i.test(v.location || '');
      const postingLang = v.enrichment?.posting_language;
      const ehPtBr = postingLang === 'pt' || ehBrasil || /[ãõáéíóúêç]/i.test(v.title + ' ' + (v.enrichment?.summary || ''));

      // Se o filtro exigir apenas vagas em português e a vaga for em outro idioma
      if (filtros.apenasPtBr && !ehPtBr) {
        continue;
      }

      // Detecta nível de inglês exigido pela vaga
      let idiomaExigido: string | undefined = undefined;
      if (v.enrichment?.english_level) {
        const el = v.enrichment.english_level.toLowerCase();
        if (el === 'c1' || el === 'c2' || el === 'fluent') idiomaExigido = 'fluente';
        else if (el === 'b2') idiomaExigido = 'avancado';
        else if (el === 'b1') idiomaExigido = 'intermediario';
        else if (el === 'a1' || el === 'a2') idiomaExigido = 'basico';
      } else if (/\b(ingl[eê]s fluente|fluent english|english required|advanced english|english c1|english b2)\b/i.test(v.title + ' ' + reqs)) {
        idiomaExigido = 'avancado';
      }

      // Pontua vaga contra o perfil (aplica eliminatório de idioma se vaga exigir inglês além do básico)
      const avaliacao = pontuarVaga(
        {
          tecnologias_pedidas: tecnologiasPedidas,
          senioridade: v.enrichment?.seniority || 'senior',
          modelo_trabalho: v.work_mode || 'remoto',
          localizacao: v.location,
          idioma_exigido: idiomaExigido,
        },
        {
          stackPrincipal: perfil.stack_principal || [],
          cidade: perfil.cidade || '',
          modelosAceitos: perfil.modelo_trabalho || ['remoto'],
          nivelIngles: perfil.nivel_ingles || 'basico',
        },
        scoreMinimo
      );

      // Identifica se a vaga é Freelance / Contrato / B2B
      const ehFreelance =
        v.enrichment?.employment_type === 'contract' ||
        v.enrichment?.employment_type === 'freelance' ||
        (v.engagement || []).includes('b2b') ||
        v.enrichment?.salary_period === 'hour' ||
        /\b(freelance|contractor|b2b|fixed-term|short-term|pj)\b/i.test(v.title + ' ' + (v.enrichment?.summary || ''));

      // Formata faixa salarial e dados
      let salarioStr = '';
      if (v.enrichment?.salary_min || v.enrichment?.salary_max) {
        const min = v.enrichment.salary_min ?? '';
        const max = v.enrichment.salary_max ?? '';
        const moeda = v.enrichment.salary_currency ?? (ehBrasil ? 'BRL' : 'USD');
        const periodo = v.enrichment.salary_period ?? (ehFreelance ? 'h' : 'mês');
        salarioStr = ` | Salário: ${min ? min : ''}${min && max ? ' - ' : ''}${max} ${moeda}/${periodo}`;
      }

      const tagIdioma = ehPtBr ? '[PT-BR] ' : '';
      const tagFreelance = ehFreelance ? '[FREELANCE/PJ] ' : '';
      const modoTrabalho = v.work_mode ? `[${v.work_mode.toUpperCase()}] ` : '';
      const localizacao = v.location ? `(${v.location})` : '';
      const resumo = `${tagIdioma}${tagFreelance}${modoTrabalho}${localizacao}${salarioStr} ${v.enrichment?.summary || ''}`.trim();

      const plataformaLabel = `Freehire (${v.source || 'ATS'})${ehPtBr ? ' [PT-BR]' : ''}${ehFreelance ? ' [PJ/Freelance]' : ''}`;

      const gravou = registrarVagaVista({
        url: urlLimpa,
        titulo_vaga: v.title,
        empresa: v.company || 'Confidencial',
        plataforma: plataformaLabel,
        score: avaliacao.score,
        motivo_pulo: avaliacao.veredicto === 'PULAR' ? avaliacao.motivo : undefined,
        status_aprovacao: avaliacao.score >= scoreMinimo ? 'pendente' : 'descartado',
        descricao_resumo: resumo,
      });

      if (gravou && avaliacao.score >= scoreMinimo) {
        adicionadasRadar++;
      }
    } catch (itemErr) {
      log('WARN', `[Freehire] Erro ao processar vaga ${v.title}: ${itemErr instanceof Error ? itemErr.message : String(itemErr)}`);
    }
  }

  log(
    'INFO',
    `[Freehire] Sincronização concluída: ${vagas.length} buscadas, ${novas} inéditas, ${adicionadasRadar} adicionadas à fila de aprovação (Score >= ${scoreMinimo}).`
  );

  return { total: vagas.length, novas, adicionadasRadar };
}
