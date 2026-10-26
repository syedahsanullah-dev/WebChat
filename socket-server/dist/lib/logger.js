"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, printf, colorize, errors } = winston_1.default.format;
const logFormat = printf(({ level, message, timestamp: time, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${time} [${level}]: ${stack || message}${metaStr}`;
});
// Determine log directory (default to process.cwd()/logs)
const logDir = process.env.LOG_DIR || path_1.default.join(process.cwd(), 'logs');
try {
    if (!fs_1.default.existsSync(logDir)) {
        fs_1.default.mkdirSync(logDir, { recursive: true });
    }
}
catch {
    // Gracefully fallback if disk permissions are restricted
}
const transports = [
    new winston_1.default.transports.Console({
        format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
    }),
];
try {
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'socket-error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10 MB per file
        maxFiles: 14, // 14 days retention
        format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
    }), new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'socket-combined.log'),
        level: 'info',
        maxsize: 10 * 1024 * 1024,
        maxFiles: 7,
        format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
    }));
}
catch {
    // If file transport initialization fails, console logging remains active
}
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
    transports,
    exitOnError: false,
});
exports.default = exports.logger;
