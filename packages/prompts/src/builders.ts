import { findCamera, findMotion, findScene } from './templates';

export interface CharacterInput {
  genderStyle?: string;
  ageStyle?: string;
  faceDesc?: string;
  hairDesc?: string;
  skinDesc?: string;
  bodyDesc?: string;
  vibeDesc?: string;
}

export interface OutfitInput {
  topDesc?: string;
  bottomDesc?: string;
  shoesDesc?: string;
  bagDesc?: string;
  accessoriesDesc?: string;
  materialDesc?: string;
  colorDesc?: string;
}

export interface ImagePromptOptions {
  character: CharacterInput;
  outfit: OutfitInput;
  cameraId?: string;
  sceneId?: string;
  backgroundDesc?: string;
}

export interface PromptOutput {
  text: string;
  json: Record<string, string>;
}

export function buildImagePrompt(options: ImagePromptOptions): PromptOutput {
  const { character, outfit, cameraId, sceneId, backgroundDesc } = options;

  const json: Record<string, string> = {};
  const segments: string[] = [];

  // Character
  const charParts: string[] = [];
  if (character.genderStyle) charParts.push(character.genderStyle);
  if (character.ageStyle) charParts.push(`age around ${character.ageStyle}`);
  if (character.bodyDesc) charParts.push(character.bodyDesc);
  if (character.vibeDesc) charParts.push(`${character.vibeDesc} vibe`);
  if (charParts.length > 0) {
    const desc = `A fashion model, ${charParts.join(', ')}`;
    json.character = desc;
    segments.push(desc);
  }

  // Face & hair
  const faceParts: string[] = [];
  if (character.faceDesc) faceParts.push(character.faceDesc);
  if (character.hairDesc) faceParts.push(character.hairDesc);
  if (character.skinDesc) faceParts.push(character.skinDesc);
  if (faceParts.length > 0) {
    const desc = faceParts.join(', ');
    json.face = desc;
    segments.push(desc);
  }

  // Outfit
  const outfitParts: string[] = [];
  if (outfit.topDesc) outfitParts.push(outfit.topDesc);
  if (outfit.bottomDesc) outfitParts.push(outfit.bottomDesc);
  if (outfit.shoesDesc) outfitParts.push(outfit.shoesDesc);
  if (outfit.bagDesc) outfitParts.push(outfit.bagDesc);
  if (outfit.accessoriesDesc) outfitParts.push(outfit.accessoriesDesc);
  if (outfitParts.length > 0) {
    const desc = `Wearing: ${outfitParts.join(', ')}`;
    json.outfit = desc;
    segments.push(desc);
  }

  // Material & color
  const matParts: string[] = [];
  if (outfit.materialDesc) matParts.push(outfit.materialDesc);
  if (outfit.colorDesc) matParts.push(`color palette: ${outfit.colorDesc}`);
  if (matParts.length > 0) {
    const desc = matParts.join(', ');
    json.material = desc;
    segments.push(desc);
  }

  // Camera
  const camera = cameraId ? findCamera(cameraId) : undefined;
  if (camera) {
    json.camera = camera.prompt;
    segments.push(camera.prompt);
  }

  // Scene / background
  const scene = sceneId ? findScene(sceneId) : undefined;
  if (scene) {
    json.scene = scene.prompt;
    segments.push(scene.prompt);
  } else if (backgroundDesc) {
    json.scene = backgroundDesc;
    segments.push(backgroundDesc);
  }

  // Quality & stability constraints
  const quality = 'high quality fashion photography, sharp details, realistic fabric textures, professional lighting, commercial lookbook style';
  json.quality = quality;
  segments.push(quality);

  const stability = 'consistent face, stable body proportions, accurate garment silhouette, no distortion';
  json.stability = stability;
  segments.push(stability);

  return { text: segments.join('. ') + '.', json };
}

export interface VideoPromptOptions {
  motionId?: string;
  cameraId?: string;
  sceneDesc?: string;
}

export function buildVideoPrompt(options: VideoPromptOptions): PromptOutput {
  const { motionId, cameraId, sceneDesc } = options;

  const json: Record<string, string> = {};
  const segments: string[] = [];

  // Starting state
  const start = 'The model begins in a natural standing pose';
  json.start = start;
  segments.push(start);

  // Motion
  const motion = motionId ? findMotion(motionId) : undefined;
  if (motion) {
    json.motion = motion.prompt;
    segments.push(motion.prompt);
  }

  // Camera movement
  const camera = cameraId ? findCamera(cameraId) : undefined;
  if (camera) {
    json.camera = `Camera: ${camera.prompt}`;
    segments.push(`Camera: ${camera.prompt}`);
  }

  // Scene
  if (sceneDesc) {
    json.scene = sceneDesc;
    segments.push(sceneDesc);
  }

  // Stability constraints
  const clothingStability = 'Clothing remains stable with accurate silhouette, no warping or morphing of fabric';
  json.clothingStability = clothingStability;
  segments.push(clothingStability);

  const faceStability = 'Face remains consistent throughout, no drift or distortion';
  json.faceStability = faceStability;
  segments.push(faceStability);

  const bgStability = 'Background stays clean and consistent, no flickering';
  json.bgStability = bgStability;
  segments.push(bgStability);

  const rhythm = 'Smooth natural movement, slow and elegant pace';
  json.rhythm = rhythm;
  segments.push(rhythm);

  return { text: segments.join('. ') + '.', json };
}
