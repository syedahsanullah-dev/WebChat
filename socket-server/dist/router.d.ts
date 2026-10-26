import { AuthenticatedWebSocket } from './lib/roomManager.js';
import { WsEnvelope } from './types/index.js';
/**
 * Main WebSocket JSON Envelope message router
 */
export declare function routeWebSocketEnvelope(socket: AuthenticatedWebSocket, envelope: WsEnvelope): void;
