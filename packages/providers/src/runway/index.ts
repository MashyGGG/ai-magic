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

const RUNWAY_VERSION = '2024-11-06';

const COST_TABLE: Record<string, number> = {
  'gen4_turbo:720p:5': 0.50,
  'gen4_turbo:720p:10': 1.00,
  'gen4_turbo:1080p:5': 1.00,
  'gen4_turbo:1080p:10': 2.00,
  'gen4_image:standard': 0.05,
};

class ProviderNotImplementedError extends Error {
  constructor(method: string) {
    super(`RunwayProvider.${method} is not yet implemented. Runway integration is planned for a future release.`);
    this.name = 'ProviderNotImplementedError';
  }
}

export class RunwayProvider implements AiProvider {
  name = 'RUNWAY';

  async generateImages(_input: GenerateImagesInput): Promise<GenerateImagesResult> {
    throw new ProviderNotImplementedError('generateImages');
  }

  async generateVideoFromImage(_input: GenerateVideoFromImageInput): Promise<GenerateVideoTaskResult> {
    throw new ProviderNotImplementedError('generateVideoFromImage');
  }

  async getTask(_taskId: string): Promise<ProviderTaskStatusResult> {
    throw new ProviderNotImplementedError('getTask');
  }

  async downloadAsset(_input: { fileId?: string; url?: string }): Promise<DownloadAssetResult> {
    throw new ProviderNotImplementedError('downloadAsset');
  }

  estimateCost(input: CostEstimateInput): CostEstimate {
    let amount = 0;

    if (input.stage === 'IMAGE') {
      amount = (COST_TABLE['gen4_image:standard'] || 0.05) * input.count;
    } else {
      const resolution = input.resolution || '720p';
      const duration = input.durationSec || 5;
      const key = `gen4_turbo:${resolution}:${duration}`;
      amount = (COST_TABLE[key] || COST_TABLE['gen4_turbo:720p:5'] || 0.50) * input.count;
    }

    return {
      currency: 'USD',
      amount,
      billingUnit: input.stage === 'IMAGE' ? 'CREDIT' : 'CREDIT',
      breakdown: { unitCount: input.count, totalAmount: amount },
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsTextToImage: true,
      supportsImageToImage: true,
      supportsImageToVideo: true,
      supportsStartEndFrame: true,
      supportsSubjectReference: false,
      supportsSeed: false,
      supports1080p: true,
      supportsPromptOptimizer: true,
      supportsAsyncTask: true,
      supportsUrlInput: true,
      supportsBase64Input: true,
    };
  }
}
