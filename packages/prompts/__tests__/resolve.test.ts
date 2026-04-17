import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildImagePrompt,
  buildVideoPrompt,
  findOutfitScenario,
  getOutfitScenarioOptions,
  loadOutfitScenarioPresets,
  OUTFIT_SCENARIO_PRESETS,
  resolveImagePromptForOutfit,
  resolveVideoPromptForOutfit,
} from '../src/index';

test('30 presets are loaded with required structure', async () => {
  const presets = await loadOutfitScenarioPresets();
  assert.equal(presets.length, 30);
  for (const p of presets) {
    assert.ok(p.id, `missing id for #${p.index}`);
    assert.ok(p.label, `missing label for ${p.id}`);
    assert.ok(p.tags.length > 0, `missing tags for ${p.id}`);
    assert.match(p.aspectRatio, /^(9:16|16:9|1:1)$/);
    assert.equal(typeof p.version, 'number');
    for (const k of ['character', 'outfit', 'style', 'composition', 'scene', 'lighting'] as const) {
      assert.ok(p.image[k]?.length, `${p.id}.image.${k} empty`);
    }
    for (const k of ['motion', 'camera', 'detail', 'background'] as const) {
      assert.ok(p.video[k]?.length, `${p.id}.video.${k} empty`);
    }
  }
});

test('preset ids are unique', () => {
  const ids = OUTFIT_SCENARIO_PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('findOutfitScenario returns undefined for missing id', async () => {
  assert.equal(await findOutfitScenario('does_not_exist'), undefined);
  assert.equal(await findOutfitScenario(''), undefined);
  assert.equal(await findOutfitScenario(null), undefined);
});

test('getOutfitScenarioOptions filters by tags (any-match)', async () => {
  const all = await getOutfitScenarioOptions();
  assert.equal(all.length, 30);
  const commute = await getOutfitScenarioOptions({ tags: ['通勤'] });
  assert.ok(commute.length >= 5, `expected >=5 通勤 presets, got ${commute.length}`);
  assert.ok(commute.every((o) => o.tags.includes('通勤')));
});

test('image resolver without preset matches buildImagePrompt byte-for-byte (regression guard)', () => {
  const args = {
    character: { genderStyle: 'female', ageStyle: '24', vibeDesc: 'urban chic' },
    outfit: { topDesc: 'white tee', bottomDesc: 'blue jeans', colorDesc: 'white + blue' },
    cameraId: 'front_full',
    sceneTemplateId: 'mall_corridor',
    backgroundDesc: undefined,
  } as const;
  const direct = buildImagePrompt({
    character: args.character,
    outfit: args.outfit,
    cameraId: args.cameraId,
    sceneId: args.sceneTemplateId,
  });
  const resolved = resolveImagePromptForOutfit({
    character: args.character,
    outfit: args.outfit,
    cameraId: args.cameraId,
    sceneTemplateId: args.sceneTemplateId,
  });
  assert.equal(resolved.text, direct.text);
  assert.equal(resolved.json.mode, 'modular');
});

test('image resolver with preset uses preset character when no character template provided', async () => {
  const preset = await findOutfitScenario('urban_minimal_commute');
  assert.ok(preset);
  const r = resolveImagePromptForOutfit({ preset });
  assert.equal(r.json.mode, 'preset');
  assert.equal(r.json.presetId, 'urban_minimal_commute');
  assert.equal(r.json.aspectRatio, '9:16');
  assert.equal(r.json.segments.character.source, 'preset');
  assert.equal(r.json.segments.character.text, preset.image.character);
  assert.equal(r.json.segments.outfit.source, 'preset');
  assert.equal(r.json.segments.style.source, 'preset');
});

test('image resolver: character template overrides preset character segment', async () => {
  const preset = await findOutfitScenario('urban_minimal_commute');
  assert.ok(preset);
  const r = resolveImagePromptForOutfit({
    preset,
    character: { genderStyle: 'female', ageStyle: '30', vibeDesc: 'mature elegant' },
  });
  assert.equal(r.json.segments.character.source, 'character_template');
  assert.notEqual(r.json.segments.character.text, preset.image.character);
  assert.match(r.json.segments.character.text, /age around 30/);
});

test('image resolver: user outfit overrides preset outfit segment', async () => {
  const preset = await findOutfitScenario('urban_minimal_commute');
  assert.ok(preset);
  const r = resolveImagePromptForOutfit({
    preset,
    outfit: { topDesc: 'red leather jacket', bottomDesc: 'black mini skirt' },
  });
  assert.equal(r.json.segments.outfit.source, 'user');
  assert.match(r.json.segments.outfit.text, /red leather jacket/);
});

test('image resolver: scene template overrides preset scene; backgroundDesc beats preset only when scene template absent', async () => {
  const preset = await findOutfitScenario('urban_minimal_commute');
  assert.ok(preset);

  const withTemplate = resolveImagePromptForOutfit({
    preset,
    sceneTemplateId: 'minimal_studio',
    backgroundDesc: 'rooftop',
  });
  assert.equal(withTemplate.json.segments.scene.source, 'scene_template');

  const withDesc = resolveImagePromptForOutfit({
    preset,
    backgroundDesc: 'rooftop garden at sunset',
  });
  assert.equal(withDesc.json.segments.scene.source, 'user');
  assert.match(withDesc.json.segments.scene.text, /rooftop/);

  const withNeither = resolveImagePromptForOutfit({ preset });
  assert.equal(withNeither.json.segments.scene.source, 'preset');
  assert.equal(withNeither.json.segments.scene.text, preset.image.scene);
});

test('image resolver: hasReferenceAsset injects reference constraint segment', async () => {
  const preset = await findOutfitScenario('urban_minimal_commute');
  assert.ok(preset);
  const r = resolveImagePromptForOutfit({ preset, hasReferenceAsset: true });
  assert.ok(r.json.segments.referenceConstraint);
  assert.equal(r.json.segments.referenceConstraint.source, 'reference_image');
});

test('image resolver: aspectRatioOverride > preset.aspectRatio > 9:16 default', async () => {
  const preset = await findOutfitScenario('urban_minimal_commute');
  assert.ok(preset);
  assert.equal(resolveImagePromptForOutfit({ preset }).json.aspectRatio, '9:16');
  assert.equal(
    resolveImagePromptForOutfit({ preset, aspectRatioOverride: '1:1' }).json.aspectRatio,
    '1:1',
  );
  assert.equal(resolveImagePromptForOutfit({}).json.aspectRatio, '9:16');
});

test('video resolver without preset matches buildVideoPrompt (regression guard)', () => {
  const direct = buildVideoPrompt({
    motionId: 'stand_sway',
    cameraId: 'angle45_full',
    sceneDesc: 'studio backdrop',
  });
  const resolved = resolveVideoPromptForOutfit({
    motionId: 'stand_sway',
    cameraId: 'angle45_full',
    backgroundDesc: 'studio backdrop',
  });
  assert.equal(resolved.text, direct.text);
  assert.equal(resolved.json.mode, 'modular');
});

test('video resolver with preset: motion/camera templates override preset video.motion/camera', async () => {
  const preset = await findOutfitScenario('urban_minimal_commute');
  assert.ok(preset);

  const presetOnly = resolveVideoPromptForOutfit({ preset });
  assert.equal(presetOnly.json.segments.motion.source, 'preset');
  assert.equal(presetOnly.json.segments.camera.source, 'preset');

  const overridden = resolveVideoPromptForOutfit({
    preset,
    motionId: 'slow_turn',
    cameraId: 'side_walk',
  });
  assert.equal(overridden.json.segments.motion.source, 'motion_template');
  assert.equal(overridden.json.segments.camera.source, 'camera_template');
});

test('video resolver with preset: backgroundDesc overrides preset background segment', async () => {
  const preset = await findOutfitScenario('night_urban_chic');
  assert.ok(preset);
  const r = resolveVideoPromptForOutfit({ preset, backgroundDesc: 'foggy alley with neon signs' });
  assert.equal(r.json.segments.background.source, 'user');
  assert.match(r.json.segments.background.text, /neon signs/);
});

test('all 30 presets resolve without throwing (smoke)', async () => {
  for (const preset of OUTFIT_SCENARIO_PRESETS) {
    const img = resolveImagePromptForOutfit({ preset });
    const vid = resolveVideoPromptForOutfit({ preset });
    assert.ok(img.text.length > 50, `${preset.id} image text too short`);
    assert.ok(vid.text.length > 50, `${preset.id} video text too short`);
    assert.equal(img.json.presetId, preset.id);
    assert.equal(vid.json.presetId, preset.id);
  }
});
