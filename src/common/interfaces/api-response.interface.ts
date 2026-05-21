export interface ApiResponseEnvelope<T = unknown> {
  data: T;
  meta: Record<string, unknown>;
  timestamp: string;
}

export interface PaginatedMeta extends Record<string, unknown> {
  total: number;
  page: number;
  limit: number;
}
