import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { spawn } from 'child_process';
import { prisma } from './prisma';

export interface BackupMetadata {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  filePath: string;
}

const BACKUPS_DIR = path.resolve(process.cwd(), '../backups');

export function getBackupsDirectory(): string {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
  return BACKUPS_DIR;
}

/**
 * Parses MySQL connection string into connection parts
 */
export function parseDatabaseUrl(dbUrl?: string) {
  const urlString = dbUrl || process.env.DATABASE_URL || '';
  try {
    const parsed = new URL(urlString.replace(/^mysql:\/\//, 'http://'));
    return {
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      host: parsed.hostname || 'localhost',
      port: parsed.port || '3306',
      database: parsed.pathname.replace(/^\//, '') || 'webchat',
    };
  } catch {
    return {
      user: 'root',
      password: '',
      host: 'localhost',
      port: '3306',
      database: 'webchat',
    };
  }
}

/**
 * Fallback Prisma SQL dumper when mysqldump CLI is not installed on system
 */
async function fallbackPrismaDump(): Promise<string> {
  const tables = [
    'users',
    'contacts',
    'chats',
    'chat_participants',
    'messages',
    'message_statuses',
    'call_logs',
    'user_sessions',
    'user_public_keys',
    'user_push_subscriptions',
    'system_broadcasts',
    'dlp_rules',
    'audit_logs',
    'system_settings',
  ];

  let sqlDump = `-- WebChat Emergency Database Backup\n`;
  sqlDump += `-- Generated: ${new Date().toISOString()}\n`;
  sqlDump += `-- Engine: MariaDB / MySQL Hostinger Enterprise\n\n`;
  sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  for (const table of tables) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM \`${table}\``);
      if (rows && rows.length > 0) {
        sqlDump += `-- Data for table \`${table}\` (${rows.length} rows)\n`;
        const columns = Object.keys(rows[0]);
        const colList = columns.map((c) => `\`${c}\``).join(', ');

        for (const row of rows) {
          const values = columns.map((col) => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number' || typeof val === 'boolean') return String(val);
            if (val instanceof Date) return `'${val.toISOString()}'`;
            const escaped = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return `'${escaped}'`;
          });
          sqlDump += `INSERT INTO \`${table}\` (${colList}) VALUES (${values.join(', ')});\n`;
        }
        sqlDump += `\n`;
      }
    } catch {
      // Non-fatal if table doesn't exist yet
    }
  }

  sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  return sqlDump;
}

/**
 * Creates an on-demand compressed .sql.gz database backup
 */
export async function createEmergencyBackup(): Promise<BackupMetadata> {
  const dir = getBackupsDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_webchat_${timestamp}.sql.gz`;
  const filePath = path.join(dir, filename);

  const dbConfig = parseDatabaseUrl();

  // Try native mysqldump execution first
  const tryMysqldump = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const args = [
        `-u${dbConfig.user}`,
        `-h${dbConfig.host}`,
        `-P${dbConfig.port}`,
        dbConfig.database,
      ];
      if (dbConfig.password) {
        args.splice(1, 0, `-p${dbConfig.password}`);
      }

      const dumpProcess = spawn('mysqldump', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      const gzip = zlib.createGzip();
      const output = fs.createWriteStream(filePath);

      dumpProcess.stdout.pipe(gzip).pipe(output);

      dumpProcess.on('error', () => {
        resolve(false);
      });

      dumpProcess.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  };

  const success = await tryMysqldump();

  if (!success) {
    // Execute reliable Prisma in-memory fallback dumper
    const sqlContent = await fallbackPrismaDump();
    const compressed = zlib.gzipSync(Buffer.from(sqlContent, 'utf-8'));
    fs.writeFileSync(filePath, compressed);
  }

  const stat = fs.statSync(filePath);
  return {
    filename,
    sizeBytes: stat.size,
    createdAt: new Date().toISOString(),
    filePath,
  };
}

/**
 * Lists all existing backups sorted newest first
 */
export function listBackups(): BackupMetadata[] {
  const dir = getBackupsDirectory();
  const files = fs.readdirSync(dir);

  const backups: BackupMetadata[] = [];
  for (const file of files) {
    if (file.endsWith('.sql.gz') || file.endsWith('.sql')) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        backups.push({
          filename: file,
          sizeBytes: stat.size,
          createdAt: stat.birthtime.toISOString(),
          filePath: fullPath,
        });
      } catch {
        // Skip unreadable files
      }
    }
  }

  return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Safely deletes a backup file by filename
 */
export function deleteBackup(filename: string): boolean {
  if (!/^[a-zA-Z0-9_\-.]+\.sql(\.gz)?$/.test(filename)) {
    throw new Error('Invalid backup filename');
  }
  const dir = getBackupsDirectory();
  const targetPath = path.join(dir, filename);
  if (!fs.existsSync(targetPath)) {
    return false;
  }
  fs.unlinkSync(targetPath);
  return true;
}

