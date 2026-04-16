export interface GenerateImagesInput {
  prompt: string;
  promptJson?: Record<string, string>;
  count: number;
  aspectRatio?: string;
  resolution?: string;
  referenceImageUrls?: string[];
  subjectReferenceUrls?: string[];
  seed?: number;
}

export interface GeneratedImageItem {
  providerAssetId?: string;
  url?: string;
  base64?: string;
  width?: number;
  height?: number;
  seed?: number;
  metadata?: Record<string, unknown>;
}

export interface GenerateImagesResult {
  success: boolean;
  items: GeneratedImageItem[];
  raw?: unknown;
}

export interface GenerateVideoFromImageInput {
  prompt: string;
  inputImageUrl: string;
  durationSec?: number;
  resolution?: string;
  aspectRatio?: string;
  subjectReferenceUrls?: string[];
}

export interface GenerateVideoTaskResult {
  success: boolean;
  taskId: string;
  raw?: unknown;
}

export interface ProviderTaskStatusResult {
  success: boolean;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  providerFileId?: string;
  outputUrl?: string;
  errorMessage?: string;
  raw?: unknown;
}

export interface DownloadAssetResult {
  buffer: Buffer;
  mimeType?: string;
  filename?: string;
}

export interface CostEstimate {
  currency: string;
  amount: number;
  billingUnit: string;
  breakdown?: Record<string, number>;
}

export interface CostEstimateInput {
  stage: 'IMAGE' | 'VIDEO';
  model: string;
  count: number;
  resolution?: string;
  durationSec?: number;
}

export interface ProviderCapabilities {
  supportsTextToImage: boolean;
  supportsImageToImage: boolean;
  supportsImageToVideo: boolean;
  supportsStartEndFrame: boolean;
  supportsSubjectReference: boolean;
  supportsSeed: boolean;
  supports1080p: boolean;
  supportsPromptOptimizer: boolean;
  supportsAsyncTask: boolean;
  supportsUrlInput: boolean;
  supportsBase64Input: boolean;
}

export interface AiProvider {
  name: string;
  generateImages(input: GenerateImagesInput): Promise<GenerateImagesResult>;
  generateVideoFromImage(input: GenerateVideoFromImageInput): Promise<GenerateVideoTaskResult>;
  getTask(taskId: string): Promise<ProviderTaskStatusResult>;
  downloadAsset(input: { fileId?: string; url?: string }): Promise<DownloadAssetResult>;
  estimateCost(input: CostEstimateInput): CostEstimate;
  getCapabilities(): ProviderCapabilities;
}
