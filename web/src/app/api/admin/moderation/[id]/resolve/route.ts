import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { resolveAbuseReport } from '@/lib/moderationService';

const VALID_ACTIONS = [
  'DELETE_MESSAGE',
  'WARN_USER',
  'MUTE_USER',
  'SUSPEND_USER',
  'DISMISSED',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, 'MODERATOR');
  if ('response' in auth) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (!body || !body.action) {
      return NextResponse.json({ error: 'Moderation action is required' }, { status: 400 });
    }

    if (!VALID_ACTIONS.includes(body.action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Only full ADMIN or SUPER_ADMIN can suspend users
    if (body.action === 'SUSPEND_USER' && auth.user.systemRole === 'MODERATOR') {
      return NextResponse.json(
        { error: 'Forbidden: Account suspensions require Administrator privileges' },
        { status: 403 }
      );
    }

    const updatedReport = await resolveAbuseReport(auth.user.id, id, body);

    return NextResponse.json({
      success: true,
      report: updatedReport,
      message: `Report successfully resolved with action: ${body.action}`,
    });
  } catch (error: any) {
    console.error('Failed to resolve abuse report:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error resolving report' },
      { status: 500 }
    );
  }
}
