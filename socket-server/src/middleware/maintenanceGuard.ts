import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { AuthenticatedWebSocket } from '../lib/roomManager.js';
import { WebSocketServer } from 'ws';

export interface MaintenanceState {
  enabled: boolean;
  reason?: string | null;
  estimatedEnd?: string | null;
  updatedAt?: string | null;
}

class MaintenanceManager {
  private state: MaintenanceState = {
    enabled: false,
    reason: null,
    estimatedEnd: null,
    updatedAt: null,
  };

  constructor() {
    this.loadInitialState().catch(() => {});
  }

  public async loadInitialState(): Promise<void> {
    try {
      const setting = await prisma.systemSetting.findUnique({
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
    } catch (err) {
      logger.debug(`Maintenance initial state check non-fatal: ${(err as Error).message}`);
    }
  }

  public isMaintenanceActive(): boolean {
    return this.state.enabled;
  }

  public getState(): MaintenanceState {
    return { ...this.state };
  }

  public setState(newState: Partial<MaintenanceState>): void {
    this.state = {
      ...this.state,
      ...newState,
      updatedAt: new Date().toISOString(),
    };
  }

  public isUserAdmin(role?: string): boolean {
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  }

  /**
   * Kicks non-admin user sockets with code 4003 when maintenance is turned on
   */
  public enforceMaintenanceKicks(wssInstance: WebSocketServer): number {
    let kickedCount = 0;
    if (!this.state.enabled || !wssInstance) return kickedCount;

    const payload = JSON.stringify({
      type: 'error',
      code: 'MAINTENANCE_MODE',
      message: this.state.reason || 'Server is temporarily undergoing scheduled maintenance.',
      estimatedEnd: this.state.estimatedEnd,
    });

    wssInstance.clients.forEach((client) => {
      const authWs = client as AuthenticatedWebSocket;
      if (!this.isUserAdmin(authWs.systemRole)) {
        try {
          authWs.send(payload);
          // Code 4003: Service Unavailable - Maintenance
          authWs.close(4003, 'System Maintenance Active');
          kickedCount++;
        } catch {
          authWs.terminate();
        }
      }
    });

    logger.info(`Maintenance kicks enforced: ${kickedCount} non-admin sockets terminated`);
    return kickedCount;
  }
}

export const maintenanceManager = new MaintenanceManager();
