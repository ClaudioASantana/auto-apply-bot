import { describe, it, expect } from 'vitest';
import { obterOpenAITools } from '../src/tools.js';

describe('Suporte ao OmniRoute / OpenAI-compatible', () => {
  it('converte MCP tools e custom tools para o formato de function calling da OpenAI', () => {
    const fakeMcpTools = [
      {
        name: 'browser_navigate',
        description: 'Navega para uma URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL de destino' },
          },
          required: ['url'],
        },
      },
    ];

    const tools = obterOpenAITools(fakeMcpTools);

    // Deve conter a tool do MCP
    const navTool = tools.find(t => t.function.name === 'browser_navigate');
    expect(navTool).toBeDefined();
    expect(navTool?.type).toBe('function');
    expect(navTool?.function.description).toBe('Navega para uma URL');

    // Deve conter as custom tools (ex: obter_perfil_candidato)
    const perfilTool = tools.find(t => t.function.name === 'obter_perfil_candidato');
    expect(perfilTool).toBeDefined();
    expect(perfilTool?.type).toBe('function');

    // Os types nos parameters devem estar em minúsculas (compatível com JSON Schema)
    const params = perfilTool?.function.parameters as { type?: string };
    expect(params?.type).toBe('object');
  });
});
