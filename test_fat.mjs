import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const projetos = await prisma.projeto.findMany();
    const sum = projetos.reduce((acc, p) => acc + Number(p.valorFechado), 0);
    console.log('Total Faturamento Projetos:', sum);
}
run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
