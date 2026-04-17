import {
  buildImagePrompt,
  buildVideoPrompt,
  type CharacterInput,
  type OutfitInput,
} from './builders';
import { findCamera, findMotion, findScene } from './templates';
import type { OutfitScenarioAspectRatio, OutfitScenarioPreset } from './types/outfit-scenario';

export type SegmentSource =
  | 'preset'
  | 'character_template'
  | 'user'
  | 'scene_template'
  | 'camera_template'
  | 'motion_template'
  | 'reference_image'
  | 'fallback';

export interface ResolvedSegment {
  text: string;
  source: SegmentSource;
}

export interface ResolveOutput {
  text: string;
  json: {
    mode: 'preset' | 'modular';
    presetId?: string;
    presetVersion?: number;
    aspectRatio: string;
    segments: Record<string, ResolvedSegment>;
  };
}

export interface ResolveImageInput {
  preset?: OutfitScenarioPreset;
  character?: CharacterInput;
  hasReferenceAsset?: boolean;
  outfit?: OutfitInput;
  cameraId?: string;
  sceneTemplateId?: string;
  backgroundDesc?: string;
  aspectRatioOverride?: OutfitScenarioAspectRatio;
}

export interface ResolveVideoInput {
  preset?: OutfitScenarioPreset;
  motionId?: string;
  cameraId?: string;
  backgroundDesc?: string;
  aspectRatioOverride?: OutfitScenarioAspectRatio;
}

const QUALITY_LINE =
  'high quality fashion photography, sharp details, realistic fabric textures, professional lighting, commercial lookbook style';
const STABILITY_LINE =
  'consistent face, stable body proportions, accurate garment silhouette, no distortion';
const REFERENCE_CONSTRAINT =
  'Keep the model identical to the provided reference image; preserve face, hairstyle and body proportions exactly.';

const VIDEO_START_LINE = 'The model begins in a natural standing pose';
const VIDEO_CLOTHING_LINE =
  'Clothing remains stable with accurate silhouette, no warping or morphing of fabric';
const VIDEO_FACE_LINE = 'Face remains consistent throughout, no drift or distortion';
const VIDEO_BG_LINE = 'Background stays clean and consistent, no flickering';
const VIDEO_RHYTHM_LINE = 'Smooth natural movement, slow and elegant pace';

function describeCharacterFromTemplate(c: CharacterInput): string | null {
  const charParts: string[] = [];
  if (c.genderStyle) charParts.push(c.genderStyle);
  if (c.ageStyle) charParts.push(`age around ${c.ageStyle}`);
  if (c.bodyDesc) charParts.push(c.bodyDesc);
  if (c.vibeDesc) charParts.push(`${c.vibeDesc} vibe`);

  const faceParts: string[] = [];
  if (c.faceDesc) faceParts.push(c.faceDesc);
  if (c.hairDesc) faceParts.push(c.hairDesc);
  if (c.skinDesc) faceParts.push(c.skinDesc);

  if (charParts.length === 0 && faceParts.length === 0) return null;

  const out: string[] = [];
  if (charParts.length > 0) out.push(`A fashion model, ${charParts.join(', ')}`);
  if (faceParts.length > 0) out.push(faceParts.join(', '));
  return out.join('. ');
}

function describeOutfitFromUser(o: OutfitInput): string | null {
  const outfitParts: string[] = [];
  if (o.topDesc) outfitParts.push(o.topDesc);
  if (o.bottomDesc) outfitParts.push(o.bottomDesc);
  if (o.shoesDesc) outfitParts.push(o.shoesDesc);
  if (o.bagDesc) outfitParts.push(o.bagDesc);
  if (o.accessoriesDesc) outfitParts.push(o.accessoriesDesc);

  const matParts: string[] = [];
  if (o.materialDesc) matParts.push(o.materialDesc);
  if (o.colorDesc) matParts.push(`color palette: ${o.colorDesc}`);

  if (outfitParts.length === 0 && matParts.length === 0) return null;

  const out: string[] = [];
  if (outfitParts.length > 0) out.push(`Wearing: ${outfitParts.join(', ')}`);
  if (matParts.length > 0) out.push(matParts.join(', '));
  return out.join('. ');
}

function joinSegments(segments: Record<string, ResolvedSegment>): string {
  const ordered = Object.values(segments)
    .map((s) => s.text.trim())
    .filter(Boolean);
  return ordered.join('. ').replace(/\.\s*\.+/g, '.') + (ordered.length ? '.' : '');
}

export function resolveImagePromptForOutfit(input: ResolveImageInput): ResolveOutput {
  const {
    preset,
    character,
    hasReferenceAsset,
    outfit,
    cameraId,
    sceneTemplateId,
    backgroundDesc,
    aspectRatioOverride,
  } = input;

  // No preset -> backwards-compatible modular pipeline (delegates to builders).
  if (!preset) {
    const built = buildImagePrompt({
      character: character ?? {},
      outfit: outfit ?? {},
      cameraId,
      sceneId: sceneTemplateId,
      backgroundDesc,
    });
    const segments: Record<string, ResolvedSegment> = {};
    for (const [key, text] of Object.entries(built.json)) {
      segments[key] = { text, source: 'user' };
    }
    return {
      text: built.text,
      json: {
        mode: 'modular',
        aspectRatio: aspectRatioOverride ?? '9:16',
        segments,
      },
    };
  }

  const segments: Record<string, ResolvedSegment> = {};

  const characterFromTemplate = character ? describeCharacterFromTemplate(character) : null;
  segments.character = characterFromTemplate
    ? { text: characterFromTemplate, source: 'character_template' }
    : { text: preset.image.character, source: 'preset' };

  if (hasReferenceAsset) {
    segments.referenceConstraint = { text: REFERENCE_CONSTRAINT, source: 'reference_image' };
  }

  const outfitFromUser = outfit ? describeOutfitFromUser(outfit) : null;
  segments.outfit = outfitFromUser
    ? { text: outfitFromUser, source: 'user' }
    : { text: preset.image.outfit, source: 'preset' };

  segments.style = { text: preset.image.style, source: 'preset' };
  segments.composition = { text: preset.image.composition, source: 'preset' };

  const sceneTemplate = sceneTemplateId ? findScene(sceneTemplateId) : undefined;
  if (sceneTemplate) {
    segments.scene = { text: sceneTemplate.prompt, source: 'scene_template' };
  } else if (backgroundDesc) {
    segments.scene = { text: backgroundDesc, source: 'user' };
  } else {
    segments.scene = { text: preset.image.scene, source: 'preset' };
  }

  segments.lighting = { text: preset.image.lighting, source: 'preset' };

  const cameraTemplate = cameraId ? findCamera(cameraId) : undefined;
  if (cameraTemplate) {
    segments.camera = { text: cameraTemplate.prompt, source: 'camera_template' };
  }

  segments.quality = { text: QUALITY_LINE, source: 'fallback' };
  segments.stability = { text: STABILITY_LINE, source: 'fallback' };

  return {
    text: joinSegments(segments),
    json: {
      mode: 'preset',
      presetId: preset.id,
      presetVersion: preset.version,
      aspectRatio: aspectRatioOverride ?? preset.aspectRatio,
      segments,
    },
  };
}

export function resolveVideoPromptForOutfit(input: ResolveVideoInput): ResolveOutput {
  const { preset, motionId, cameraId, backgroundDesc, aspectRatioOverride } = input;

  if (!preset) {
    const built = buildVideoPrompt({
      motionId,
      cameraId,
      sceneDesc: backgroundDesc,
    });
    const segments: Record<string, ResolvedSegment> = {};
    for (const [key, text] of Object.entries(built.json)) {
      segments[key] = { text, source: 'user' };
    }
    return {
      text: built.text,
      json: {
        mode: 'modular',
        aspectRatio: aspectRatioOverride ?? '9:16',
        segments,
      },
    };
  }

  const segments: Record<string, ResolvedSegment> = {};

  segments.start = { text: VIDEO_START_LINE, source: 'fallback' };

  const motionTemplate = motionId ? findMotion(motionId) : undefined;
  if (motionTemplate) {
    segments.motion = { text: motionTemplate.prompt, source: 'motion_template' };
  } else {
    segments.motion = { text: preset.video.motion, source: 'preset' };
  }

  const cameraTemplate = cameraId ? findCamera(cameraId) : undefined;
  if (cameraTemplate) {
    segments.camera = { text: `Camera: ${cameraTemplate.prompt}`, source: 'camera_template' };
  } else {
    segments.camera = { text: preset.video.camera, source: 'preset' };
  }

  segments.detail = { text: preset.video.detail, source: 'preset' };

  if (backgroundDesc) {
    segments.background = { text: backgroundDesc, source: 'user' };
  } else {
    segments.background = { text: preset.video.background, source: 'preset' };
  }

  segments.clothingStability = { text: VIDEO_CLOTHING_LINE, source: 'fallback' };
  segments.faceStability = { text: VIDEO_FACE_LINE, source: 'fallback' };
  segments.bgStability = { text: VIDEO_BG_LINE, source: 'fallback' };
  segments.rhythm = { text: VIDEO_RHYTHM_LINE, source: 'fallback' };

  return {
    text: joinSegments(segments),
    json: {
      mode: 'preset',
      presetId: preset.id,
      presetVersion: preset.version,
      aspectRatio: aspectRatioOverride ?? preset.aspectRatio,
      segments,
    },
  };
}
