import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const b = await prisma.business.findFirst();
    console.log(b ? b.slug : 'NONE');
}
main().catch(console.error).finally(() => prisma.$disconnect());
