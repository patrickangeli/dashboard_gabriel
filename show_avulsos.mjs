import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const transacoes = await prisma.transacao.findMany({
    where: { projetoId: null }
  });
  console.log(transacoes);
}
main()
