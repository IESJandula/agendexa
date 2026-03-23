const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CITY_PATTERNS = [
  { city: 'Madrid', regex: /madrid/i },
  { city: 'Barcelona', regex: /barcelona/i },
  { city: 'Valencia', regex: /valencia/i },
  { city: 'Sevilla', regex: /sevilla/i },
  { city: 'Malaga', regex: /malaga/i },
  { city: 'Bilbao', regex: /bilbao/i },
  { city: 'Zaragoza', regex: /zaragoza/i }
];

function inferLocation(name, slug, fallback) {
  const source = `${name || ''} ${slug || ''}`;
  const found = CITY_PATTERNS.find((entry) => entry.regex.test(source));
  return found ? found.city : fallback;
}

async function main() {
  const defaultLocation = process.env.BUSINESS_DEFAULT_LOCATION || 'Madrid';

  const businesses = await prisma.business.findMany({
    select: { id: true, name: true, slug: true, location: true }
  });

  const toUpdate = businesses.filter(
    (biz) => !biz.location || biz.location.trim().length === 0
  );

  if (toUpdate.length === 0) {
    console.log('No businesses need location updates.');
    return;
  }

  let updatedCount = 0;

  for (const biz of toUpdate) {
    const location = inferLocation(biz.name, biz.slug, defaultLocation);

    await prisma.business.update({
      where: { id: biz.id },
      data: { location }
    });

    updatedCount += 1;
    console.log(`Updated ${biz.slug} -> ${location}`);
  }

  console.log(`Done. Updated ${updatedCount} business(es).`);
}

main()
  .catch((error) => {
    console.error('Failed to fill business locations:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
