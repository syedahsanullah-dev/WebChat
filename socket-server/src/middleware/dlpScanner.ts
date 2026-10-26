import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { PREDEFINED_DLP_RULES, scanMessageContent, DlpScanResult } from '../lib/dlpPatterns.js';
import { AuthenticatedWebSocket } from '../lib/roomManager.js';
import { WsEnvelope, ErrorPayload } from '../types/index.js';

interface CachedRule {
  id: string;
  name: string;
  pattern: string;
  category: string;
  action: string;
  isActive: boolean;
}

class DlpScannerEngine {
  private activeRules: CachedRule[] = [];
  private lastRefresh = 0;
  private readonly REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initDefaultRules();
  }

  private initDefaultRules(): void {
    this.activeRules = PREDEFINED_DLP_RULES.map((rule) => ({
      id: rule.id,
      name: rule.name,
      pattern: rule.pattern,
      category: rule.category,
      action: rule.action,
      isActive: true,
    }));
  }

  /**
   * Refreshes active DLP rules from database or falls back to defaults
   */
  public async refreshRules(): Promise<void> {
    try {
      const dbRules = await prisma.dlpRule.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          pattern: true,
          category: true,
          action: true,
          isActive: true,
        },
      });

      if (dbRules && dbRules.length > 0) {
        this.activeRules = dbRules;
      } else {
        this.initDefaultRules();
      }
      this.lastRefresh = Date.now();
    } catch (err) {
      logger.debug(`DLP rule cache refresh non-fatal: ${(err as Error).message}`);
      if (this.activeRules.length === 0) {
        this.initDefaultRules();
      }
    }
  }

  /**
   * Evaluates message content in memory (< 1ms execution time)
   */
  public async evaluateMessage(content: string): Promise<DlpScanResult> {
    // Check if background refresh is needed
    if (Date.now() - this.lastRefresh > this.REFRESH_INTERVAL_MS) {
      this.refreshRules().catch(() => {});
    }

    return scanMessageContent(content, this.activeRules);
  }

  /**
   * Dispatches error envelope to sender, logs audit trail and updates match counter
   */
  public async handleViolation(
    socket: AuthenticatedWebSocket,
    content: string,
    result: DlpScanResult
  ): Promise<void> {
    const errorEnvelope: WsEnvelope<ErrorPayload> = {
      type: 'error',
      payload: {
        code: 'DLP_BLOCKED',
        message: 'Message blocked: Contains sensitive credential or financial data.',
        details: {
          category: result.matchedRule?.category,
          ruleName: result.matchedRule?.name,
        },
      },
    };

    socket.send(JSON.stringify(errorEnvelope));
    logger.warn(`DLP violation intercepted for user ${socket.userId}: Rule ${result.matchedRule?.name}`);

    // Asynchronously update DB audit trail and match counter without blocking WebSocket loop
    Promise.all([
      prisma.dlpRule
        .update({
          where: { id: result.matchedRule?.id },
          data: { matchCount: { increment: 1 } },
        })
        .catch(() => {}),
      prisma.auditLog
        .create({
          data: {
            userId: socket.userId,
            action: 'DLP_VIOLATION_BLOCKED',
            resource: 'MESSAGE',
            metadata: JSON.stringify({
              ruleId: result.matchedRule?.id,
              ruleName: result.matchedRule?.name,
              category: result.matchedRule?.category,
              snippet: result.matchedSnippet,
            }),
          },
        })
        .catch(() => {}),
    ]).catch((err) => logger.debug(`DLP logging error: ${err.message}`));
  }
}

export const dlpScanner = new DlpScannerEngine();
// Kick off initial rule fetch
dlpScanner.refreshRules().catch(() => {});
