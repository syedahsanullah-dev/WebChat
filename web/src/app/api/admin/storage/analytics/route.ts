import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getStorageAnalytics } from '@/lib/storageScanner';

/**
 * GET /api/admin/storage/analytics
 * Returns disk usage breakdown across all upload categories (Avatars, Images, Voice, Docs)
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const analytics = await getStorageAnalytics();
    return NextResponse.json(analytics, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/admin/storage/analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error calculating storage usage' },
      { status: 500 }
    );
  }
}
