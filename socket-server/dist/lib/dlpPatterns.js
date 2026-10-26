"use strict";
/**
 * Core Data Loss Prevention (DLP) Regex Pattern Catalog & Evaluator
 * High performance in-memory scanner (< 1ms per message)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREDEFINED_DLP_RULES = void 0;
exports.validateLuhn = validateLuhn;
exports.scanMessageContent = scanMessageContent;
/**
 * Validates a credit card number using Luhn's algorithm
 */
function validateLuhn(ccNumber) {
    const digits = ccNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19)
        return false;
    let sum = 0;
    let isEven = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits.charAt(i), 10);
        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        sum += digit;
        isEven = !isEven;
    }
    return sum % 10 === 0;
}
exports.PREDEFINED_DLP_RULES = [
    {
        id: 'dlp-aws-keys',
        name: 'AWS Access Key ID',
        category: 'CREDENTIALS',
        pattern: '(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}',
        action: 'BLOCK',
        description: 'Detects standard 20-character AWS IAM and STS user/role access keys.',
    },
    {
        id: 'dlp-ssh-private-keys',
        name: 'SSH / RSA Private Keys',
        category: 'CREDENTIALS',
        pattern: '-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----[\\s\\S]*?-----END',
        action: 'BLOCK',
        description: 'Detects raw PEM and OpenSSH cryptographic private keys.',
    },
    {
        id: 'dlp-credit-cards',
        name: 'Credit Card Numbers',
        category: 'FINANCIAL',
        pattern: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\\d{3})\\d{11})\\b',
        action: 'BLOCK',
        description: 'Detects Visa, MasterCard, Amex, Discover, Diners Club and JCB numbers with Luhn verification.',
        validator: (match) => validateLuhn(match),
    },
    {
        id: 'dlp-us-ssn',
        name: 'US Social Security Number (SSN)',
        category: 'IDENTITY',
        pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
        action: 'BLOCK',
        description: 'Detects standard 9-digit US Social Security Numbers.',
    },
    {
        id: 'dlp-secret-keys',
        name: 'Generic API & Secret Keys',
        category: 'CREDENTIALS',
        pattern: '(?:api_key|apikey|secret_key|private_key)\\s*[:=]\\s*["\']?[A-Za-z0-9_\\-]{20,}["\']?',
        action: 'BLOCK',
        description: 'Detects API key variable assignments with token entropy.',
    },
];
function scanMessageContent(content, rules) {
    if (!content || typeof content !== 'string') {
        return { isBlocked: false };
    }
    for (const rule of rules) {
        if (rule.isActive === false)
            continue;
        try {
            const regex = new RegExp(rule.pattern, 'i');
            const match = regex.exec(content);
            if (match) {
                const matchedText = match[0];
                if (rule.id === 'dlp-credit-cards' || rule.category === 'FINANCIAL') {
                    if (!validateLuhn(matchedText)) {
                        continue;
                    }
                }
                return {
                    isBlocked: rule.action === 'BLOCK',
                    matchedRule: {
                        id: rule.id,
                        name: rule.name,
                        category: rule.category,
                        action: rule.action,
                    },
                    matchedSnippet: matchedText.length > 30 ? matchedText.slice(0, 27) + '...' : matchedText,
                };
            }
        }
        catch {
            // Ignore invalid regex patterns safely
        }
    }
    return { isBlocked: false };
}
