"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceManager = void 0;
const prisma_js_1 = require("../lib/prisma.js");
const logger_js_1 = require("../lib/logger.js");
class MaintenanceManager {
    state = {
        enabled: false,
        reason: null,
        estimatedEnd: null,
        updatedAt: null,
    };
    constructor() {
        this.loadInitialState().catch(() => { });
    }
    async loadInitialState() {
        try {
            const setting = await prisma_js_1.prisma.systemSetting.findUnique({
                where: { key: 'maintenance_mode' },
            });
            if (setting?.value) {
                const parsed = JSON.parse(setting.value);
                this.state = {
                    enabled: Boolean(parsed.enabled),
                    reason: parsed.reason || null,
                    estimatedEnd: parsed.estimatedEnd || null,
                    updatedAt: setting.updatedAt?.toISOString() || null,
                };
            }
        }
        catch (err) {
            logger_js_1.logger.debug(`Maintenance initial state check non-fatal: ${err.message}`);
        }
    }
    isMaintenanceActive() {
        return this.state.enabled;
    }
    getState() {
        return { ...this.state };
    }
    setState(newState) {
        this.state = {
            ...this.state,
            ...newState,
            updatedAt: new Date().toISOString(),
        };
    }
    isUserAdmin(role) {
        return role === 'SUPER_ADMIN' || role === 'ADMIN';
    }
    /**
     * Kicks non-admin user sockets with code 4003 when maintenance is turned on
     */
    enforceMaintenanceKicks(wssInstance) {
        let kickedCount = 0;
        if (!this.state.enabled || !wssInstance)
            return kickedCount;
        const payload = JSON.stringify({
            type: 'error',
            code: 'MAINTENANCE_MODE',
            message: this.state.reason || 'Server is temporarily undergoing scheduled maintenance.',
            estimatedEnd: this.state.estimatedEnd,
        });
        wssInstance.clients.forEach((client) => {
            const authWs = client;
            if (!this.isUserAdmin(authWs.systemRole)) {
                try {
                    authWs.send(payload);
                    // Code 4003: Service Unavailable - Maintenance
                    authWs.close(4003, 'System Maintenance Active');
                    kickedCount++;
                }
                catch {
                    authWs.terminate();
                }
            }
        });
        logger_js_1.logger.info(`Maintenance kicks enforced: ${kickedCount} non-admin sockets terminated`);
        return kickedCount;
    }
}
exports.maintenanceManager = new MaintenanceManager();
