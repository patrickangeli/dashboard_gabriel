import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const allS = await prisma.transacao.findMany({ where: { tipo: 'SAIDA' } });
  const s = allS.reduce((a, b) => a + Number(b.valor), 0);
  console.log("Total Saídas DB:", s);
}
run().finally(() => prisma.$disconnect());
