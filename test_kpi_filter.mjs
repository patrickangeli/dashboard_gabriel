import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const projetos = await prisma.projeto.findMany({ include: { transacoes: true } });
  
  let s_2026_04 = 0;
  let s_all = 0;
  
  for (let p of projetos) {
      let ent = 0;
      let dataChave = p.criadoEm.toISOString().substring(0, 10);
      p.transacoes.forEach(t => {
        if (t.tipo === 'ENTRADA') ent += Number(t.valor);
        if (t.dataPagamento) dataChave = t.dataPagamento.toISOString().substring(0, 10);
      });
      s_all += ent;
      if (dataChave.startsWith('2026-04')) {
          s_2026_04 += ent;
      }
  }
  
  console.log("All time:", s_all);
  console.log("Only '2026-04':", s_2026_04);
}
run().finally(() => prisma.$disconnect());
