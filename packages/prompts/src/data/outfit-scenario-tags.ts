import { OUTFIT_SCENARIO_PRESETS } from './outfit-scenarios.generated';

export interface OutfitScenarioTagInfo {
  value: string;
  count: number;
}

export function getOutfitScenarioTags(): OutfitScenarioTagInfo[] {
  const counter = new Map<string, number>();
  for (const preset of OUTFIT_SCENARIO_PRESETS) {
    for (const tag of preset.tags) {
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    }
  }
  return [...counter.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'zh'));
}
