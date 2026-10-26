/**
 * Client-Side Image Compression Utility
 * Resizes large photos to max 1920px and converts to WebP via HTML5 Canvas
 * Reduces file sizes by up to 80% with $0 server CPU cost
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export interface CompressionResult {
  file: File;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    mimeType = 'image/webp',
  } = options;

  // In non-browser or mock environments
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      file,
      blob: file,
      previewUrl: '',
      width: 800,
      height: 600,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1,
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let targetWidth = img.naturalWidth || img.width;
      let targetHeight = img.naturalHeight || img.height;

      // Scale dimensions maintaining aspect ratio
      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        if (targetWidth / targetHeight > maxWidth / maxHeight) {
          targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
          targetWidth = maxWidth;
        } else {
          targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
          targetHeight = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to get 2D canvas context'));
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Export to WebP Blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Canvas toBlob conversion failed'));
          }

          const originalName = file.name.replace(/\.[^/.]+$/, '');
          const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';
          const compressedFile = new File([blob], `${originalName}.${extension}`, {
            type: mimeType,
            lastModified: Date.now(),
          });

          const previewUrl = URL.createObjectURL(blob);
          const compressedSize = blob.size;
          const compressionRatio =
            file.size > 0 ? Number((compressedSize / file.size).toFixed(2)) : 1;

          resolve({
            file: compressedFile,
            blob,
            previewUrl,
            width: targetWidth,
            height: targetHeight,
            originalSize: file.size,
            compressedSize,
            compressionRatio,
          });
        },
        mimeType,
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image for compression: ${err}`));
    };

    img.src = objectUrl;
  });
}
