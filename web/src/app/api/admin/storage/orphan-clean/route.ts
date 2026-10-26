import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { purgeOrphanFiles } from '@/lib/storageScanner';

/**
 * POST /api/admin/storage/orphan-clean
 * Safely purges an approved array of orphan file paths and logs audit event.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { paths } = body;

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { error: 'An array of approved relative file paths is required' },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const result = await purgeOrphanFiles(paths, auth.user.id, ipAddress);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully purged ${result.filesDeleted} orphan file(s) and reclaimed ${result.bytesReclaimed} bytes`,
        filesDeleted: result.filesDeleted,
        bytesReclaimed: result.bytesReclaimed,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/admin/storage/orphan-clean:', error);
    return NextResponse.json(
      { error: 'Internal server error purging orphan files' },
      { status: 500 }
    );
  }
}
