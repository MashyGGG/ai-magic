import { NextRequest, NextResponse } from 'next/server';
import {
  getOutfitScenarioOptions,
  getOutfitScenarioTags,
  loadOutfitScenarioPresets,
} from '@ai-magic/prompts';
import { ok } from '@ai-magic/shared';
import { requireUser, handleApiError } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const tagsParam = url.searchParams.get('tags');
    const tags = tagsParam
      ? tagsParam
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

    const [presets, options, tagInfo] = await Promise.all([
      loadOutfitScenarioPresets(),
      getOutfitScenarioOptions(tags ? { tags } : undefined),
      Promise.resolve(getOutfitScenarioTags()),
    ]);

    const filteredIds = new Set(options.map((o) => o.value));
    const items = presets
      .filter((p) => filteredIds.has(p.id))
      .map((p) => ({
        id: p.id,
        index: p.index,
        label: p.label,
        tags: p.tags,
        aspectRatio: p.aspectRatio,
        recommendedDuration: p.recommendedDuration,
        version: p.version,
        image: p.image,
        video: p.video,
      }));

    return NextResponse.json(
      ok({
        items,
        tags: tagInfo,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
