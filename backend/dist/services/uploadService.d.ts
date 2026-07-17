export interface UploadResult {
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    format?: string;
    size?: number;
}
export declare const uploadImage: (buffer: Buffer, folder: string, options?: Record<string, unknown>) => Promise<UploadResult>;
export declare const uploadAvatar: (buffer: Buffer, userId: string) => Promise<UploadResult>;
export declare const uploadReceipt: (buffer: Buffer, userId: string) => Promise<UploadResult>;
export declare const deleteImage: (publicId: string) => Promise<void>;
//# sourceMappingURL=uploadService.d.ts.map