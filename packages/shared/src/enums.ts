export const UserRole = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  REVIEWER: 'REVIEWER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ProviderName = {
  MINIMAX: 'MINIMAX',
  RUNWAY: 'RUNWAY',
  JIMENG: 'JIMENG',
  OPENAI: 'OPENAI',
} as const;
export type ProviderName = (typeof ProviderName)[keyof typeof ProviderName];

export const JobStage = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
} as const;
export type JobStage = (typeof JobStage)[keyof typeof JobStage];

export const JobStatus = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
  RETRYING: 'RETRYING',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const AssetType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export const ReviewStatus = {
  DRAFT: 'DRAFT',
  GENERATED: 'GENERATED',
  REVIEWING: 'REVIEWING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const BillingUnit = {
  PER_IMAGE: 'PER_IMAGE',
  PER_SECOND: 'PER_SECOND',
  CREDIT: 'CREDIT',
  TOKEN: 'TOKEN',
  FIXED: 'FIXED',
} as const;
export type BillingUnit = (typeof BillingUnit)[keyof typeof BillingUnit];
