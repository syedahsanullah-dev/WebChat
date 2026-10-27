import { WebSocketServer } from 'ws';
export interface MaintenanceState {
    enabled: boolean;
    reason?: string | null;
    estimatedEnd?: string | null;
    updatedAt?: string | null;
}
declare class MaintenanceManager {
    private state;
    constructor();
    loadInitialState(): Promise<void>;
    isMaintenanceActive(): boolean;
    getState(): MaintenanceState;
    setState(newState: Partial<MaintenanceState>): void;
    isUserAdmin(role?: string): boolean;
    /**
     * Kicks non-admin user sockets with code 4003 when maintenance is turned on
     */
    enforceMaintenanceKicks(wssInstance: WebSocketServer): number;
}
export declare const maintenanceManager: MaintenanceManager;
export {};
