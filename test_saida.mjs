import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const pIds = [81, 13, 20, 11, 12];
  const projetos = await prisma.projeto.findMany({ include: { transacoes: true } });
  
  let sS = 0;
  projetos.forEach(p => {
    let e = 0;
    p.transacoes.forEach(t => { if(t.tipo === 'SAIDA') e += Number(t.valor); });
    sS += e;
  });
  console.log('Total project SAIDAs:', sS);

  let avs = await prisma.transacao.findMany({ where: { projetoId: null, tipo: 'SAIDA' } });
  let ass = avs.reduce((a,b)=>a+Number(b.valor),0);
  console.log('Total avulsos SAIDAs:', ass);
}
run().finally(() => prisma.$disconnect());
