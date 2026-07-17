import { Request, Response } from 'express';
export declare const DEFAULT_CATEGORIES: {
    name: string;
    type: string;
    icon: string;
    color: string;
    isDefault: boolean;
}[];
export declare const seedUserCategories: (userId: string) => Promise<void>;
export declare const getCategories: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getCategory: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const createCategory: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const updateCategory: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const deleteCategory: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const seedDefaultCategories: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=categoryController.d.ts.map