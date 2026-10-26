import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { PREDEFINED_DLP_RULES } from '@/lib/dlpPatterns';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/dlp
 * Retrieves all DLP rules, auto-seeding default rules if table is empty
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  try {
    let rules = await prisma.dlpRule.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Auto-seed default rules if empty
    if (rules.length === 0) {
      await prisma.dlpRule.createMany({
        data: PREDEFINED_DLP_RULES.map((rule) => ({
          name: rule.name,
          pattern: rule.pattern,
          category: rule.category,
          action: rule.action,
          isActive: true,
          matchCount: 0,
        })),
      });

      rules = await prisma.dlpRule.findMany({
        orderBy: { createdAt: 'asc' },
      });
    }

    return NextResponse.json({
      success: true,
      rules,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch DLP rules', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/dlp
 * Creates a new custom DLP regex rule with regex syntax validation
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }
    const { name, pattern, category = 'CUSTOM', action = 'BLOCK' } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Rule name is required' }, { status: 400 });
    }

    if (!pattern || typeof pattern !== 'string' || !pattern.trim()) {
      return NextResponse.json({ error: 'Regex pattern is required' }, { status: 400 });
    }

    // Validate regex syntax to protect engine from fatal RegExp parsing errors
    try {
      new RegExp(pattern);
    } catch (regexErr) {
      return NextResponse.json(
        { error: `Invalid regex syntax: ${(regexErr as Error).message}` },
        { status: 400 }
      );
    }

    const newRule = await prisma.dlpRule.create({
      data: {
        name: name.trim(),
        pattern: pattern.trim(),
        category: category.toUpperCase(),
        action: action.toUpperCase() === 'WARN' ? 'WARN' : action.toUpperCase() === 'LOG' ? 'LOG' : 'BLOCK',
        isActive: true,
        matchCount: 0,
      },
    });

    // Audit log
    await prisma.auditLog
      .create({
        data: {
          userId: auth.user.id,
          action: 'DLP_RULE_CREATED',
          resource: 'DLP_RULE',
          entityId: newRule.id,
          metadata: JSON.stringify({
            name: newRule.name,
            pattern: newRule.pattern,
            category: newRule.category,
            action: newRule.action,
          }),
        },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      rule: newRule,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create DLP rule', details: (error as Error).message },
      { status: 500 }
    );
  }
}
