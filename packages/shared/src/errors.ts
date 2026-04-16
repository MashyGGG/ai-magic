export const ErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  TEMPLATE_IN_USE: 'TEMPLATE_IN_USE',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_NOT_IMPLEMENTED: 'PROVIDER_NOT_IMPLEMENTED',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  JOB_NOT_RETRYABLE: 'JOB_NOT_RETRYABLE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ProviderError extends AppError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly raw?: unknown,
  ) {
    super('PROVIDER_ERROR', message, 502);
    this.name = 'ProviderError';
  }
}
