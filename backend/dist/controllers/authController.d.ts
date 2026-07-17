import { Request, Response, NextFunction } from 'express';
export declare const register: (req: Request, res: Response, next: NextFunction) => void;
export declare const login: (req: Request, res: Response, next: NextFunction) => void;
export declare const logout: (req: Request, res: Response, next: NextFunction) => void;
export declare const refreshToken: (req: Request, res: Response, next: NextFunction) => void;
export declare const verifyEmail: (req: Request, res: Response, next: NextFunction) => void;
export declare const forgotPassword: (req: Request, res: Response, next: NextFunction) => void;
export declare const resetPassword: (req: Request, res: Response, next: NextFunction) => void;
export declare const sendOTP: (req: Request, res: Response, next: NextFunction) => void;
export declare const verifyOTP: (req: Request, res: Response, next: NextFunction) => void;
export declare const enableTwoFactor: (req: Request, res: Response, next: NextFunction) => void;
export declare const verifyTwoFactor: (req: Request, res: Response, next: NextFunction) => void;
export declare const disableTwoFactor: (req: Request, res: Response, next: NextFunction) => void;
export declare const getMe: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=authController.d.ts.map