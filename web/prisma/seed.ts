import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const languages = [
  { code: 'ja', name: 'Japanese' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'de', name: 'German' },
];

const matchStatuses = [
  { id: 1, code: 'PENDING', label: 'Pending' },
  { id: 2, code: 'ACCEPTED', label: 'Accepted' },
  { id: 3, code: 'REJECTED', label: 'Rejected' },
];

async function main() {
  await Promise.all(
    matchStatuses.map((status) =>
      prisma.matchStatus.upsert({
        where: { id: status.id },
        update: {
          code: status.code,
          label: status.label,
        },
        create: status,
      }),
    ),
  );

  await Promise.all(
    languages.map((language) =>
      prisma.language.upsert({
        where: { code: language.code },
        update: { name: language.name },
        create: language,
      }),
    ),
  );
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
