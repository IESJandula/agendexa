const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const hash = await bcrypt.hash('1234', 10);
    await prisma.user.updateMany({
        where: { email: 'manolo@gmail.com' },
        data: { password_hash: hash }
    });
    console.log('Manolo password set to 1234');
}
main().catch(console.error).finally(() => prisma.$disconnect());
