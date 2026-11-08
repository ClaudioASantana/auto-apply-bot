import { describe, it, expect, vi } from 'vitest';
import { buscarVagasFreehire, sincronizarFreehireNoRadar } from '../src/freehire.js';
import * as db from '../src/database.js';
import type { Perfil } from '../src/types.js';

describe('Integracao Freehire.me', () => {
  const perfilMock: Perfil = {
    nome: 'Claudio Amorim',
    email: 'claudio@example.com',
    telefone: '2199999999',
    linkedin: 'https://linkedin.com/in/claudio',
    github: 'https://github.com/claudio',
    portfolio: '',
    curriculo_path: '',
    titulo_profissional: 'Engenheiro de Software .NET Sênior',
    anos_experiencia: 15,
    stack_principal: ['.NET', 'C#', 'Azure', 'SQL Server'],
    resumo_profissional: 'Especialista em .NET Core e Cloud',
    pretensao_salarial: 'A combinar',
    modelo_trabalho: ['remoto'],
    cidade: 'Rio de Janeiro',
    disponibilidade: 'Imediata',
    palavras_chave_busca: ['.NET', 'C#'],
    nivel_ingles: 'avancado',
  };

  it('trata resposta da API e processa vagas de tecnologia', async () => {
    const mockJobs = [
      {
        public_slug: 'senior-dotnet-globant',
        source: 'greenhouse',
        url: 'https://boards.greenhouse.io/globant/jobs/12345',
        title: 'Senior .NET Developer',
        company: 'Globant',
        location: 'Remote',
        work_mode: 'remote',
        skills: ['dotnet', 'csharp', 'azure', 'sql-server'],
        enrichment: {
          summary: 'Desenvolvimento de microsserviços em .NET Core e Azure',
          seniority: 'senior',
          salary_min: 4000,
          salary_max: 6000,
          salary_currency: 'USD',
          requirements: [{ text: '5+ years .NET and C#', priority: 'required' }],
        },
      },
    ];

    // Mock global de fetch
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockJobs,
        meta: { limit: 10, offset: 0, total: 1 },
      }),
    } as Response);

    const jobs = await buscarVagasFreehire({ query: 'dotnet', work_mode: 'remote', seniority: 'senior' });
    expect(jobs.length).toBe(1);
    expect(jobs[0].title).toBe('Senior .NET Developer');
    expect(jobs[0].company).toBe('Globant');

    fetchSpy.mockRestore();
  });

  it('sincroniza vagas no radar atribuindo score alto e status pendente', async () => {
    const mockJobs = [
      {
        public_slug: 'senior-csharp-azure',
        source: 'lever',
        url: 'https://jobs.lever.co/techcorp/67890',
        title: 'Senior C# / Azure Cloud Engineer',
        company: 'TechCorp',
        location: 'Remote, US',
        work_mode: 'remote',
        skills: ['dotnet', 'csharp', 'azure', 'sql server'],
        enrichment: {
          summary: 'Backend em .NET 8 com Azure Functions e SQL Server',
          seniority: 'pleno',
          salary_min: 5000,
          salary_max: 7000,
          salary_currency: 'USD',
        },
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockJobs,
        meta: { limit: 10, offset: 0, total: 1 },
      }),
    } as Response);

    vi.spyOn(db, 'verificarVagaJaVista').mockReturnValue(false);
    const registrarSpy = vi.spyOn(db, 'registrarVagaVista').mockReturnValue(true);

    const resultado = await sincronizarFreehireNoRadar(
      { query: 'dotnet', work_mode: 'remote', seniority: 'senior', limit: 5 },
      perfilMock,
      6
    );

    expect(resultado.total).toBe(1);
    expect(resultado.novas).toBe(1);
    expect(resultado.adicionadasRadar).toBe(1);
    expect(registrarSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo_vaga: 'Senior C# / Azure Cloud Engineer',
        empresa: 'TechCorp',
        plataforma: 'Freehire (lever)',
        status_aprovacao: 'pendente',
      })
    );

    vi.restoreAllMocks();
  });
});
