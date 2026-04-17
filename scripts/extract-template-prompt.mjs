#!/usr/bin/env node
// Parses docs/Template-Prompt.md into a typed TS module so packages/prompts
// can consume the 30 outfit scenario presets without runtime markdown parsing.
//
// Usage:
//   node scripts/extract-template-prompt.mjs           # write generated file
//   node scripts/extract-template-prompt.mjs --print   # stdout only
//   node scripts/extract-template-prompt.mjs --check   # exit 1 if disk drifts
//
// Single source of truth: docs/Template-Prompt.md
// Generated artifact:    packages/prompts/src/data/outfit-scenarios.generated.ts

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const MD_PATH = path.join(ROOT, 'docs', 'Template-Prompt.md');
const OUT_PATH = path.join(
  ROOT,
  'packages',
  'prompts',
  'src',
  'data',
  'outfit-scenarios.generated.ts',
);

// id slug + tags + aspectRatio + recommendedDuration per preset.
// Order MUST match the `# N.` headers in docs/Template-Prompt.md.
const PRESET_META = [
  { id: 'urban_minimal_commute', tags: ['通勤', '极简', '都市', '春秋', '女'] },
  { id: 'korean_soft_commute', tags: ['通勤', '韩系', '温柔', '女', '春秋'] },
  { id: 'french_chic_dress', tags: ['法式', '轻熟', '裙装', '女'] },
  { id: 'street_casual_denim', tags: ['街头', '休闲', '牛仔', '女'] },
  { id: 'premium_black_white_minimal', tags: ['极简', '黑白', '高级', '女'] },
  { id: 'autumn_winter_knit_layering', tags: ['秋冬', '针织', '叠穿', '女'] },
  { id: 'fresh_summer', tags: ['夏日', '清爽', '女'] },
  { id: 'light_luxury_boutique', tags: ['轻奢', '通勤', '女'] },
  { id: 'sweet_cool_girl', tags: ['甜酷', '少女', '街头', '女'] },
  { id: 'brand_lookbook', tags: ['lookbook', '品牌', '高级', '女'] },
  { id: 'white_shirt_commute', tags: ['通勤', '白衬衫', '女'] },
  { id: 'suit_vest_chic', tags: ['通勤', '轻熟', '西装', '女'] },
  { id: 'french_knit_denim', tags: ['法式', '针织', '牛仔', '女'] },
  { id: 'academy_pleated_skirt', tags: ['学院', '百褶裙', '青春', '女'] },
  { id: 'casual_hoodie_sport', tags: ['运动', '休闲', '街头', '女'] },
  { id: 'soft_knit_skirt', tags: ['通勤', '温柔', '针织', '女'] },
  { id: 'urban_trench_commute', tags: ['通勤', '风衣', '都市', '女'] },
  { id: 'retro_denim_jacket', tags: ['复古', '牛仔', '街头', '女'] },
  { id: 'pure_white_minimal', tags: ['极简', '纯白', '高级', '女'] },
  { id: 'black_dress_light_luxury', tags: ['轻奢', '连衣裙', '优雅', '女'] },
  { id: 'fresh_shirt_shorts', tags: ['夏日', '清爽', '女'] },
  { id: 'urban_leather_cool', tags: ['酷感', '皮衣', '都市', '女'] },
  { id: 'cream_soft_suit', tags: ['温柔', '套装', '春秋', '女'] },
  { id: 'unisex_suit_street', tags: ['中性', '街头', '西装', '女'] },
  { id: 'soft_knit_cardigan_date', tags: ['约会', '温柔', '针织', '女'] },
  { id: 'minimal_tank_pants_summer', tags: ['夏日', '极简', '女'] },
  { id: 'autumn_winter_coat_premium', tags: ['秋冬', '大衣', '高级', '女'] },
  { id: 'light_sport_tennis_skirt', tags: ['运动', '网球', '夏日', '女'] },
  { id: 'chic_shirt_mamian_skirt', tags: ['中式', '轻熟', '女'] },
  { id: 'night_urban_chic', tags: ['夜景', '都市', '酷感', '女'] },
];

const DEFAULT_ASPECT_RATIO = '9:16';
const DEFAULT_DURATION = 6;

function parseMarkdown(md) {
  // Split by `# N. label` headers. We treat any line starting with `# ` followed
  // by a number+dot as a section boundary; the leading `## 这30套怎么用最稳`
  // tail section is naturally cut off because its header doesn't match `# \d+\.`.
  const headerRe = /^# (\d+)\. (.+?)\s*$/gm;
  const headers = [];
  let h;
  while ((h = headerRe.exec(md)) !== null) {
    headers.push({
      index: Number(h[1]),
      label: h[2].trim(),
      start: h.index,
      headerEnd: headerRe.lastIndex,
    });
  }

  const fenceRe = /```[\w-]*\r?\n([\s\S]*?)\r?\n```/g;
  const presets = [];

  for (let i = 0; i < headers.length; i++) {
    const { index, label, headerEnd } = headers[i];
    const bodyEnd = i + 1 < headers.length ? headers[i + 1].start : md.length;
    const body = md.slice(headerEnd, bodyEnd);

    const fences = [];
    let f;
    fenceRe.lastIndex = 0;
    while ((f = fenceRe.exec(body)) !== null) fences.push(f[1]);
    if (fences.length < 2) {
      throw new Error(`Preset #${index} (${label}) missing image/video fenced blocks`);
    }
    const [imageRaw, videoRaw] = fences;
    const imageLines = splitLines(imageRaw);
    const videoLines = splitLines(videoRaw);
    if (imageLines.length !== 6) {
      throw new Error(
        `Preset #${index} (${label}) image block expected 6 lines, got ${imageLines.length}:\n${imageRaw}`,
      );
    }
    if (videoLines.length !== 4) {
      throw new Error(
        `Preset #${index} (${label}) video block expected 4 lines, got ${videoLines.length}:\n${videoRaw}`,
      );
    }

    const meta = PRESET_META[index - 1];
    if (!meta) {
      throw new Error(`Preset #${index} has no PRESET_META entry; update extractor`);
    }

    presets.push({
      id: meta.id,
      index,
      label,
      tags: meta.tags,
      aspectRatio: DEFAULT_ASPECT_RATIO,
      recommendedDuration: DEFAULT_DURATION,
      version: 1,
      image: {
        character: imageLines[0],
        outfit: imageLines[1],
        style: imageLines[2],
        composition: imageLines[3],
        scene: imageLines[4],
        lighting: imageLines[5],
      },
      video: {
        motion: videoLines[0],
        camera: videoLines[1],
        detail: videoLines[2],
        background: videoLines[3],
      },
    });
  }

  if (presets.length !== PRESET_META.length) {
    throw new Error(
      `Expected ${PRESET_META.length} presets, parsed ${presets.length}. Check headers.`,
    );
  }
  return presets;
}

function splitLines(block) {
  return block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function renderTs(presets) {
  const banner = [
    '// AUTO-GENERATED FROM docs/Template-Prompt.md by scripts/extract-template-prompt.mjs',
    '// Do not edit manually. Run `pnpm sync:presets` to regenerate.',
    '',
    "import type { OutfitScenarioPreset } from '../types/outfit-scenario';",
    '',
    'export const OUTFIT_SCENARIO_PRESETS: readonly OutfitScenarioPreset[] = ',
  ].join('\n');
  return `${banner}${JSON.stringify(presets, null, 2)};\n`;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const presets = parseMarkdown(md);
  const out = renderTs(presets);

  if (args.has('--print')) {
    process.stdout.write(out);
    return;
  }

  if (args.has('--check')) {
    const existing = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf8') : '';
    if (existing.trim() !== out.trim()) {
      console.error(
        '[check-presets-sync] outfit-scenarios.generated.ts is out of sync with docs/Template-Prompt.md',
      );
      console.error('Run `pnpm sync:presets` to regenerate.');
      process.exit(1);
    }
    console.log(`[check-presets-sync] OK (${presets.length} presets in sync)`);
    return;
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, out, 'utf8');
  console.log(
    `[extract-template-prompt] wrote ${presets.length} presets -> ${path.relative(ROOT, OUT_PATH)}`,
  );
}

main();
