import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const pIds = [81, 13, 20, 11, 12];
  const projetos = await prisma.projeto.findMany({ include: { transacoes: true } });
  
  let sEq = 0;
  let sNot = 0;
  for (let p of projetos) {
    let e = 0;
    for (let t of p.transacoes) { if (t.tipo === 'ENTRADA') e += Number(t.valor); }
    if (p.status === 'CONCLUÍDO') sEq += e;
    else sNot += e;
  }
  console.log('Concluido:', sEq, 'Others:', sNot);
}
run().finally(() => prisma.$disconnect());
