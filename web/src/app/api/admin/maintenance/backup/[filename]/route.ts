import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getBackupsDirectory, deleteBackup } from '@/lib/backupGenerator';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) return auth.response;

  try {
    const { filename } = await params;

    // Validate filename to prevent path traversal
    if (!/^[a-zA-Z0-9_\-.]+\.sql(\.gz)?$/.test(filename)) {
      return NextResponse.json({ error: 'Invalid backup filename' }, { status: 400 });
    }

    const dir = getBackupsDirectory();
    const filePath = path.join(dir, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const contentType = filename.endsWith('.gz') ? 'application/gzip' : 'application/sql';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Failed to download backup:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to download backup file' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const auth = await verifyAdminRequest(request, 'SUPER_ADMIN');
  if ('response' in auth) return auth.response;

  try {
    const { filename } = await params;

    if (!/^[a-zA-Z0-9_\-.]+\.sql(\.gz)?$/.test(filename)) {
      return NextResponse.json({ error: 'Invalid backup filename' }, { status: 400 });
    }

    const deleted = deleteBackup(filename);
    if (!deleted) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'EMERGENCY_BACKUP_DELETED',
        resource: 'SYSTEM',
        entityId: filename,
        metadata: JSON.stringify({ filename }),
      },
    });

    return NextResponse.json({ message: 'Backup file deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete backup:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete backup file' },
      { status: 500 }
    );
  }
}
