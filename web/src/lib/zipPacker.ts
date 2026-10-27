import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { PassThrough } from 'stream';

export interface FileToArchive {
  name: string;
  content?: string | Buffer;
  diskPath?: string;
}

/**
 * Creates a .zip archive stream bundling transcript files and optional media.
 */
export function createZipArchive(files: FileToArchive[]): PassThrough {
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });

  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  for (const item of files) {
    if (item.content !== undefined) {
      archive.append(item.content, { name: item.name });
    } else if (item.diskPath && fs.existsSync(item.diskPath)) {
      archive.file(item.diskPath, { name: item.name });
    }
  }

  archive.finalize().catch((err) => {
    passThrough.destroy(err);
  });

  return passThrough;
}
