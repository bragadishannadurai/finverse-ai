import { IUser } from '../models/User';
export interface TokenPayload {
    userId: string;
    role: string;
}
export declare const generateAccessToken: (user: IUser) => string;
export declare const generateRefreshToken: (user: IUser) => string;
export declare const verifyRefreshToken: (token: string) => TokenPayload;
export declare const generateEmailToken: () => string;
export declare const generateOTP: () => string;
export declare const hashToken: (token: string) => string;
export declare const generateTokens: (user: IUser) => {
    accessToken: string;
    refreshToken: string;
};
//# sourceMappingURL=tokenService.d.ts.map