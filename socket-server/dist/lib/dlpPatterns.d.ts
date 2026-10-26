/**
 * Core Data Loss Prevention (DLP) Regex Pattern Catalog & Evaluator
 * High performance in-memory scanner (< 1ms per message)
 */
export interface PredefinedDlpRule {
    id: string;
    name: string;
    category: 'CREDENTIALS' | 'FINANCIAL' | 'IDENTITY' | 'CUSTOM';
    pattern: string;
    action: 'BLOCK' | 'WARN' | 'LOG';
    description: string;
    validator?: (match: string) => boolean;
}
/**
 * Validates a credit card number using Luhn's algorithm
 */
export declare function validateLuhn(ccNumber: string): boolean;
export declare const PREDEFINED_DLP_RULES: PredefinedDlpRule[];
export interface DlpScanResult {
    isBlocked: boolean;
    matchedRule?: {
        id: string;
        name: string;
        category: string;
        action: string;
    };
    matchedSnippet?: string;
}
export declare function scanMessageContent(content: string, rules: Array<{
    id: string;
    name: string;
    pattern: string;
    category: string;
    action: string;
    isActive?: boolean;
}>): DlpScanResult;
