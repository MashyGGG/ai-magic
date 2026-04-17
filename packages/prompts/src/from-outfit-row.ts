import {
  resolveImagePromptForOutfit,
  resolveVideoPromptForOutfit,
  type ResolveOutput,
} from './resolve-outfit-prompts';
import type { CharacterInput, OutfitInput } from './builders';
import type { OutfitScenarioAspectRatio, OutfitScenarioPreset } from './types/outfit-scenario';

/**
 * Lightweight subset of the Prisma `Outfit` row + relations used to derive
 * resolver inputs. Decoupled from the Prisma client types so we don't pull
 * `@ai-magic/db` into this package.
 */
export interface OutfitRowLike {
  topDesc?: string | null;
  bottomDesc?: string | null;
  shoesDesc?: string | null;
  bagDesc?: string | null;
  accessoriesDesc?: string | null;
  materialDesc?: string | null;
  colorDesc?: string | null;
  backgroundDesc?: string | null;
  sceneTemplateId?: string | null;
  cameraTemplate?: string | null;
  motionTemplate?: string | null;
  aspectRatio?: string | null;
  characterTemplate?: CharacterTemplateRowLike | null;
}

export interface CharacterTemplateRowLike {
  genderStyle?: string | null;
  ageStyle?: string | null;
  faceDesc?: string | null;
  hairDesc?: string | null;
  skinDesc?: string | null;
  bodyDesc?: string | null;
  vibeDesc?: string | null;
  referenceAssetId?: string | null;
}

export interface ResolveFromRowOptions {
  preset?: OutfitScenarioPreset | null;
  hasReferenceAsset?: boolean;
}

export interface ResolveFromRowOutput {
  promptText: string;
  promptJson: ResolveOutput['json'];
}

function nz(v: string | null | undefined): string | undefined {
  return v == null || v === '' ? undefined : v;
}

function asAspectRatio(v: string | null | undefined): OutfitScenarioAspectRatio | undefined {
  if (v === '9:16' || v === '16:9' || v === '1:1') return v;
  return undefined;
}

function toCharacterInput(row: CharacterTemplateRowLike | null | undefined): CharacterInput {
  if (!row) return {};
  return {
    genderStyle: nz(row.genderStyle),
    ageStyle: nz(row.ageStyle),
    faceDesc: nz(row.faceDesc),
    hairDesc: nz(row.hairDesc),
    skinDesc: nz(row.skinDesc),
    bodyDesc: nz(row.bodyDesc),
    vibeDesc: nz(row.vibeDesc),
  };
}

function toOutfitInput(row: OutfitRowLike): OutfitInput {
  return {
    topDesc: nz(row.topDesc),
    bottomDesc: nz(row.bottomDesc),
    shoesDesc: nz(row.shoesDesc),
    bagDesc: nz(row.bagDesc),
    accessoriesDesc: nz(row.accessoriesDesc),
    materialDesc: nz(row.materialDesc),
    colorDesc: nz(row.colorDesc),
  };
}

export function resolveImagePromptFromOutfitRow(
  outfit: OutfitRowLike,
  options: ResolveFromRowOptions = {},
): ResolveFromRowOutput {
  const hasReferenceAsset =
    options.hasReferenceAsset ?? Boolean(outfit.characterTemplate?.referenceAssetId);

  const out = resolveImagePromptForOutfit({
    preset: options.preset ?? undefined,
    character: toCharacterInput(outfit.characterTemplate),
    outfit: toOutfitInput(outfit),
    hasReferenceAsset,
    cameraId: nz(outfit.cameraTemplate),
    sceneTemplateId: nz(outfit.sceneTemplateId),
    backgroundDesc: nz(outfit.backgroundDesc),
    aspectRatioOverride: asAspectRatio(outfit.aspectRatio),
  });

  return { promptText: out.text, promptJson: out.json };
}

export function resolveVideoPromptFromOutfitRow(
  outfit: OutfitRowLike,
  options: ResolveFromRowOptions = {},
): ResolveFromRowOutput {
  const out = resolveVideoPromptForOutfit({
    preset: options.preset ?? undefined,
    motionId: nz(outfit.motionTemplate),
    cameraId: nz(outfit.cameraTemplate),
    backgroundDesc: nz(outfit.backgroundDesc),
    aspectRatioOverride: asAspectRatio(outfit.aspectRatio),
  });

  return { promptText: out.text, promptJson: out.json };
}
