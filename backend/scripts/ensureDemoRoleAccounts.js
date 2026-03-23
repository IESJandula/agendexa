const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_PASSWORD = '1234';

async function upsertUser({ email, name, role, passwordHash }) {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role,
        password_hash: passwordHash
      }
    });
  }

  return prisma.user.create({
    data: {
      email,
      name,
      role,
      password_hash: passwordHash
    }
  });
}

async function ensureBusiness() {
  const existing = await prisma.business.findFirst({ orderBy: { created_at: 'asc' } });
  if (existing) return existing;

  const suffix = Date.now();
  return prisma.business.create({
    data: {
      name: 'Agendexa Demo Center',
      slug: `agendexa-demo-${suffix}`,
      location: 'Madrid',
      phone: '600000000',
      slot_interval_minutes: 30
    }
  });
}

async function main() {
  const business = await ensureBusiness();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const superadmin = await upsertUser({
    email: 'admin@booksy-mvp.com',
    name: 'Super Admin',
    role: 'SUPERADMIN',
    passwordHash
  });

  const owner = await upsertUser({
    email: 'owner.demo@agendexa.local',
    name: 'Owner Demo',
    role: 'OWNER',
    passwordHash
  });

  const staff = await upsertUser({
    email: 'staff.demo@agendexa.local',
    name: 'Staff Demo',
    role: 'STAFF',
    passwordHash
  });

  const client = await upsertUser({
    email: 'client.demo@agendexa.local',
    name: 'Client Demo',
    role: 'CLIENT',
    passwordHash
  });

  await prisma.ownerProfile.upsert({
    where: {
      user_id_business_id: {
        user_id: owner.id,
        business_id: business.id
      }
    },
    update: { is_active: true },
    create: {
      user_id: owner.id,
      business_id: business.id,
      is_active: true
    }
  });

  await prisma.staffProfile.upsert({
    where: {
      user_id_business_id: {
        user_id: staff.id,
        business_id: business.id
      }
    },
    update: { is_active: true },
    create: {
      user_id: staff.id,
      business_id: business.id,
      is_active: true
    }
  });

  await prisma.clientProfile.upsert({
    where: {
      user_id_business_id: {
        user_id: client.id,
        business_id: business.id
      }
    },
    update: {},
    create: {
      user_id: client.id,
      business_id: business.id
    }
  });

  const output = {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      location: business.location
    },
    credentials: [
      { role: 'SUPERADMIN', email: superadmin.email, password: DEMO_PASSWORD },
      { role: 'OWNER', email: owner.email, password: DEMO_PASSWORD },
      { role: 'STAFF', email: staff.email, password: DEMO_PASSWORD },
      { role: 'CLIENT', email: client.email, password: DEMO_PASSWORD }
    ]
  };

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((error) => {
    console.error('Error ensuring demo accounts:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
