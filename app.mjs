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
      let mesChave = p.criadoEm.toISOString().substring(0, 7);

      p.transacoes.forEach(t => {
        if (t.tipo === 'ENTRADA') entrada += Number(t.valor);
        if (t.tipo === 'SAIDA') saida += Number(t.valor);
        
        if (t.dataPagamento) {
           mesChave = t.dataPagamento.toISOString().substring(0, 7);
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
        mesChave: mesChave
      };
    });

    res.json(registros);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// Anexar as rotas tanto no local quanto pro proxy invisivel do Netlify
app.use('/api', router);
app.use('/.netlify/functions/api', router);

export default app;
