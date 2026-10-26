"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dlpScanner = void 0;
const prisma_js_1 = require("../lib/prisma.js");
const logger_js_1 = require("../lib/logger.js");
const dlpPatterns_js_1 = require("../lib/dlpPatterns.js");
class DlpScannerEngine {
    activeRules = [];
    lastRefresh = 0;
    REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    constructor() {
        this.initDefaultRules();
    }
    initDefaultRules() {
        this.activeRules = dlpPatterns_js_1.PREDEFINED_DLP_RULES.map((rule) => ({
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
    async refreshRules() {
        try {
            const dbRules = await prisma_js_1.prisma.dlpRule.findMany({
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
            }
            else {
                this.initDefaultRules();
            }
            this.lastRefresh = Date.now();
        }
        catch (err) {
            logger_js_1.logger.debug(`DLP rule cache refresh non-fatal: ${err.message}`);
            if (this.activeRules.length === 0) {
                this.initDefaultRules();
            }
        }
    }
    /**
     * Evaluates message content in memory (< 1ms execution time)
     */
    async evaluateMessage(content) {
        // Check if background refresh is needed
        if (Date.now() - this.lastRefresh > this.REFRESH_INTERVAL_MS) {
            this.refreshRules().catch(() => { });
        }
        return (0, dlpPatterns_js_1.scanMessageContent)(content, this.activeRules);
    }
    /**
     * Dispatches error envelope to sender, logs audit trail and updates match counter
     */
    async handleViolation(socket, content, result) {
        const errorEnvelope = {
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
        logger_js_1.logger.warn(`DLP violation intercepted for user ${socket.userId}: Rule ${result.matchedRule?.name}`);
        // Asynchronously update DB audit trail and match counter without blocking WebSocket loop
        Promise.all([
            prisma_js_1.prisma.dlpRule
                .update({
                where: { id: result.matchedRule?.id },
                data: { matchCount: { increment: 1 } },
            })
                .catch(() => { }),
            prisma_js_1.prisma.auditLog
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
                .catch(() => { }),
        ]).catch((err) => logger_js_1.logger.debug(`DLP logging error: ${err.message}`));
    }
}
exports.dlpScanner = new DlpScannerEngine();
// Kick off initial rule fetch
exports.dlpScanner.refreshRules().catch(() => { });
