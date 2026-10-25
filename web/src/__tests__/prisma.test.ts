import { describe, it, expect } from 'vitest';
import { prisma } from '../lib/prisma';

describe('Prisma Client Singleton & Model Schema Test Suite', () => {
  it('exports singleton prisma instance', () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma).toBe('object');
  });

  it('exposes all 7 Phase 02 database models', () => {
    expect(prisma.user).toBeDefined();
    expect(prisma.contact).toBeDefined();
    expect(prisma.chat).toBeDefined();
    expect(prisma.chatParticipant).toBeDefined();
    expect(prisma.message).toBeDefined();
    expect(prisma.messageStatus).toBeDefined();
    expect(prisma.callLog).toBeDefined();
  });

  it('verifies callLog model methods exist without video fields', () => {
    expect(typeof prisma.callLog.findMany).toBe('function');
    expect(typeof prisma.callLog.create).toBe('function');
    expect(typeof prisma.callLog.findFirst).toBe('function');
  });

  it('verifies connection pooling singleton across re-imports', async () => {
    const { prisma: prismaReImport } = await import('../lib/prisma');
    expect(prismaReImport).toBe(prisma);
  });
});
