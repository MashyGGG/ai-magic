export type OutfitScenarioAspectRatio = '9:16' | '16:9' | '1:1';

export interface OutfitScenarioVisualSegments {
  character: string;
  outfit: string;
  style: string;
  composition: string;
  scene: string;
  lighting: string;
}

export interface OutfitScenarioVideoSegments {
  motion: string;
  camera: string;
  detail: string;
  background: string;
}

export interface OutfitScenarioPreset {
  id: string;
  index: number;
  label: string;
  tags: string[];
  aspectRatio: OutfitScenarioAspectRatio;
  recommendedDuration?: number;
  version: number;
  image: OutfitScenarioVisualSegments;
  video: OutfitScenarioVideoSegments;
}

export interface OutfitScenarioPromptSnapshot {
  presetId: string;
  presetVersion: number;
  aspectRatio: OutfitScenarioAspectRatio;
  image: OutfitScenarioVisualSegments;
  video: OutfitScenarioVideoSegments;
}
