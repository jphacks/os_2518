import { error, ok } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const languages = await prisma.language.findMany({
      orderBy: { name: 'asc' },
    });
    return ok({ languages });
  } catch (err) {
    console.error('List languages error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
