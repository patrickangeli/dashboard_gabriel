import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const pIds = [81, 13, 20, 11, 12];
  const projetos = await prisma.projeto.findMany({ include: { transacoes: true } });
  
  let s1 = 0;
  for (let p of projetos) {
     for (let t of p.transacoes) {
        if (t.tipo === 'ENTRADA') s1 += Number(t.valor);
     }
  }
  console.log("Total Entradas DB:", s1);
}
run().finally(() => prisma.$disconnect());
