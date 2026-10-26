import { AuthenticatedWebSocket } from '../lib/roomManager.js';
/**
 * Handles incoming connection presence setup and broadcast
 */
export declare function handleUserConnect(socket: AuthenticatedWebSocket): Promise<void>;
/**
 * Handles disconnection, cleanup, and offline broadcast when all tabs close
 */
export declare function handleUserDisconnect(socket: AuthenticatedWebSocket): Promise<void>;
