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
export declare const sendSuccess: (res: Response, options?: ApiResponseOptions, statusCode?: number) => Response;
export declare const sendError: (res: Response, message: string, statusCode?: number, errors?: unknown) => Response;
export declare const sendCreated: (res: Response, options?: ApiResponseOptions) => Response;
export interface PaginationOptions {
    page: number;
    limit: number;
    total: number;
}
export declare const paginateMeta: (options: PaginationOptions) => {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
};
export declare const getPaginationParams: (query: Record<string, unknown>) => {
    page: number;
    limit: number;
    skip: number;
};
export {};
//# sourceMappingURL=apiResponse.d.ts.map