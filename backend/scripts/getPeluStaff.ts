import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
    const pelu = await prisma.business.findUnique({ where: { slug: 'pelu' } });
    if (!pelu) return console.log('No pelu business');

    const staffs = await prisma.staffProfile.findMany({
        where: { business_id: pelu.id },
        include: { user: true }
    });

    console.log("Pelu Staffs:", staffs.map(s => s.user.email));

    // Also reset password to 1234 for all pelu staff just in case
    const hashedPassword = await bcrypt.hash('1234', 10);
    for (const s of staffs) {
        await prisma.user.update({
            where: { id: s.user_id },
            data: { password_hash: hashedPassword }
        });
        console.log(`Reset ${s.user.email} password to 1234`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
