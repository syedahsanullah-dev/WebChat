import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { scanOrphanFiles } from '@/lib/storageScanner';

/**
 * GET /api/admin/storage/orphan-scan
 * Dry-run orphan file scanner comparing disk files with MySQL references.
 * Applies a 15-minute in-flight safety buffer to avoid flagging fresh uploads.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const orphanCandidates = await scanOrphanFiles();
    const totalBytesReclaimable = orphanCandidates.reduce((acc, f) => acc + f.sizeBytes, 0);

    return NextResponse.json(
      {
        totalOrphans: orphanCandidates.length,
        totalBytesReclaimable,
        files: orphanCandidates,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/admin/storage/orphan-scan:', error);
    return NextResponse.json(
      { error: 'Internal server error scanning for orphan media' },
      { status: 500 }
    );
  }
}
