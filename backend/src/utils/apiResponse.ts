import { Response } from 'express';

interface ApiResponseOptions {
  message?: string;
  data?: unknown;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

export const sendSuccess = (
  res: Response,
  options: ApiResponseOptions = {},
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message: options.message || 'Success',
    data: options.data !== undefined ? options.data : null,
    meta: options.meta || undefined,
    timestamp: new Date().toISOString(),
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: unknown
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors || undefined,
    timestamp: new Date().toISOString(),
  });
};

export const sendCreated = (
  res: Response,
  options: ApiResponseOptions = {}
): Response => {
  return sendSuccess(res, options, 201);
};

export interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
}

export const paginateMeta = (options: PaginationOptions) => {
  const { page, limit, total } = options;
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

export const getPaginationParams = (query: Record<string, unknown>) => {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
