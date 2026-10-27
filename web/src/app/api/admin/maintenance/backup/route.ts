import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { createEmergencyBackup, listBackups } from '@/lib/backupGenerator';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) return auth.response;

  try {
    const backups = listBackups();
    return NextResponse.json({ backups });
  } catch (error: any) {
    console.error('Failed to list backups:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list database backups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'SUPER_ADMIN');
  if ('response' in auth) return auth.response;

  try {
    const backup = await createEmergencyBackup();

    // Log admin audit event
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'EMERGENCY_BACKUP_CREATED',
        targetType: 'SYSTEM',
        targetId: backup.filename,
        metadata: {
          filename: backup.filename,
          sizeBytes: backup.sizeBytes,
          createdAt: backup.createdAt,
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Emergency database backup created successfully',
        backup,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create emergency backup:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate database backup' },
      { status: 500 }
    );
  }
}
