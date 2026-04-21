import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const projetos = await prisma.projeto.findMany({ include: { transacoes: true } });
  let sumAllMap = 0;
  const registros = projetos.map(p => {
    let entrada = 0;
    p.transacoes.forEach(t => { if(t.tipo === 'ENTRADA') entrada += Number(t.valor) });
    sumAllMap += entrada;
    return entrada;
  });
  console.log('Project sum =', sumAllMap);

  const transacoesAvulsas = await prisma.transacao.findMany({ where: { projetoId: null } });
  let avA = 0;
  transacoesAvulsas.forEach(t => { if(t.tipo === 'ENTRADA') avA += Number(t.valor) });
  console.log('Avulso sum =', avA);
  console.log('Total =', sumAllMap + avA);
}
run().finally(() => prisma.$disconnect());
