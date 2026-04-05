import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient({});

async function main() {
    console.log('Iniciando o povoamento com os dados da planilha...');

    // Lendo o arquivo Excel
    const filePath = path.join(process.cwd(), '0_GESTAO_FINANCEIRA_GM.xlsx');
    
    if (!fs.existsSync(filePath)) {
        console.error('Não localizei o arquivo 0_GESTAO_FINANCEIRA_GM.xlsx. Verifique se ele está na mesma pasta!');
        process.exit(1);
    }
    
    console.log('Planilha encontrada, lendo os dados...');
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, {type: 'buffer', cellDates: true });
    
    let todosRegistros = [];
    let previsaoRegistros = [];
    
    const parseDataParaMes = (valor) => {
        if (!valor) return null;
        if (valor instanceof Date) return valor;
        if (!isNaN(valor) && Number(valor) > 10000 && Number(valor) < 100000) {
            return new Date((Number(valor) - 25569) * 86400 * 1000);
        }
        return new Date(valor); 
    };

    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        const isPrevisao = sheetName.toUpperCase().includes('PREVISAO') || sheetName.toUpperCase().includes('PREVISÃO');
        
        json.forEach(row => {
            const linha = {};
            Object.keys(row).forEach(k => {
                const h = k.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, '');
                linha[h] = row[k];
            });
            if(isPrevisao) previsaoRegistros.push(linha);
            else todosRegistros.push(linha);
        });
    });
    
    const val = (linha, keywords) => {
        const chaves = Object.keys(linha);
        const k = chaves.find(chave => keywords.some(kw => chave.includes(kw)));
        if (!k) return 0;
        let v = linha[k];
        if (typeof v === 'number') return v;
        let txt = String(linha[k] || '0').replace(/[R$\s]/g, '');
         if (txt.includes(',') && txt.includes('.')) {
            txt = txt.replace(/\./g, '').replace(',', '.');
        } else if (txt.includes(',')) {
            txt = txt.replace(',', '.');
        }
        return Number(txt) || 0;
    };
    
    console.log(`Encontrados ${todosRegistros.length} registros gerais e ${previsaoRegistros.length} previsões...`);
    
    // Limpando tabelas antigas (pra não duplicar)
    await prisma.previsaoCaixa.deleteMany();
    await prisma.transacao.deleteMany();
    await prisma.projeto.deleteMany();
    console.log('Banco de dados limpo! Inserindo agora...');
    
    for(const linha of todosRegistros) {
        const chaves = Object.keys(linha);
        const cliente = chaves.find(chave => ['PARCEIRO', 'CLIENTE', 'NOME', 'FORNECEDOR'].some(kw => chave.includes(kw)));
        const clienteNome = cliente ? linha[cliente] || 'Sem Parceiro' : 'Sem Parceiro';
        
        const valorF = val(linha, ['VALORFECHADO', 'VALORCONTRATADO', 'FATURAMENTO', 'FATURAMENTOTOTAL', 'TOTAL']);
        const valorEntrada = val(linha, ['ENTRADA', 'RECEITA', 'PAGO', 'RECEBIDO']);
        const valorSaida = val(linha, ['SAIDA', 'DESPESA', 'CUSTO', 'PAGAMENTO']);
        
        const servico = chaves.find(chave => ['SERVICO', 'DESCRICAO', 'PROJETO'].some(kw => chave.includes(kw)));
        const servicoNome = servico ? linha[servico] : null;
        
        const dataCol = chaves.find(chave => ['DATA', 'MES', 'VENCIMENTO', 'COMPETENCIA'].some(kw => chave.includes(kw)));
        const dataVal = dataCol ? parseDataParaMes(linha[dataCol]) : new Date();
        
        if(clienteNome === 'Sem Parceiro' && valorF === 0 && valorEntrada === 0 && valorSaida === 0) continue;
        
        // Cadastrando Projeto
        const projeto = await prisma.projeto.create({
            data: {
                cliente: String(clienteNome),
                servico: servicoNome ? String(servicoNome) : 'S/ Serviço',
                valorFechado: valorF || (valorEntrada > 0 ? valorEntrada : 0),
            }
        });
        
        // Linkando as Transações ao projeto
        if (valorEntrada > 0) {
            await prisma.transacao.create({
                data: {
                    projetoId: projeto.id,
                    tipo: 'ENTRADA',
                    valor: valorEntrada,
                    dataPagamento: isNaN(dataVal) ? new Date() : dataVal,
                    descricao: 'Faturamento de Contrato / Entrada',
                }
            });
        }
        
        if (valorSaida > 0) {
            await prisma.transacao.create({
                data: {
                    projetoId: projeto.id,
                    tipo: 'SAIDA',
                    valor: valorSaida,
                    dataPagamento: isNaN(dataVal) ? new Date() : dataVal,
                    descricao: 'Despesa Operacional / Saída',
                }
            });
        }
    }
    
    for(const linha of previsaoRegistros) {
        let ent = val(linha, ['ENTRADA', 'RECEITA', 'PAGO', 'RECEBIMENTO', 'CREDITO']);
        let sai = val(linha, ['SAIDA', 'DESPESA', 'CUSTO', 'PAGAMENTO', 'DEBITO']);
        const chaves = Object.keys(linha);
       
        const keyTipo = chaves.find(chave => ['TIPO', 'CATEGORIA', 'CLASSIFICACAO', 'NATUREZA'].some(kw => chave.includes(kw)));
        const keyValor = chaves.find(chave => ['VALOR', 'TOTAL', 'MONTANTE', 'PREVISTO'].some(kw => chave.includes(kw)));
        const keyDesc = chaves.find(chave => ['DESCRICAO', 'IDENTIFICADOR'].some(kw => chave.includes(kw)));
       
        if (ent === 0 && sai === 0 && keyTipo && keyValor) {
            const tipoStr = String(linha[keyTipo]).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const valorStr = val(linha, ['VALOR', 'TOTAL', 'MONTANTE', 'PREVISTO']);
            if (['ENTRADA', 'RECEITA', 'CREDITO'].some(k => tipoStr.includes(k))) {
                ent = valorStr;
            } else if (['SAIDA', 'DESPESA', 'CUSTO', 'DEBITO', 'PAGAMENTO'].some(k => tipoStr.includes(k))) {
                sai = valorStr;
            }
        }
        
        const dataCol = chaves.find(chave => ['DATA', 'MES', 'VENCIMENTO', 'COMPETENCIA'].some(kw => chave.includes(kw)));
        let dataVal = dataCol ? parseDataParaMes(linha[dataCol]) : new Date();
        if(isNaN(dataVal)) dataVal = new Date();
        
        if (ent > 0) {
             await prisma.previsaoCaixa.create({
                data: {
                    tipo: 'ENTRADA',
                    valor: ent,
                    dataPrevista: dataVal,
                    descricao: keyDesc ? String(linha[keyDesc]) : 'Receita Prevista',
                }
            });
        }
        if (sai > 0) {
             await prisma.previsaoCaixa.create({
                data: {
                    tipo: 'SAIDA',
                    valor: sai,
                    dataPrevista: dataVal,
                    descricao: keyDesc ? String(linha[keyDesc]) : 'Despesa Prevista',
                }
            });
        }
    }

    console.log('✅ Povoamento concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });