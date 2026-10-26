import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';
import { StorageAnalyticsPayload, OrphanFileInfo, StorageCategoryUsage } from '@shared/types';

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const CATEGORIES = ['avatars', 'images', 'voice', 'docs'] as const;
type CategoryName = typeof CATEGORIES[number];

/**
 * Ensures upload directories exist on disk
 */
export function ensureUploadDirectories(): void {
  for (const cat of CATEGORIES) {
    const dir = path.join(UPLOAD_ROOT, cat);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Calculates byte size and file count for a directory recursively
 */
export async function getDirectoryStats(dirPath: string): Promise<StorageCategoryUsage> {
  let bytes = 0;
  let count = 0;

  if (!fs.existsSync(dirPath)) {
    return { bytes: 0, count: 0 };
  }

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        try {
          const stats = await fs.promises.stat(fullPath);
          bytes += stats.size;
          count += 1;
        } catch {
          // File might have been removed concurrently
        }
      } else if (entry.isDirectory()) {
        const sub = await getDirectoryStats(fullPath);
        bytes += sub.bytes;
        count += sub.count;
      }
    }
  } catch (err) {
    console.error(`[storageScanner] Error reading directory ${dirPath}:`, err);
  }

  return { bytes, count };
}

/**
 * Gathers complete storage breakdown across upload categories
 */
export async function getStorageAnalytics(): Promise<StorageAnalyticsPayload> {
  ensureUploadDirectories();

  const [avatars, images, voice, docs] = await Promise.all([
    getDirectoryStats(path.join(UPLOAD_ROOT, 'avatars')),
    getDirectoryStats(path.join(UPLOAD_ROOT, 'images')),
    getDirectoryStats(path.join(UPLOAD_ROOT, 'voice')),
    getDirectoryStats(path.join(UPLOAD_ROOT, 'docs')),
  ]);

  const totalBytes = avatars.bytes + images.bytes + voice.bytes + docs.bytes;
  const totalFiles = avatars.count + images.count + voice.count + docs.count;

  return {
    totalBytes,
    totalFiles,
    categories: {
      avatars,
      images,
      voice,
      docs,
    },
  };
}

/**
 * Scans disk files and reconciles against MySQL active media references.
 * Applies 15-minute in-flight safety buffer to avoid purging newly uploaded files.
 */
export async function scanOrphanFiles(): Promise<OrphanFileInfo[]> {
  ensureUploadDirectories();
  const now = Date.now();

  // 1. Concurrently fetch all active media URLs from database
  const [messages, users, chats] = await Promise.all([
    prisma.message.findMany({
      where: { mediaUrl: { not: null } },
      select: { mediaUrl: true },
    }),
    prisma.user.findMany({
      where: { avatarUrl: { not: null } },
      select: { avatarUrl: true },
    }),
    prisma.chat.findMany({
      where: { groupAvatarUrl: { not: null } },
      select: { groupAvatarUrl: true },
    }),
  ]);

  const activeFilenames = new Set<string>();

  const extractFilename = (url?: string | null) => {
    if (!url) return;
    const cleanUrl = url.split('?')[0].split('#')[0];
    const parts = cleanUrl.split('/');
    const name = parts[parts.length - 1];
    if (name) {
      activeFilenames.add(name);
      activeFilenames.add(cleanUrl);
    }
  };

  messages.forEach((m) => extractFilename(m.mediaUrl));
  users.forEach((u) => extractFilename(u.avatarUrl));
  chats.forEach((c) => extractFilename(c.groupAvatarUrl));

  const orphanCandidates: OrphanFileInfo[] = [];

  // 2. Traverse each category on disk
  for (const cat of CATEGORIES) {
    const dir = path.join(UPLOAD_ROOT, cat);
    if (!fs.existsSync(dir)) continue;

    const files = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      if (!file.isFile()) continue;

      const fullPath = path.join(dir, file.name);
      try {
        const stats = await fs.promises.stat(fullPath);

        // 15-minute safety buffer: Skip files created/modified within the last 15 minutes
        if (now - stats.mtimeMs < FIFTEEN_MINUTES_MS) {
          continue;
        }

        const relativePath = `/uploads/${cat}/${file.name}`;

        // Check if file is referenced in MySQL
        const isReferenced =
          activeFilenames.has(file.name) ||
          activeFilenames.has(relativePath) ||
          activeFilenames.has(`uploads/${cat}/${file.name}`);

        if (!isReferenced) {
          orphanCandidates.push({
            id: `orphan-${cat}-${file.name}`,
            filename: file.name,
            relativePath,
            sizeBytes: stats.size,
            category: cat,
            modifiedAt: stats.mtime.toISOString(),
          });
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  return orphanCandidates;
}

/**
 * Safely purges an approved list of orphan files
 */
export async function purgeOrphanFiles(
  relativePaths: string[],
  adminUserId?: string,
  ipAddress: string = '127.0.0.1'
): Promise<{ filesDeleted: number; bytesReclaimed: number }> {
  let filesDeleted = 0;
  let bytesReclaimed = 0;

  for (const relPath of relativePaths) {
    // Sanitize path traversal
    const normalized = path.normalize(relPath).replace(/^[/\\]+/, '');
    if (!normalized.startsWith('uploads') || normalized.includes('..')) {
      console.warn(`[storageScanner] Blocked unsafe purge path: ${relPath}`);
      continue;
    }

    const fullPath = path.join(process.cwd(), 'public', normalized);

    if (fs.existsSync(fullPath)) {
      try {
        const stats = await fs.promises.stat(fullPath);
        await fs.promises.unlink(fullPath);
        filesDeleted += 1;
        bytesReclaimed += stats.size;
      } catch (err) {
        console.error(`[storageScanner] Failed to unlink ${fullPath}:`, err);
      }
    }
  }

  // Record action in audit log
  try {
    await prisma.auditLog.create({
      data: {
        userId: adminUserId || null,
        action: 'STORAGE_ORPHANS_PURGED',
        resource: 'NVMe Storage',
        ipAddress,
        metadata: JSON.stringify({
          filesDeleted,
          bytesReclaimed,
          purgedPaths: relativePaths.slice(0, 50),
        }),
      },
    });
  } catch (err) {
    console.warn('[storageScanner] Could not record audit log:', err);
  }

  return { filesDeleted, bytesReclaimed };
}
