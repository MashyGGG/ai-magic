import type { AiProvider } from './types';

const registry = new Map<string, AiProvider>();

export function registerProvider(provider: AiProvider) {
  registry.set(provider.name, provider);
}

export function getProvider(name: string): AiProvider {
  const provider = registry.get(name);
  if (!provider) {
    throw new Error(`Provider "${name}" is not registered. Available: ${[...registry.keys()].join(', ')}`);
  }
  return provider;
}

export function listProviders(): string[] {
  return [...registry.keys()];
}
