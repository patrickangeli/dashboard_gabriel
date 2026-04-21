import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const projetos = await prisma.projeto.findMany({ include: { transacoes: true } });
  const transacoesAvulsas = await prisma.transacao.findMany({ where: { projetoId: null } });
  const previsoesSaida = await prisma.previsaoCaixa.findMany({ where: { tipo: 'SAIDA' } });

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

      const valorFechado = Number(p.valorFechado);
      
      return {
        id: p.id,
        parceiro: p.cliente,
        servico: p.servico || 'N/A',
        status: p.status,
        valorFechado: valorFechado,
        entrada: entrada,
        saida: saida,
        valorRestante: p.status.toLowerCase() === 'concluído' ? valorFechado : (valorFechado - entrada),
        mesChave: dataChave
      };
    });

  const avulsosPorDia = {};
  transacoesAvulsas.forEach(t => {
    const dia = t.dataPagamento ? t.dataPagamento.toISOString().substring(0, 10) : t.criadoEm.toISOString().substring(0, 10);
    if (!avulsosPorDia[dia]) avulsosPorDia[dia] = { entrada: 0, saida: 0 };
    if (t.tipo === 'ENTRADA') avulsosPorDia[dia].entrada += Number(t.valor);
    if (t.tipo === 'SAIDA') avulsosPorDia[dia].saida += Number(t.valor);
  });

  previsoesSaida.forEach(p => {
    const dia = p.dataPrevista ? p.dataPrevista.toISOString().substring(0, 10) : p.criadoEm.toISOString().substring(0, 10);
    if (!avulsosPorDia[dia]) avulsosPorDia[dia] = { entrada: 0, saida: 0 };
    avulsosPorDia[dia].saida += Number(p.valor);
  });

  Object.keys(avulsosPorDia).forEach((dia, idx) => {
      registros.push({
        id: `avulsos-${idx}`,
        parceiro: 'Lançamentos Avulsos (Sem Projeto)',
        servico: 'Despesas e Receitas Gerais',
        status: 'Contábil',
        valorFechado: 0,
        entrada: avulsosPorDia[dia].entrada,
        saida: avulsosPorDia[dia].saida,
        valorRestante: 0,
        mesChave: dia
      });
  });

  let kpE = 0;
  registros.forEach(r => kpE += r.entrada);
  console.log('KPI totalEntradas computed:', kpE);
}
run().finally(() => prisma.$disconnect());
