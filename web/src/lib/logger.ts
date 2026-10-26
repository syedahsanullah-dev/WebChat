import path from 'path';
import fs from 'fs';
import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Standard log formatter
const logFormat = printf(({ level, message, timestamp: time, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${time} [${level}]: ${stack || message}${metaStr}`;
});

// Determine log directory (default to process.cwd()/logs)
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Safely ensure log directory exists on server without crashing
try {
  if (typeof window === 'undefined' && !fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch {
  // Gracefully fallback if disk permissions are restricted in certain environments
}

// Build transport list
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      logFormat
    ),
  }),
];

// In server runtime, append file transports for zero-cost error logging
if (typeof window === 'undefined') {
  try {
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'app-error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10 MB per file
        maxFiles: 14, // 14 days retention
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          logFormat
        ),
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'app-combined.log'),
        level: 'info',
        maxsize: 10 * 1024 * 1024, // 10 MB per file
        maxFiles: 7, // 7 days retention
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          logFormat
        ),
      })
    );
  } catch {
    // If file transport initialization fails, console logging remains active
  }
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports,
  exitOnError: false,
});

export default logger;
