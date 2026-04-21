import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const allT = await prisma.transacao.findMany({ where: { tipo: 'ENTRADA' } });
  const sum = allT.reduce((acc, curr) => acc + Number(curr.valor), 0);
  console.log('Total Transacoes ENTRADA:', sum);

  const tProj = await prisma.transacao.findMany({ where: { tipo: 'ENTRADA', projetoId: { not: null } } });
  const sumProj = tProj.reduce((acc, curr) => acc + Number(curr.valor), 0);
  console.log('Total Transacoes ENTRADA com Projeto:', sumProj);

  const tNoProj = await prisma.transacao.findMany({ where: { tipo: 'ENTRADA', projetoId: null } });
  const sumNoProj = tNoProj.reduce((acc, curr) => acc + Number(curr.valor), 0);
  console.log('Total Transacoes ENTRADA sem Projeto (Avulsos):', sumNoProj);
}
run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
