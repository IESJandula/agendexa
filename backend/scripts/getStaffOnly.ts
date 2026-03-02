import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const staff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
    if (staff) {
        console.log("STAFF_EMAIL=" + staff.email);
    } else {
        console.log("NO STAFF FOUND");
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
