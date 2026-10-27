import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getAuthUserFromRequest } from '@/lib/auth';
import {
  validateDocumentFile,
  sanitizeFilename,
} from '@/lib/fileValidation';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * POST /api/uploads/document
 * Secure local NVMe document upload pipeline ($0 added monthly cost)
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    const originalName = file.name || 'document';
    const validation = validateDocumentFile(file.size, originalName, file.type);

    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Prepare destination folder in public/uploads/docs/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'docs');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    // Sanitize and generate unique disk filename
    const safeBaseName = sanitizeFilename(originalName);
    const uniquePrefix = crypto.randomUUID().slice(0, 8);
    const diskFilename = `${uniquePrefix}-${safeBaseName}`;
    const destinationPath = path.join(uploadDir, diskFilename);

    // Write file buffer to local disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(destinationPath, buffer);

    const publicUrl = `/uploads/docs/${diskFilename}`;

    return NextResponse.json(
      {
        url: publicUrl,
        name: originalName,
        size: file.size,
        mime: file.type || 'application/octet-stream',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/uploads/document:', error);
    return NextResponse.json(
      { error: 'Failed to process document upload' },
      { status: 500 }
    );
  }
}
