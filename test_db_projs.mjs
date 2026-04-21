import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const pIds = [81, 13, 20, 11, 12];
  const projetos = await prisma.projeto.findMany({ where: { id: { in: pIds } }, include: { transacoes: true } });
  console.dir(projetos[0], { depth: null });
}
run().finally(() => prisma.$disconnect());
