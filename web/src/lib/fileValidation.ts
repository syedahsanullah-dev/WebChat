/**
 * Enterprise Document Mime-Type & File Size Whitelist Validator
 * Enforces maximum 25MB file size limit ($0 added cost constraint on Hostinger NVMe)
 */

export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 Megabytes

export const ALLOWED_DOCUMENT_MIMES = [
  // PDF
  'application/pdf',
  // Excel
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  // Word
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  // PowerPoint
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  // Zip & Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-tar',
  'application/gzip',
  // Text
  'text/plain',
] as const;

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  'pdf',
  'xlsx',
  'xls',
  'csv',
  'docx',
  'doc',
  'pptx',
  'ppt',
  'zip',
  'tar',
  'gz',
  'txt',
] as const;

export type DocumentCategory = 'pdf' | 'excel' | 'word' | 'ppt' | 'zip' | 'text' | 'file';

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop()?.toLowerCase() || '';
}

export function sanitizeFilename(filename: string): string {
  // Strip null bytes and directory traversal characters
  const base = filename.replace(/^.*[\\/]/, '');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function getDocumentCategory(filename: string, mimeType?: string): DocumentCategory {
  const ext = getFileExtension(filename);
  const mime = (mimeType || '').toLowerCase();

  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet') || mime === 'text/csv') return 'excel';
  if (['docx', 'doc'].includes(ext) || mime.includes('word')) return 'word';
  if (['pptx', 'ppt'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) return 'ppt';
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext) || mime.includes('zip') || mime.includes('tar') || mime.includes('compressed')) return 'zip';
  if (ext === 'txt' || mime === 'text/plain') return 'text';
  return 'file';
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function validateDocumentFile(
  fileSize: number,
  filename: string,
  mimeType?: string
): { isValid: boolean; error?: string } {
  if (fileSize > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size (${formatFileSize(fileSize)}) exceeds the maximum allowed limit of 25MB.`,
    };
  }

  const ext = getFileExtension(filename);
  const isExtAllowed = (ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext);

  if (!isExtAllowed) {
    return {
      isValid: false,
      error: `Unsupported file type (.${ext}). Allowed: PDF, Excel, Word, PowerPoint, Zip, and Text documents.`,
    };
  }

  return { isValid: true };
}
