import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
export interface AuthenticatedUser {
    userId: string;
    username: string;
    systemRole?: string;
}
export declare function parseCookies(cookieHeader?: string): Record<string, string>;
export declare function authenticateUpgrade(request: IncomingMessage, socket: Duplex, jwtSecret: string): AuthenticatedUser | null;
