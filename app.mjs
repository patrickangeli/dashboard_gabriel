import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
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

      const valorFechado = Number(p.valorFechado);
      
      return {
        id: p.id,
        parceiro: p.cliente,
        servico: p.servico || 'N/A',
        status: p.status,
        criadoEm: p.criadoEm.toISOString().substring(0, 10),
        valorFechado: valorFechado,
        entrada: entrada,
        saida: saida,
        valorRestante: p.status.toLowerCase() === 'concluído' ? valorFechado : (valorFechado - entrada),
        mesChave: dataChave, // Mantemos o nome mesChave no client para não quebrar tudo, mas agora tem formato YYYY-MM-DD
        transacoes: p.transacoes || []
      };
    });

    const transacoesAvulsas = await prisma.transacao.findMany({
      where: { projetoId: null }
    });

    // Como as saídas e despesas do escritório geralmente são registradas 
    // no módulo de Previsão de Caixa, vamos importá-las para o fluxo total também
    const previsoesSaida = await prisma.previsaoCaixa.findMany({
      where: { tipo: 'SAIDA' }
    });

    const avulsosPorDia = {};
    
    // Processa transações soltas
    transacoesAvulsas.forEach(t => {
      const dia = t.dataPagamento ? t.dataPagamento.toISOString().substring(0, 10) : t.criadoEm.toISOString().substring(0, 10);
      if (!avulsosPorDia[dia]) avulsosPorDia[dia] = { entrada: 0, saida: 0 };
      
      if (t.tipo === 'ENTRADA') avulsosPorDia[dia].entrada += Number(t.valor);
      if (t.tipo === 'SAIDA') avulsosPorDia[dia].saida += Number(t.valor);
    });

    // Processa saídas do caixa
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
        mesChave: dia,
        transacoes: []
      });
    });

    res.json(registros);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, stack: err.stack, name: err.name });
  }
});

router.get('/previsao', async (req, res) => {
  try {
    const previsoes = await prisma.previsaoCaixa.findMany();
    const data = previsoes.map(p => ({
      DATA: p.dataPrevista.toISOString().substring(0, 10),
      VALOR: Number(p.valor),
      TIPO: p.tipo,
      DESCRICAO: p.descricao || '',
      CATEGORIA: p.categoria || ''
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack, name: err.name });
  }
});

router.post('/projetos', async (req, res) => {
  try {
    const { cliente, servico, status, valorFechado } = req.body;
    const projeto = await prisma.projeto.create({
      data: {
        cliente,
        servico,
        status,
        valorFechado: Number(valorFechado)
      }
    });
    res.json(projeto);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack, name: err.name });
  }
});

router.put('/projetos/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const projeto = await prisma.projeto.update({
      where: { id: Number(req.params.id) },
      data: { status }
    });
    res.json(projeto);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack, name: err.name });
  }
});

router.post('/transacoes', async (req, res) => {
  try {
    const { projetoId, tipo, valor, dataPagamento, categoria, descricao } = req.body;
    const transacao = await prisma.transacao.create({
      data: {
        projetoId: Number(projetoId),
        tipo,
        valor: Number(valor),
        dataPagamento: new Date(dataPagamento),
        categoria,
        descricao
      }
    });
    res.json(transacao);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack, name: err.name });
  }
});

router.post('/previsao', async (req, res) => {
  try {
    const { tipo, valor, dataPrevista, categoria, descricao } = req.body;
    const previsao = await prisma.previsaoCaixa.create({
      data: {
        tipo,
        valor: Number(valor),
        dataPrevista: new Date(dataPrevista),
        categoria,
        descricao
      }
    });
    res.json(previsao);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack, name: err.name });
  }
});

// Anexar as rotas tanto no local quanto pro proxy invisivel do Netlify
app.use('/api', router);
app.use('/.netlify/functions/api', router);

export default app;
