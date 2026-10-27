import { AuthenticatedWebSocket } from '../lib/roomManager.js';
import { LiveLocationStartPayload, LiveLocationUpdatePayload, LiveLocationStopPayload } from '../types/index.js';
export declare function handleLiveLocationStart(socket: AuthenticatedWebSocket, payload: LiveLocationStartPayload): Promise<void>;
export declare function handleLiveLocationUpdate(socket: AuthenticatedWebSocket, payload: LiveLocationUpdatePayload): Promise<void>;
export declare function handleLiveLocationStop(socket: AuthenticatedWebSocket, payload: LiveLocationStopPayload): Promise<void>;
