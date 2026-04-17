import { OUTFIT_SCENARIO_PRESETS } from './data/outfit-scenarios.generated';
import type { OutfitScenarioPreset } from './types/outfit-scenario';

export interface OutfitScenarioOption {
  value: string;
  label: string;
  tags: string[];
}

export interface OutfitScenarioFilter {
  tags?: string[];
}

// Async signatures so the loader can later switch to SystemSetting/DB-backed
// presets without breaking callers. The MVP reads from the generated TS module.
export async function loadOutfitScenarioPresets(
  filter?: OutfitScenarioFilter,
): Promise<readonly OutfitScenarioPreset[]> {
  if (!filter?.tags?.length) return OUTFIT_SCENARIO_PRESETS;
  const wanted = new Set(filter.tags);
  return OUTFIT_SCENARIO_PRESETS.filter((p) => p.tags.some((t) => wanted.has(t)));
}

export async function findOutfitScenario(
  id: string | null | undefined,
): Promise<OutfitScenarioPreset | undefined> {
  if (!id) return undefined;
  return OUTFIT_SCENARIO_PRESETS.find((p) => p.id === id);
}

export async function getOutfitScenarioOptions(
  filter?: OutfitScenarioFilter,
): Promise<OutfitScenarioOption[]> {
  const presets = await loadOutfitScenarioPresets(filter);
  return presets.map((p) => ({ value: p.id, label: p.label, tags: [...p.tags] }));
}

export class PresetNotFoundError extends Error {
  readonly presetId: string;
  constructor(presetId: string) {
    super(`Outfit scenario preset not found: ${presetId}`);
    this.name = 'PresetNotFoundError';
    this.presetId = presetId;
  }
}
