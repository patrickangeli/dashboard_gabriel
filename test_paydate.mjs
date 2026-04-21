import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const tProj = await prisma.transacao.findMany({ where: { tipo: 'ENTRADA', projetoId: { not: null } } });
  let sumWithDate = 0;
  let sumWithoutDate = 0;
  for (let t of tProj) {
      if (t.dataPagamento) sumWithDate += Number(t.valor);
      else sumWithoutDate += Number(t.valor);
  }
  console.log('With date:', sumWithDate, 'Without date:', sumWithoutDate);
}
run().finally(() => prisma.$disconnect());
