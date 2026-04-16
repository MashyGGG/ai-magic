export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

export type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): ApiResponse<PaginatedData<T>> {
  return { success: true, data: { items, total, page, pageSize } };
}

export function fail(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}
