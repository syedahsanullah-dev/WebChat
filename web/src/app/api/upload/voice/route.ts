import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MAX_VOICE_SIZE = 20 * 1024 * 1024; // 20MB limit
const ALLOWED_MIME_PREFIXES = ['audio/'];

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const durationStr = formData.get('duration') as string | null;
    const peaksStr = formData.get('peaks') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No audio file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_VOICE_SIZE) {
      return NextResponse.json(
        { error: `Voice recording exceeds 20MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)` },
        { status: 400 }
      );
    }

    const isAudioType =
      ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix)) ||
      file.type === 'video/webm' || // Some browsers record audio into video/webm container
      file.name.endsWith('.webm') ||
      file.name.endsWith('.ogg') ||
      file.name.endsWith('.mp3');

    if (!isAudioType) {
      return NextResponse.json(
        { error: `Invalid audio format: ${file.type || 'unknown'}` },
        { status: 400 }
      );
    }

    // Determine extension
    let extension = 'webm';
    if (file.type.includes('ogg')) extension = 'ogg';
    else if (file.type.includes('mp4') || file.type.includes('m4a')) extension = 'm4a';
    else if (file.type.includes('mp3') || file.type.includes('mpeg')) extension = 'mp3';
    else if (file.type.includes('wav')) extension = 'wav';

    const filename = `${crypto.randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'voice');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.promises.writeFile(filePath, buffer);

    const mediaUrl = `/uploads/voice/${filename}`;
    const mediaDuration = durationStr ? Math.max(0, parseFloat(durationStr)) : 0;

    let waveform: number[] = [];
    if (peaksStr) {
      try {
        const parsed = JSON.parse(peaksStr);
        if (Array.isArray(parsed)) {
          waveform = parsed.map((p) => Number(p));
        }
      } catch {
        waveform = [];
      }
    }

    return NextResponse.json(
      {
        mediaUrl,
        mediaDuration,
        waveform,
        mediaSize: buffer.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/upload/voice:', error);
    return NextResponse.json(
      { error: 'Internal server error processing voice upload' },
      { status: 500 }
    );
  }
}
