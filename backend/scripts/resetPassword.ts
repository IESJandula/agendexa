import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const hashedPassword = await bcrypt.hash('1234', 10);
    await prisma.user.updateMany({
        where: { email: 'juan@gmail.com' },
        data: { password_hash: hashedPassword }
    });
    console.log('Password reset to 1234');
}
main().catch(console.error).finally(() => prisma.$disconnect());
