import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const defaultPassword = 'Password123!';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  // 1. Seed Demo Users
  const userAhsan = await prisma.user.upsert({
    where: { username: 'ahsan' },
    update: {
      passwordHash,
      displayName: 'Ahsan Gillani',
      avatarUrl: '/uploads/avatars/ahsan.png',
      about: 'Available for chat. Building high-performance WebChat clone.',
      isOnline: true,
      lastSeen: new Date(),
    },
    create: {
      username: 'ahsan',
      email: 'ahsan@example.com',
      passwordHash,
      displayName: 'Ahsan Gillani',
      avatarUrl: '/uploads/avatars/ahsan.png',
      about: 'Available for chat. Building high-performance WebChat clone.',
      isOnline: true,
      lastSeen: new Date(),
    },
  });

  const userDeveloper = await prisma.user.upsert({
    where: { username: 'developer' },
    update: {
      passwordHash,
      displayName: 'Lead Developer',
      avatarUrl: '/uploads/avatars/developer.png',
      about: 'Fastify + Native ws daemon engineer.',
      isOnline: false,
      lastSeen: new Date(Date.now() - 15 * 60 * 1000),
    },
    create: {
      username: 'developer',
      email: 'developer@example.com',
      passwordHash,
      displayName: 'Lead Developer',
      avatarUrl: '/uploads/avatars/developer.png',
      about: 'Fastify + Native ws daemon engineer.',
      isOnline: false,
      lastSeen: new Date(Date.now() - 15 * 60 * 1000),
    },
  });

  const userDesigner = await prisma.user.upsert({
    where: { username: 'designer' },
    update: {
      passwordHash,
      displayName: 'UI/UX Designer',
      avatarUrl: '/uploads/avatars/designer.png',
      about: 'WhatsApp Web design tokens and pixel perfection.',
      isOnline: false,
      lastSeen: new Date(Date.now() - 60 * 60 * 1000),
    },
    create: {
      username: 'designer',
      email: 'designer@example.com',
      passwordHash,
      displayName: 'UI/UX Designer',
      avatarUrl: '/uploads/avatars/designer.png',
      about: 'WhatsApp Web design tokens and pixel perfection.',
      isOnline: false,
      lastSeen: new Date(Date.now() - 60 * 60 * 1000),
    },
  });

  console.log(`✅ Seeded 3 demo users: @${userAhsan.username}, @${userDeveloper.username}, @${userDesigner.username}`);

  // 2. Seed Mutual Contacts
  await prisma.contact.upsert({
    where: {
      userId_contactUserId: {
        userId: userAhsan.id,
        contactUserId: userDeveloper.id,
      },
    },
    update: { aliasName: 'Dev Lead' },
    create: {
      userId: userAhsan.id,
      contactUserId: userDeveloper.id,
      aliasName: 'Dev Lead',
    },
  });

  await prisma.contact.upsert({
    where: {
      userId_contactUserId: {
        userId: userDeveloper.id,
        contactUserId: userAhsan.id,
      },
    },
    update: { aliasName: 'Ahsan G.' },
    create: {
      userId: userDeveloper.id,
      contactUserId: userAhsan.id,
      aliasName: 'Ahsan G.',
    },
  });

  await prisma.contact.upsert({
    where: {
      userId_contactUserId: {
        userId: userAhsan.id,
        contactUserId: userDesigner.id,
      },
    },
    update: { aliasName: 'Product Designer' },
    create: {
      userId: userAhsan.id,
      contactUserId: userDesigner.id,
      aliasName: 'Product Designer',
    },
  });

  await prisma.contact.upsert({
    where: {
      userId_contactUserId: {
        userId: userDesigner.id,
        contactUserId: userAhsan.id,
      },
    },
    update: { aliasName: 'Ahsan' },
    create: {
      userId: userDesigner.id,
      contactUserId: userAhsan.id,
      aliasName: 'Ahsan',
    },
  });

  console.log('✅ Seeded mutual contacts');

  // 3. Seed Direct Chat between @ahsan and @developer
  let chat = await prisma.chat.findFirst({
    where: {
      isGroup: false,
      participants: {
        every: {
          userId: { in: [userAhsan.id, userDeveloper.id] },
        },
      },
    },
    include: {
      participants: true,
    },
  });

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: userAhsan.id, role: 'member' },
            { userId: userDeveloper.id, role: 'member' },
          ],
        },
      },
      include: {
        participants: true,
      },
    });
  }

  console.log(`✅ Seeded direct chat (ID: ${chat.id})`);

  // 4. Seed Messages & Statuses
  const msg1Time = new Date(Date.now() - 10 * 60 * 1000);
  const msg2Time = new Date(Date.now() - 5 * 60 * 1000);

  // Message 1 from Developer to Ahsan
  let message1 = await prisma.message.findFirst({
    where: {
      chatId: chat.id,
      senderId: userDeveloper.id,
      content: 'Hey Ahsan! The Phase 02 Hostinger database and dual-server setup is complete.',
    },
  });

  if (!message1) {
    message1 = await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: userDeveloper.id,
        messageType: 'text',
        content: 'Hey Ahsan! The Phase 02 Hostinger database and dual-server setup is complete.',
        createdAt: msg1Time,
        statuses: {
          create: {
            userId: userAhsan.id,
            status: 'read',
          },
        },
      },
    });
  }

  // Message 2 from Ahsan to Developer
  let message2 = await prisma.message.findFirst({
    where: {
      chatId: chat.id,
      senderId: userAhsan.id,
      content: 'Awesome! Fastify + native ws daemon and connection pooling are working smoothly.',
    },
  });

  if (!message2) {
    message2 = await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: userAhsan.id,
        messageType: 'text',
        content: 'Awesome! Fastify + native ws daemon and connection pooling are working smoothly.',
        createdAt: msg2Time,
        statuses: {
          create: {
            userId: userDeveloper.id,
            status: 'delivered',
          },
        },
      },
    });
  }

  // Update chat lastMessage pointers
  await prisma.chat.update({
    where: { id: chat.id },
    data: {
      lastMessageId: message2.id,
      lastMessageAt: message2.createdAt,
    },
  });

  console.log(`✅ Seeded sample messages with delivery/read receipts`);

  // 5. Seed Audio-only Call Log (strictly audio-only, NO video)
  let callLog = await prisma.callLog.findFirst({
    where: {
      chatId: chat.id,
      callerId: userAhsan.id,
      receiverId: userDeveloper.id,
    },
  });

  if (!callLog) {
    const callStartTime = new Date(Date.now() - 30 * 60 * 1000);
    const callDuration = 142; // seconds
    const callEndTime = new Date(callStartTime.getTime() + callDuration * 1000);

    callLog = await prisma.callLog.create({
      data: {
        chatId: chat.id,
        callerId: userAhsan.id,
        receiverId: userDeveloper.id,
        callType: 'audio', // Strictly audio-only
        status: 'completed',
        duration: callDuration,
        startedAt: callStartTime,
        endedAt: callEndTime,
      },
    });
  }

  console.log(`✅ Seeded sample audio CallLog (ID: ${callLog.id}, duration: ${callLog.duration}s)`);
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
