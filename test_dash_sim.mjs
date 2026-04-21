import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const projetos = await prisma.projeto.findMany({
      include: { transacoes: true }
    });

    const registros = projetos.map(p => {
      let entrada = 0;
      let saida = 0;
      let dataChave = p.criadoEm.toISOString().substring(0, 10);

      p.transacoes.forEach(t => {
        if (t.tipo === 'ENTRADA') entrada += Number(t.valor);
        if (t.tipo === 'SAIDA') saida += Number(t.valor);
        if (t.dataPagamento) {
           dataChave = t.dataPagamento.toISOString().substring(0, 10);
        }
      });
      return { 
        id: p.id,
        entrada,
        mesChave: dataChave
      };
    });

    const sumAll = registros.reduce((acc, reg) => acc + reg.entrada, 0);
    console.log('Soma de todas as entradas de projetos:', sumAll);
    
    // Simulate what happens in front end
    let filteredEntradas = 0;
    registros.forEach(reg => {
       filteredEntradas += reg.entrada;
    });
    console.log('Soma filtrada:', filteredEntradas);

    // Let's add avulsos
    const transacoesAvulsas = await prisma.transacao.findMany({
      where: { projetoId: null }
    });
    let sumAvulsos = 0;
    transacoesAvulsas.forEach(t => {
      if (t.tipo === 'ENTRADA') sumAvulsos += Number(t.valor);
    });
    console.log('Soma de avulsos:', sumAvulsos);
    console.log('Total total:', sumAll + sumAvulsos);
}
run()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
