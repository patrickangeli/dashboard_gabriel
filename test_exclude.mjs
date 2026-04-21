import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const projetos = await prisma.projeto.findMany({
      include: { transacoes: true }
    });

    const targetIds = [81, 13, 20, 11, 12];
    const targetP = projetos.filter(p => targetIds.includes(p.id));
    
    for (let p of targetP) {
      let ent = 0;
      p.transacoes.forEach(t => { if(t.tipo === 'ENTRADA') ent += Number(t.valor) });
      console.log(`Proj: ${p.id} | Entrada: ${ent} | T_COUNT: ${p.transacoes.length} | CRIADO_EM: ${p.criadoEm.toISOString()}`);
    }
}
run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
