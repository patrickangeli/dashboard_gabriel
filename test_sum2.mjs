import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const projetos = await prisma.projeto.findMany({
      include: { transacoes: true }
    });

    let totalE = 0;
    const registros = projetos.map(p => {
      let entrada = 0;
      
      p.transacoes.forEach(t => {
        if (t.tipo === 'ENTRADA') entrada += Number(t.valor);
      });
      totalE += entrada;
      return { p_id: p.id, entrada };
    });
    console.log('Soma no map de projetos:', totalE);
}
run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
