import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const transacoes = await prisma.transacao.findMany({
    include: { projeto: true }
  });
  
  // Imprimir algumas pra ver o q são
  const avulsos = transacoes.filter(t => !t.projeto);
  console.log("Transações sem projeto ('Lançamentos AVulsos')", avulsos.length);
  
  const projetosz = await prisma.projeto.findMany();
  console.log("Projetos com valor 0", projetosz.filter(p => !p.valorFechado || Number(p.valorFechado) === 0).length);
  console.log("Projetos Lançamentos avulsos:", projetosz.filter(p => p.cliente === "Lançamentos Avulsos (Sem Projeto)").length);
}
main()
