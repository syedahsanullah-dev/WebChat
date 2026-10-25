import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthUserFromRequest(request);
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      );
    }

    const file = formData.get('avatar') as File | null;
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Please provide an image file under key "avatar"' },
        { status: 400 }
      );
    }

    // Validate MIME type
    const mimeType = file.type;
    const extension = ALLOWED_MIME_TYPES[mimeType];
    if (!extension) {
      return NextResponse.json(
        {
          error: 'Unsupported image format. Allowed formats: PNG, JPEG, WebP',
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image file size exceeds maximum limit of 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const uniqueId = crypto.randomUUID();
    const filename = `${uniqueId}${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: { avatarUrl },
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        avatarUrl: true,
        about: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Avatar uploaded successfully',
        avatarUrl,
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error uploading avatar' },
      { status: 500 }
    );
  }
}
