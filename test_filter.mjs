import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const projetos = await prisma.projeto.findMany({
      include: { transacoes: true }
    });

    let regApr = 0;
    let projApr = 0;
    
    projetos.map(p => {
      let entrada = 0;
      let dataChave = p.criadoEm.toISOString().substring(0, 10);
      p.transacoes.forEach(t => {
        if (t.tipo === 'ENTRADA') entrada += Number(t.valor);
        if (t.dataPagamento) dataChave = t.dataPagamento.toISOString().substring(0, 10);
      });
      if (dataChave.startsWith('2026-04')) {
         projApr += entrada;
      }
    });

    const avulsas = await prisma.transacao.findMany({ where: { projetoId: null, tipo: 'ENTRADA' } });
    const avulsoApr = avulsas.reduce((sum, t) => {
       const dia = t.dataPagamento ? t.dataPagamento.toISOString() : t.criadoEm.toISOString();
       if (dia.startsWith('2026-04')) return sum + Number(t.valor);
       return sum;
    }, 0);

    console.log('Project entries in April (based on last transaction date):', projApr);
    console.log('Avulsos in April:', avulsoApr);
    console.log('Total in April:', projApr + avulsoApr);
}
run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
