import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/dlp/:id
 * Updates rule status (isActive), action (BLOCK/WARN/LOG), or pattern
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const { id } = await params;
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }
    const { isActive, action, name, pattern, category } = body;

    const existingRule = await prisma.dlpRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'DLP rule not found' }, { status: 404 });
    }

    if (pattern) {
      try {
        new RegExp(pattern);
      } catch (regexErr) {
        return NextResponse.json(
          { error: `Invalid regex syntax: ${(regexErr as Error).message}` },
          { status: 400 }
        );
      }
    }

    const updatedRule = await prisma.dlpRule.update({
      where: { id },
      data: {
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        action: action ? action.toUpperCase() : undefined,
        name: name ? name.trim() : undefined,
        pattern: pattern ? pattern.trim() : undefined,
        category: category ? category.toUpperCase() : undefined,
      },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: auth.user.id,
          action: 'DLP_RULE_UPDATED',
          resource: 'DLP_RULE',
          entityId: id,
          metadata: JSON.stringify({
            previous: {
              isActive: existingRule.isActive,
              action: existingRule.action,
            },
            updated: {
              isActive: updatedRule.isActive,
              action: updatedRule.action,
            },
          }),
        },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      rule: updatedRule,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update DLP rule', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/dlp/:id
 * Removes a custom DLP rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const { id } = await params;

    const existingRule = await prisma.dlpRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'DLP rule not found' }, { status: 404 });
    }

    await prisma.dlpRule.delete({
      where: { id },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: auth.user.id,
          action: 'DLP_RULE_DELETED',
          resource: 'DLP_RULE',
          entityId: id,
          metadata: JSON.stringify({
            name: existingRule.name,
            pattern: existingRule.pattern,
          }),
        },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'DLP rule deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete DLP rule', details: (error as Error).message },
      { status: 500 }
    );
  }
}
