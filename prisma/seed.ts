import { PrismaClient, NodeStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  /* ── USERS ─────────────────────────────────── */
  const [alice, bob] = await Promise.all([
    prisma.user.upsert({
      where:  { email: 'alice@example.com' },
      update: {},
      create: {
        email:         'alice@example.com',
        username:      'alice',
        walletAddress: '0xAL1CE1234567890',
        password:      await bcrypt.hash('alicepass', 10),
      },
      
    }),
    prisma.user.upsert({
      where:  { email: 'bob@example.com' },
      update: {},
      create: {
        email:         'bob@example.com',
        username:      'bob',
        walletAddress: '0xB0B0987654321',
        password:      await bcrypt.hash('bobpass', 10),
      },
    }),
  ]);

  /* ── NODES ─────────────────────────────────── */
  await Promise.all([
    prisma.node.create({
      data: {
        gpuModel:      'NVIDIA RTX 4090',
        nodeUrl:       'http://worker1:5000',
        totalMemoryMb: 24576,
        freeMemoryMb:  24576,
        status:        NodeStatus.ONLINE,
        ownerId:       alice.id,
      },
    }),
    prisma.node.create({
      data: {
        gpuModel:      'NVIDIA A100-80G',
        nodeUrl:       'http://worker2:5000',
        totalMemoryMb: 81920,
        freeMemoryMb:  81920,
        status:        NodeStatus.ONLINE,
        ownerId:       bob.id,
      },
    }),
    prisma.node.create({
      data: {
        gpuModel:      'NVIDIA A100-800G',
        nodeUrl:       'http://worker3:5000',
        totalMemoryMb: 24576,
        freeMemoryMb:  24576,
        status:        NodeStatus.ONLINE,
        ownerId:       bob.id,
      },
    }),
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🌱  Seed finished');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });