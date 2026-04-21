import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const pIds = [81, 13, 20, 11, 12];
    const projetos = await prisma.projeto.findMany({
      where: { id: { in: pIds } },
      include: { transacoes: true }
    });
    for (let p of projetos) {
        console.log(`Proj ${p.id}: ${p.status} - ${p.cliente} - Criado: ${p.criadoEm}`);
    }
}
run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
