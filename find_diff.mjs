import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const projetos = await prisma.projeto.findMany({
      include: { transacoes: true }
    });

    for (let p of projetos) {
        let entrada = p.transacoes.filter(t => t.tipo === 'ENTRADA').reduce((sum, t) => sum + Number(t.valor), 0);
        if (entrada > 0) {
           console.log(`Proj ${p.id}: ${entrada}`);
        }
    }
}
run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
