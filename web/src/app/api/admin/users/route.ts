import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { SystemRole } from '@shared/types';

/**
 * GET /api/admin/users
 * Paginated, multi-filter user directory data grid API
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'MODERATOR');
  if ('response' in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';
  const role = searchParams.get('role')?.toUpperCase() || 'ALL';
  const status = searchParams.get('status')?.toUpperCase() || 'ALL';
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '25', 10), 1), 100);
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder')?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  // Construct Prisma where clause
  const where: any = {};

  if (search) {
    const cleanSearch = search.replace(/^@/, '');
    where.OR = [
      { username: { contains: cleanSearch } },
      { displayName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (role !== 'ALL') {
    where.systemRole = role;
  }

  if (status === 'ACTIVE') {
    where.isSuspended = false;
  } else if (status === 'SUSPENDED') {
    where.isSuspended = true;
  }

  // Construct sorting order
  const validSortColumns = ['createdAt', 'username', 'displayName', 'lastSeen'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
  const orderBy = { [sortColumn]: sortOrder };

  try {
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          about: true,
          systemRole: true,
          isSuspended: true,
          suspendedAt: true,
          suspendedUntil: true,
          suspensionReason: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
          _count: {
            select: {
              sentMessages: true,
              sessions: true,
              chatParticipants: true,
              initiatedCalls: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        users: users.map((u) => ({
          ...u,
          systemRole: (u.systemRole as SystemRole) || 'USER',
        })),
        pagination: {
          total,
          totalUsers: total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching user directory' },
      { status: 500 }
    );
  }
}
