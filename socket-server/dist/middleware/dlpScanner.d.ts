import { DlpScanResult } from '../lib/dlpPatterns.js';
import { AuthenticatedWebSocket } from '../lib/roomManager.js';
declare class DlpScannerEngine {
    private activeRules;
    private lastRefresh;
    private readonly REFRESH_INTERVAL_MS;
    constructor();
    private initDefaultRules;
    /**
     * Refreshes active DLP rules from database or falls back to defaults
     */
    refreshRules(): Promise<void>;
    /**
     * Evaluates message content in memory (< 1ms execution time)
     */
    evaluateMessage(content: string): Promise<DlpScanResult>;
    /**
     * Dispatches error envelope to sender, logs audit trail and updates match counter
     */
    handleViolation(socket: AuthenticatedWebSocket, content: string, result: DlpScanResult): Promise<void>;
}
export declare const dlpScanner: DlpScannerEngine;
export {};
