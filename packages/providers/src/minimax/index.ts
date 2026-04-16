import { ProviderError } from '@ai-magic/shared';
import type {
  AiProvider,
  GenerateImagesInput,
  GenerateImagesResult,
  GenerateVideoFromImageInput,
  GenerateVideoTaskResult,
  ProviderTaskStatusResult,
  DownloadAssetResult,
  CostEstimateInput,
  CostEstimate,
  ProviderCapabilities,
} from '../types';

const BASE_URL = 'https://api.minimax.chat/v1';

function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new ProviderError('MINIMAX_API_KEY is not configured', 'MINIMAX');
  return key;
}

async function request(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError(
      `MiniMax API error: ${res.status} ${text.slice(0, 200)}`,
      'MINIMAX',
      { status: res.status, body: text },
    );
  }

  const json = await res.json();
  if (json.base_resp?.status_code && json.base_resp.status_code !== 0) {
    throw new ProviderError(
      `MiniMax error: ${json.base_resp.status_msg || 'Unknown'}`,
      'MINIMAX',
      json,
    );
  }

  return json;
}

async function requestGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Authorization': `Bearer ${getApiKey()}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError(`MiniMax API error: ${res.status}`, 'MINIMAX', { status: res.status, body: text });
  }
  return res.json();
}

const COST_TABLE: Record<string, number> = {
  'image-01': 0.025,
  'Hailuo-2.3-Fast:768p:6': 1.35,
  'Hailuo-2.3-Fast:1080p:6': 2.31,
  'Hailuo-2.3:1080p:6': 3.50,
  'Hailuo-2.3-Fast:768p:10': 2.25,
  'Hailuo-2.3-Fast:1080p:10': 3.85,
};

export class MiniMaxProvider implements AiProvider {
  name = 'MINIMAX';

  async generateImages(input: GenerateImagesInput): Promise<GenerateImagesResult> {
    const body: Record<string, unknown> = {
      model: 'image-01',
      prompt: input.prompt,
      n: input.count,
    };

    if (input.aspectRatio) body.aspect_ratio = input.aspectRatio;
    if (input.seed) body.seed = input.seed;

    if (input.subjectReferenceUrls?.length) {
      body.subject_reference = input.subjectReferenceUrls.map((url) => ({
        type: 'character',
        image_url: url,
      }));
    }

    const data = await request('/image/generation', body);

    const items = (data.data?.images || []).map((img: { url?: string; seed?: number }, i: number) => ({
      url: img.url,
      seed: img.seed,
      providerAssetId: `minimax-img-${Date.now()}-${i}`,
      metadata: { raw: img },
    }));

    return { success: true, items, raw: data };
  }

  async generateVideoFromImage(input: GenerateVideoFromImageInput): Promise<GenerateVideoTaskResult> {
    const body: Record<string, unknown> = {
      model: 'Hailuo-2.3-Fast',
      prompt: input.prompt,
      first_frame_image: input.inputImageUrl,
    };

    if (input.durationSec) body.duration = input.durationSec;
    if (input.resolution) {
      body.resolution = input.resolution === '1080p' ? '1080p' : '720p';
    }

    if (input.subjectReferenceUrls?.length) {
      body.subject_reference = input.subjectReferenceUrls.map((url) => ({
        type: 'character',
        image_url: url,
      }));
    }

    const data = await request('/video/generation', body);

    return {
      success: true,
      taskId: data.task_id,
      raw: data,
    };
  }

  async getTask(taskId: string): Promise<ProviderTaskStatusResult> {
    const data = await requestGet(`/query/video_generation?task_id=${taskId}`);

    const statusMap: Record<string, ProviderTaskStatusResult['status']> = {
      Processing: 'RUNNING',
      Queueing: 'PENDING',
      Success: 'SUCCEEDED',
      Failed: 'FAILED',
      Cancelled: 'CANCELED',
    };

    return {
      success: true,
      status: statusMap[data.status] || 'RUNNING',
      providerFileId: data.file_id,
      outputUrl: undefined,
      errorMessage: data.status === 'Failed' ? (data.base_resp?.status_msg || 'Generation failed') : undefined,
      raw: data,
    };
  }

  async downloadAsset(input: { fileId?: string; url?: string }): Promise<DownloadAssetResult> {
    let downloadUrl = input.url;

    if (input.fileId && !downloadUrl) {
      const data = await requestGet(`/files/retrieve?file_id=${input.fileId}`);
      downloadUrl = data.file?.download_url;
    }

    if (!downloadUrl) {
      throw new ProviderError('No download URL available', 'MINIMAX');
    }

    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new ProviderError(`Download failed: ${res.status}`, 'MINIMAX');
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || undefined;

    return {
      buffer,
      mimeType: contentType,
      filename: input.fileId ? `${input.fileId}.mp4` : undefined,
    };
  }

  estimateCost(input: CostEstimateInput): CostEstimate {
    let amount = 0;

    if (input.stage === 'IMAGE') {
      const unitCost = COST_TABLE[input.model] || COST_TABLE['image-01'] || 0.025;
      amount = unitCost * input.count;
    } else {
      const resolution = input.resolution || '768p';
      const duration = input.durationSec || 6;
      const key = `${input.model}:${resolution}:${duration}`;
      const unitCost = COST_TABLE[key] || COST_TABLE[`${input.model}:${resolution}:6`] || 1.35;
      amount = unitCost * input.count;
    }

    return {
      currency: 'CNY',
      amount,
      billingUnit: input.stage === 'IMAGE' ? 'PER_IMAGE' : 'PER_SECOND',
      breakdown: { unitCount: input.count, totalAmount: amount },
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsTextToImage: true,
      supportsImageToImage: true,
      supportsImageToVideo: true,
      supportsStartEndFrame: true,
      supportsSubjectReference: true,
      supportsSeed: true,
      supports1080p: true,
      supportsPromptOptimizer: false,
      supportsAsyncTask: true,
      supportsUrlInput: true,
      supportsBase64Input: false,
    };
  }
}
