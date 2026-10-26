import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB limit
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
]);

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 15MB limit (received ${(file.size / 1024 / 1024).toFixed(1)}MB)` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Determine extension
    let extension = 'webp';
    if (file.type === 'image/jpeg') extension = 'jpg';
    else if (file.type === 'image/png') extension = 'png';
    else if (file.type === 'image/gif') extension = 'gif';

    const filename = `${crypto.randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.promises.writeFile(filePath, buffer);

    const mediaUrl = `/uploads/images/${filename}`;

    return NextResponse.json(
      {
        mediaUrl,
        mediaSize: buffer.length,
        fileName: file.name,
        mimeType: file.type,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/upload/image:', error);
    return NextResponse.json(
      { error: 'Internal server error processing image upload' },
      { status: 500 }
    );
  }
}
