import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Chart, Doughnut } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRHhyHMdcKDQhTHsbg45BbR__sG20o_hzV8-4uN5JjOEIcpQ7jpKgHrMQC6sJ8Osw/pub?gid=2127664050&single=true&output=csv';

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0));
};

const formatarMesChave = (chave, agrupamento) => {
  if (agrupamento === 'semanal' && String(chave).includes('-W')) {
    const partesW = String(chave).split('-W');
    if (partesW.length === 2) {
      // Ex: "Semana 12/26" ou "Sem 12/26" - vamos usar "Sem 12/26"
      return `Sem ${partesW[1]}/${String(partesW[0]).slice(-2)}`;
    }
  }

  const partes = String(chave).split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${String(partes[0]).slice(-2)}`;
  }
  const [ano, mes] = partes;
  return `${mes}/${String(ano).slice(-2)}`;
};

const getISOWeekKey = (dateStr) => {
    // Accepts YYYY-MM-DD or YYYY-MM
    let dateObj = new Date((dateStr.length === 7 ? dateStr + '-01' : dateStr) + 'T00:00:00Z');
    if (isNaN(dateObj.getTime())) return dateStr.substring(0, 4) + '-W01';
    const target = new Date(dateObj.valueOf());
    const dayNr = (dateObj.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setUTCMonth(0, 1);
    if (target.getUTCDay() !== 4) target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
    const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
    return `${dateObj.getUTCFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
};

const getMockData = () => [
  { parceiro: 'Cliente A', valorFechado: 12000, valorRestante: 5000, entrada: 7000, saida: 2000, mesChave: '2026-01' },
  { parceiro: 'Cliente B', valorFechado: 15000, valorRestante: 0, entrada: 15000, saida: 5000, mesChave: '2026-02' },
  { parceiro: 'Cliente C', valorFechado: 8000, valorRestante: 8000, entrada: 0, saida: 1000, mesChave: '2026-03' },
  { parceiro: 'Cliente A', valorFechado: 10000, valorRestante: 2000, entrada: 8000, saida: 1500, mesChave: '2026-04' }
];

export default function App() {
  const [registros, setRegistros] = useState([]);
  const [previsaoRegistros, setPrevisaoRegistros] = useState([]);
  const [fonte, setFonte] = useState('Aguardando...');

  // Filters State
  const [filterDe, setFilterDe] = useState('');
  const [filterAte, setFilterAte] = useState('');
  const [appliedDe, setAppliedDe] = useState('');
  const [appliedAte, setAppliedAte] = useState('');
  const [filterPreset, setFilterPreset] = useState('all');
  const [filterMetric, setFilterMetric] = useState('valorFechado');
  const [filterFlowType, setFilterFlowType] = useState('line');
  const [filterAgrupamento, setFilterAgrupamento] = useState('mensal');
  const [searchProjeto, setSearchProjeto] = useState('');
  const [filterStatusProjeto, setFilterStatusProjeto] = useState('all');
  const [searchParceiroGrafico, setSearchParceiroGrafico] = useState('');

  // Table Column Filters
  const [filterTableData, setFilterTableData] = useState('');
  const [filterTableMes, setFilterTableMes] = useState('');
  const [filterTableParceiro, setFilterTableParceiro] = useState('');
  const [filterTableServico, setFilterTableServico] = useState('');
  const [filterTableTipo, setFilterTableTipo] = useState('ALL');
  const [filterTableValor, setFilterTableValor] = useState('');

  // Parsing Helpers
  const parseDataParaMes = (valor) => {
    if (!valor) return null;
    
    // Convert Excel serial date to JS Date
    if (!isNaN(valor) && Number(valor) > 10000 && Number(valor) < 100000) {
        const utcDate = new Date((Number(valor) - 25569) * 86400 * 1000);
        const ano = utcDate.getUTCFullYear();
        const mes = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
        return { chave: `${ano}-${mes}` };
    }

    const texto = String(valor).trim().toLowerCase();
    
    // Excel standard mm/dd/yy or dd/mm/yyyy
    const padraoBr = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (padraoBr) {
        const ano = padraoBr[3].length === 2 ? `20${padraoBr[3]}` : padraoBr[3];
        // If the first number is > 12 it has to be a day, so second is month
        // Without knowing locale, we just try our best, usually Month/Year for the chart
        const mes = Number(padraoBr[2]) <= 12 ? String(padraoBr[2]).padStart(2, '0') : String(padraoBr[1]).padStart(2, '0');
        return { chave: `${ano}-${mes}` };
    }
    
    const padraoAnoMes = texto.match(/^(\d{4})[\-\/](\d{1,2})$/);
    if (padraoAnoMes) {
        const ano = padraoAnoMes[1];
        const mes = String(padraoAnoMes[2]).padStart(2, '0');
        return { chave: `${ano}-${mes}` };
    }

    const d = new Date(texto);
    if (!isNaN(d.getTime())) {
        const ano = d.getUTCFullYear();
        const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
        return { chave: `${ano}-${mes}` };
    }
    return null; 
  };

  const extrairRegistrosDeLinhas = (linhasObj) => {
    return linhasObj.map(linha => {
        const val = (k) => {
            const v = linha[k];
            if (typeof v === 'number') return v;
            let txt = String(v || '0').replace(/[R$\s]/g, '');
            if (txt.includes(',') && txt.includes('.')) {
                txt = txt.replace(/\./g, '').replace(',', '.');
            } else if (txt.includes(',')) {
                txt = txt.replace(',', '.');
            }
            return Number(txt) || 0;
        };

        const vf = val('VALORFECHADO') || val('VALORCONTRATADO') || val('FATURAMENTO') || val('FATURAMENTOTOTAL') || val('VALOR') || val('TOTAL');
        const chaves = Object.keys(linha);
        const findKey = (keywords) => chaves.find(k => keywords.some(kw => k.includes(kw)));
        
        const keyEntrada = findKey(['ENTRADA', 'RECEBIDO', 'RECEITA', 'CREDITO', 'PAGO', 'RECEBIMENTOS']);
        const keySaida = findKey(['SAIDA', 'DESPESA', 'CUSTO', 'PAGAMENTO', 'DEBITO']);
        const keyData = findKey(['DATA', 'MES', 'VENCIMENTO', 'COMPETENCIA', 'CONTRATO', 'FECHAMENTO', 'EMISSAO']);

        const keyParceiro = findKey(['PARCEIRO', 'CLIENTE', 'NOME', 'FORNECEDOR']);
        const keyServico = findKey(['SERVICO', 'DESCRICAO', 'PROJETO', 'PRODUTO', 'CATEGORIA', 'TIPO']);
        const keyStatus = findKey(['STATUS', 'SITUACAO', 'FASE', 'ETAPA']);
        
        const keyRestante = findKey(['RESTANTE', 'ARECEBER', 'SALDO', 'FALTA', 'ABERTO']);

        const en = keyEntrada ? val(keyEntrada) : val('ENTRADA');
        const sd = keySaida ? val(keySaida) : 0;
        
        const validDateVal = keyData ? linha[keyData] : undefined;

        return {
            parceiro: keyParceiro ? linha[keyParceiro] : 'Sem Parceiro',
            valorFechado: vf,
            valorRestante: keyRestante ? val(keyRestante) : (vf - (en > 0 ? en : 0)),
            entrada: en,
            saida: sd,
            mesChave: parseDataParaMes(validDateVal)?.chave,
            servico: keyServico ? linha[keyServico] : 'N/A',
            status: keyStatus ? linha[keyStatus] : 'N/A'
        };
    }).filter(r => r.parceiro !== 'Sem Parceiro' || r.valorFechado > 0 || r.entrada > 0 || r.saida > 0);
  };

  const splitCSVLine = (line) => {
    const result = [];
    let inQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
  };

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = splitCSVLine(lines[0]).map(h => 
        h.trim().toUpperCase()
         .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
         .replace(/[^A-Z0-9]/g, '')
    );

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = splitCSVLine(lines[i]);
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] !== undefined ? values[index].trim() : '';
        });
        data.push(obj);
    }
    return data;
  };

  const fetchData = async () => {
    try {
      const resp = await fetch('/api/dashboard');
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`CORS/HTTP 500. Server Response: ${errText.substring(0, 500)}`);
      }
      const dadosDashboard = JSON.parse(await resp.text());
      
      const prev = await fetch('/api/previsao');
      const dadosPrevisao = prev.ok ? await prev.json() : [];

      setRegistros(dadosDashboard.length ? dadosDashboard : getMockData());
      setPrevisaoRegistros(dadosPrevisao);
      setFonte(dadosDashboard.length ? 'Banco de Dados (API)' : 'Mock Data (Nenhum válido)');
    } catch (e) {
      console.warn("Falling back to Mock Data:", e);
      setRegistros(getMockData());
      setPrevisaoRegistros([]);
      setFonte('Mock Data (Falha de Conexão com API)');
    }
  };

  const updateProjetoStatus = async (id, newStatus) => {
    try {
      if (String(id).startsWith('avulsos-')) return;
      const resp = await fetch(`/api/projetos/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!resp.ok) throw new Error('Falha ao atualizar status');
      fetchData();
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
      alert('Falha ao atualizar status do projeto');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        let todosRegistros = [];
        let previsaoCaixaRegistros = [];

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            const normalizados = json.map(row => {
                const newRow = {};
                Object.keys(row).forEach(k => {
                    const h = k.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, '');
                    newRow[h] = row[k];
                });
                return newRow;
            });
            
            if (sheetName.toUpperCase().includes('PREVISAO_CAIXA') || sheetName.toUpperCase().includes('PREVISÃO DE CAIXA') || sheetName.toUpperCase().includes('PREVISAO DE CAIXA')) {
                previsaoCaixaRegistros = previsaoCaixaRegistros.concat(normalizados);
            } else {
                todosRegistros = todosRegistros.concat(extrairRegistrosDeLinhas(normalizados));
            }
        });
        
        setRegistros(todosRegistros);
        setPrevisaoRegistros(previsaoCaixaRegistros);
        setFonte(`Arquivo local (${file.name})`);
      };
      reader.readAsArrayBuffer(file);
    } catch(err) {
      alert('Erro: ' + err.message);
    }
  };

  const handlePresetChange = (preset) => {
    setFilterPreset(preset);

    if (preset === 'custom') {
        // Keeps the existing filter dates but does not auto-apply
        return;
    }

    const hoje = new Date();
    
    const dStr = (d) => d.toISOString().substring(0, 10);
    
    let novoDe = '';
    let novoAte = '';

    if (preset === 'this-month') {
        const logico = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        novoDe = dStr(logico);
        novoAte = dStr(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));
    } else if (preset === 'this-quarter') {
        const quarter = Math.floor(hoje.getMonth() / 3);
        const logico = new Date(hoje.getFullYear(), quarter * 3, 1);
        novoDe = dStr(logico);
        novoAte = dStr(new Date(hoje.getFullYear(), quarter * 3 + 3, 0));
    } else if (preset === 'this-semester') {
        const semester = Math.floor(hoje.getMonth() / 6);
        const logico = new Date(hoje.getFullYear(), semester * 6, 1);
        novoDe = dStr(logico);
        novoAte = dStr(new Date(hoje.getFullYear(), semester * 6 + 6, 0));
    } else if (preset === 'this-year') {
        novoDe = dStr(new Date(hoje.getFullYear(), 0, 1));
        novoAte = dStr(new Date(hoje.getFullYear(), 12, 0));
    } else if (preset === 'all') {
        novoDe = '';
        novoAte = '';
    } else if (preset === 'this-week') {
        const diaSemana = hoje.getDay();
        const domingo = new Date(hoje);
        domingo.setDate(hoje.getDate() - diaSemana);
        const sabado = new Date(domingo);
        sabado.setDate(domingo.getDate() + 6);
        novoDe = dStr(domingo);
        novoAte = dStr(sabado);
    } else if (preset === 'today') {
        novoDe = dStr(hoje);
        novoAte = dStr(hoje);
    }

    setFilterDe(novoDe);
    setFilterAte(novoAte);
    // Auto-aplicar
    setAppliedDe(novoDe);
    setAppliedAte(novoAte);
  };

  const aplicarFiltros = () => {
    setAppliedDe(filterDe);
    setAppliedAte(filterAte);
  };

  const clearFilters = () => {
    setFilterMetric('valorFechado');
    setFilterFlowType('line');
    setSearchProjeto('');
    setFilterStatusProjeto('all');
    handlePresetChange('all');
    setAppliedDe('');
    setAppliedAte('');
  };

  const downloadCSV = () => {
    if (filteredRegistros.length === 0) return;
    const headers = Object.keys(filteredRegistros[0]);
    const csvContent = [
      headers.join(';'),
      ...filteredRegistros.map(reg => headers.map(h => {
        let val = reg[h] !== null && reg[h] !== undefined ? String(reg[h]) : '';
        if (val.includes(';') || val.includes('\n') || val.includes('"')) {
            val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      }).join(';'))
    ].join('\n');
    
    // Add BOM for Excel readability in UTF-8
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "dados_dashboard.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Apply filters logic
  const filteredRegistros = useMemo(() => {
    const existeDataValida = registros.some(reg => Boolean(reg.mesChave));
    if (!existeDataValida) return registros;

    return registros.filter(reg => {
        // Avulsos ou Mock Data sem transacoes
        if (!reg.transacoes || reg.transacoes.length === 0) {
            if (!reg.mesChave) return !appliedDe && !appliedAte;
            if (appliedDe && reg.mesChave < appliedDe) return false;
            if (appliedAte && reg.mesChave > appliedAte) return false;
            return true;
        }

        // Projetos: se foi criado no período ou teve transação no período, entra.
        let createdAt = reg.criadoEm || reg.mesChave;
        let wasCreatedInPeriod = true;
        if (appliedDe && createdAt < appliedDe) wasCreatedInPeriod = false;
        if (appliedAte && createdAt > appliedAte) wasCreatedInPeriod = false;

        let hasTransactionInPeriod = false;
        reg.transacoes.forEach(t => {
            const d = t.dataPagamento ? t.dataPagamento.substring(0, 10) : t.criadoEm.substring(0, 10);
            let inside = true;
            if (appliedDe && d < appliedDe) inside = false;
            if (appliedAte && d > appliedAte) inside = false;
            if (inside) hasTransactionInPeriod = true;
        });

        return wasCreatedInPeriod || hasTransactionInPeriod;
    }).map(reg => {
        if (!reg.transacoes || reg.transacoes.length === 0) return reg;

        let validEntrada = 0;
        let validSaida = 0;
        reg.transacoes.forEach(t => {
            const d = t.dataPagamento ? t.dataPagamento.substring(0, 10) : t.criadoEm.substring(0, 10);
            let inside = true;
            if (appliedDe && d < appliedDe) inside = false;
            if (appliedAte && d > appliedAte) inside = false;
            if (inside) {
                if (t.tipo === 'ENTRADA') validEntrada += Number(t.valor);
                if (t.tipo === 'SAIDA') validSaida += Number(t.valor);
            }
        });

        let createdAt = reg.criadoEm || reg.mesChave;
        let wasCreated = true;
        if (appliedDe && createdAt < appliedDe) wasCreated = false;
        if (appliedAte && createdAt > appliedAte) wasCreated = false;

        return {
            ...reg,
            entrada: validEntrada,
            saida: validSaida,
            valorFechado: wasCreated ? reg.valorFechado : 0,
            valorRestante: wasCreated ? (reg.valorFechado - validEntrada) : 0
        };
    });
  }, [registros, appliedDe, appliedAte]);

  const dashboardData = useMemo(() => {
    const kpis = { faturamentoTotal: 0, aReceber: 0, totalEntradas: 0, totalSaidas: 0, lucroLiquido: 0 };
    const fluxoPorMes = {};
    const parceirosMap = {};

    filteredRegistros.forEach(reg => {
        kpis.faturamentoTotal += reg.valorFechado;
        kpis.totalEntradas += reg.entrada;
        kpis.totalSaidas += reg.saida;

        if (!reg.transacoes || reg.transacoes.length === 0) {
            let chaveFallback = reg.mesChave;
            if (filterAgrupamento === 'semanal' && chaveFallback) {
                chaveFallback = getISOWeekKey(chaveFallback);
            } else if (filterAgrupamento === 'mensal' && chaveFallback) {
                chaveFallback = chaveFallback.substring(0, 7); // YYYY-MM
            }
            if (chaveFallback) {
                if (!fluxoPorMes[chaveFallback]) fluxoPorMes[chaveFallback] = { entradas: 0, saidas: 0 };
                fluxoPorMes[chaveFallback].entradas += reg.entrada;
                fluxoPorMes[chaveFallback].saidas += reg.saida;
            }
        } else {
            reg.transacoes.forEach(t => {
                const dateStr = t.dataPagamento ? t.dataPagamento.substring(0, 10) : t.criadoEm.substring(0, 10);
                let inside = true;
                if (appliedDe && dateStr < appliedDe) inside = false;
                if (appliedAte && dateStr > appliedAte) inside = false;
                if (inside) {
                    let dKey = dateStr;
                    if (filterAgrupamento === 'semanal') {
                        dKey = getISOWeekKey(dateStr);
                    } else if (filterAgrupamento === 'mensal') {
                        dKey = dateStr.substring(0, 7); // YYYY-MM
                    }
                    
                    if (!fluxoPorMes[dKey]) fluxoPorMes[dKey] = { entradas: 0, saidas: 0 };
                    if (t.tipo === 'ENTRADA') fluxoPorMes[dKey].entradas += Number(t.valor);
                    if (t.tipo === 'SAIDA') fluxoPorMes[dKey].saidas += Number(t.valor);
                }
            });
        }

        const mVal = Number(reg[filterMetric] || 0);
        if (mVal > 0) parceirosMap[reg.parceiro] = (parceirosMap[reg.parceiro] || 0) + mVal;
    });

    kpis.aReceber = kpis.faturamentoTotal - kpis.totalEntradas;
    kpis.lucroLiquido = kpis.totalEntradas - kpis.totalSaidas;

    const chavesMeses = Object.keys(fluxoPorMes).sort();
    const fluxo = {
        meses: chavesMeses.map(k => formatarMesChave(k, filterAgrupamento)),
        entradas: chavesMeses.map(c => Number(fluxoPorMes[c].entradas.toFixed(2))),
        saidas: chavesMeses.map(c => Number(fluxoPorMes[c].saidas.toFixed(2))),
        saldos: chavesMeses.map(c => Number((fluxoPorMes[c].entradas - fluxoPorMes[c].saidas).toFixed(2)))
    };

    const parceiros = Object.entries(parceirosMap).sort((a, b) => b[1] - a[1]);

    return { kpis, fluxo, parceiros, qtdMeses: chavesMeses.length };
  }, [filteredRegistros, filterMetric, filterAgrupamento]);

  const topProjetos = useMemo(() => {
    return [...filteredRegistros].filter(reg => reg.parceiro !== 'Lançamentos Avulsos (Sem Projeto)').sort((a, b) => b.valorFechado - a.valorFechado);
  }, [filteredRegistros]);

  const filteredProjetos = useMemo(() => {
    return topProjetos.filter(reg => {
      const matchSearch = reg.parceiro.toLowerCase().includes(searchProjeto.toLowerCase()) || 
                          (reg.servico || '').toLowerCase().includes(searchProjeto.toLowerCase());
      const statusRaw = (reg.status || "").toLowerCase().trim();
      const statusValue = (statusRaw === 'concluído' || statusRaw === 'concluido') ? 'concluido' : 'em-andamento';
      const matchStatus = filterStatusProjeto === 'all' || statusValue === filterStatusProjeto;
      
      return matchSearch && matchStatus;
    });
  }, [topProjetos, searchProjeto, filterStatusProjeto]);

  // Chart styling
  const textColor = '#64748b';
  const gridColor = '#e2e8f0';

  const chartPrevisaoData = {
    labels: dashboardData.fluxo.meses,
    datasets: [
        { label: 'Entradas Reais', data: dashboardData.fluxo.entradas, backgroundColor: 'rgba(16, 185, 129, 0.4)', borderColor: '#10b981', borderWidth: 2, type: filterFlowType === 'line' ? 'line' : 'bar', fill: filterFlowType === 'line', tension: 0.3 },
        { label: 'Saídas Reais', data: dashboardData.fluxo.saidas, backgroundColor: 'rgba(239, 68, 68, 0.4)', borderColor: '#ef4444', borderWidth: 2, type: filterFlowType === 'line' ? 'line' : 'bar', fill: filterFlowType === 'line', tension: 0.3 },
        { label: 'Saldo do Período', data: dashboardData.fluxo.saldos, borderColor: '#065f46', backgroundColor: 'rgba(6, 95, 70, 0.15)', borderWidth: 3, type: 'line', fill: true, tension: 0.3 }
    ]
  };

  const dadosPrevisaoCaixa = useMemo(() => {
    let entradasPrevisao = [];
    let saidasPrevisao = [];
    let saldosPrevisao = [];
    let mesesPrevisao = [];
    
    if (previsaoRegistros.length === 0) return null;

    const val = (linha, keywords) => {
        const chaves = Object.keys(linha);
        const k = chaves.find(chave => keywords.some(kw => chave.includes(kw)));
        if (!k) return 0;
        const v = linha[k];
        if (typeof v === 'number') return v;
        let txt = String(linha[k] || '0').replace(/[R$\s]/g, '');
        if (txt.includes(',') && txt.includes('.')) {
            txt = txt.replace(/\./g, '').replace(',', '.');
        } else if (txt.includes(',')) {
            txt = txt.replace(',', '.');
        }
        return Number(txt) || 0;
    };

    let filteredPrevisao = previsaoRegistros;
    if (appliedDe || appliedAte) {
        filteredPrevisao = previsaoRegistros.filter(linha => {
           const chaves = Object.keys(linha);
           const keyData = chaves.find(chave => ['DATA', 'MES', 'VENCIMENTO', 'COMPETENCIA'].some(kw => chave.includes(kw)));
           const dateVal = parseDataParaMes(keyData ? linha[keyData] : undefined)?.chave;
           if (!dateVal) return true; // keep items without date
           if (appliedDe && dateVal < appliedDe) return false;
           if (appliedAte && dateVal > appliedAte) return false;
           return true;
        });
    }

    const grouped = {};
    filteredPrevisao.forEach(linha => {
       const chaves = Object.keys(linha);
       const keyData = chaves.find(chave => ['DATA', 'MES', 'VENCIMENTO', 'COMPETENCIA'].some(kw => chave.includes(kw)));
       const dateVal = parseDataParaMes(keyData ? linha[keyData] : undefined)?.chave || 'Sem Data';
       
       if (!grouped[dateVal]) grouped[dateVal] = { entrada: 0, saida: 0, saldo: 0 };
       
       let ent = val(linha, ['ENTRADA', 'RECEITA', 'PAGO', 'RECEBIMENTO', 'CREDITO']);
       let sai = val(linha, ['SAIDA', 'DESPESA', 'CUSTO', 'PAGAMENTO', 'DEBITO']);
       
       const keyTipo = chaves.find(chave => ['TIPO', 'CATEGORIA', 'CLASSIFICACAO', 'NATUREZA'].some(kw => chave.includes(kw)));
       const keyValor = chaves.find(chave => ['VALOR', 'TOTAL', 'MONTANTE', 'PREVISTO'].some(kw => chave.includes(kw)));
       
       if (ent === 0 && sai === 0 && keyTipo && keyValor) {
           const tipoStr = String(linha[keyTipo]).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
           const valorStr = val(linha, ['VALOR', 'TOTAL', 'MONTANTE', 'PREVISTO']);
           if (['ENTRADA', 'RECEITA', 'CREDITO'].some(k => tipoStr.includes(k))) {
               ent = valorStr;
           } else if (['SAIDA', 'DESPESA', 'CUSTO', 'DEBITO', 'PAGAMENTO'].some(k => tipoStr.includes(k))) {
               sai = valorStr;
           }
       }
       
       grouped[dateVal].entrada += ent;
       grouped[dateVal].saida += sai;
       grouped[dateVal].saldo += val(linha, ['SALDO', 'CAIXA', 'RESTITUIDO', 'LIQUIDO']);
    });

    const chavesMeses = Object.keys(grouped).filter(k => k !== 'Sem Data').sort();
    
    chavesMeses.forEach(mes => {
        mesesPrevisao.push(formatarMesChave(mes));
        entradasPrevisao.push(grouped[mes].entrada);
        saidasPrevisao.push(grouped[mes].saida);
        // Only override saldo if it was explicitly parsed as 0 (not found in columns)
        saldosPrevisao.push(grouped[mes].saldo !== 0 ? grouped[mes].saldo : (grouped[mes].entrada - grouped[mes].saida));
    });

    return {
        meses: mesesPrevisao,
        entradas: entradasPrevisao,
        saidas: saidasPrevisao,
        saldos: saldosPrevisao
    };
  }, [previsaoRegistros, appliedDe, appliedAte]);

  // Categorias Previsao
  const previsaoPorCategoria = useMemo(() => {
    let entradasCat = {};
    let saidasCat = {};

    let filteredPrevisao = previsaoRegistros;
    if (appliedDe || appliedAte) {
        filteredPrevisao = previsaoRegistros.filter(linha => {
           const chaves = Object.keys(linha);
           const keyData = chaves.find(chave => ['DATA', 'MES', 'VENCIMENTO', 'COMPETENCIA'].some(kw => chave.includes(kw)));
           const dateVal = parseDataParaMes(keyData ? linha[keyData] : undefined)?.chave;
           if (!dateVal) return true;
           if (appliedDe && dateVal < appliedDe) return false;
           if (appliedAte && dateVal > appliedAte) return false;
           return true;
        });
    }

    filteredPrevisao.forEach(linha => {
        const chaves = Object.keys(linha);
        const keyCategoria = chaves.find(chave => ['CATEGORIA', 'TIPO', 'CLASSIFICA'].some(kw => chave.includes(kw)));
        const keyTipo = chaves.find(chave => ['TIPO', 'NATUREZA'].some(kw => chave.includes(kw)));
        
        let valor = 0;
        let txt = String(linha['VALOR'] || linha['TOTAL'] || '0').replace(/[R$\s]/g, '');
        if (txt.includes(',') && txt.includes('.')) txt = txt.replace(/\./g, '').replace(',', '.');
        else if (txt.includes(',')) txt = txt.replace(',', '.');
        valor = Number(txt) || 0;

        let isEntrada = false;
        let isSaida = false;

        const tipoStr = String(linha[keyTipo] || linha['TIPO']).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (['ENTRADA', 'RECEITA'].some(k => tipoStr.includes(k))) isEntrada = true;
        else if (['SAIDA', 'DESPESA', 'CUSTO'].some(k => tipoStr.includes(k))) isSaida = true;
        else if (valor > 0) isEntrada = true;
        else if (valor < 0) { isSaida = true; valor = Math.abs(valor); }

        const catName = keyCategoria && linha[keyCategoria] ? String(linha[keyCategoria]).trim().toUpperCase() : 'OUTROS';

        if (isEntrada) {
            entradasCat[catName] = (entradasCat[catName] || 0) + valor;
        } else if (isSaida) {
            saidasCat[catName] = (saidasCat[catName] || 0) + valor;
        }
    });

    return {
        entradas: Object.entries(entradasCat).filter(e => e[1] > 0).sort((a,b) => b[1]-a[1]),
        saidas: Object.entries(saidasCat).filter(e => e[1] > 0).sort((a,b) => b[1]-a[1])
    };
  }, [previsaoRegistros, appliedDe, appliedAte]);

  const corDoughnut = ['#3b82f6', '#60a5fa', '#2563eb', '#93c5fd', '#1d4ed8', '#bfdbfe', '#1e40af'];
  const corDoughnutSaida = ['#eab308', '#facc15', '#ca8a04', '#fef08a', '#a16207', '#fef9c3', '#713f12'];

  const chartEntradasCatData = {
    labels: previsaoPorCategoria.entradas.map(e => e[0]),
    datasets: [{
        data: previsaoPorCategoria.entradas.map(e => e[1]),
        backgroundColor: corDoughnut,
        borderWidth: 0
    }]
  };

  const chartSaidasCatData = {
    labels: previsaoPorCategoria.saidas.map(e => e[0]),
    datasets: [{
        data: previsaoPorCategoria.saidas.map(e => e[1]),
        backgroundColor: corDoughnutSaida,
        borderWidth: 0
    }]
  };

  const chartPrevisaoCaixaData = dadosPrevisaoCaixa ? {
    labels: dadosPrevisaoCaixa.meses,
    datasets: [
        { label: 'Entradas Previstas', data: dadosPrevisaoCaixa.entradas, backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: '#2563eb', borderWidth: 2, type: 'bar' },
        { label: 'Saídas Previstas', data: dadosPrevisaoCaixa.saidas, backgroundColor: 'rgba(234, 179, 8, 0.5)', borderColor: '#ca8a04', borderWidth: 2, type: 'bar' },
        { label: 'Saldo Previsto', data: dadosPrevisaoCaixa.saldos, borderColor: '#064e3b', backgroundColor: 'rgba(6, 78, 59, 0.15)', borderWidth: 3, type: 'line', fill: true, tension: 0.3 }
    ]
  } : null;

  const listaTransacoesRaw = useMemo(() => {
    const transacoes = [];
    registros.forEach(reg => {
        if (reg.transacoes && reg.transacoes.length > 0) {
            reg.transacoes.forEach(t => {
                const dataStr = t.dataPagamento ? t.dataPagamento.substring(0, 10) : t.criadoEm.substring(0, 10);
                transacoes.push({
                    id: t.id || Math.random().toString(36),
                    data: dataStr,
                    mesChave: formatarMesChave(dataStr.substring(0, 7), 'mensal'),
                    parceiro: reg.parceiro,
                    servico: reg.servico || 'N/A',
                    tipo: t.tipo,
                    valor: Number(t.valor)
                });
            });
        } else {
            // Caso seja mock ou planilha sem transações detalhadas
            const dataStr = reg.mesChave ? (reg.mesChave.length >= 10 ? reg.mesChave.substring(0, 10) : `${reg.mesChave}-01`) : 'Sem Data';
            const mesChaveFormatado = reg.mesChave ? formatarMesChave(reg.mesChave.substring(0, 7), 'mensal') : 'Sem Data';
            if (reg.entrada > 0) {
                transacoes.push({
                    id: Math.random().toString(36),
                    data: dataStr,
                    mesChave: mesChaveFormatado,
                    parceiro: reg.parceiro,
                    servico: reg.servico || 'N/A',
                    tipo: 'ENTRADA',
                    valor: Number(reg.entrada)
                });
            }
            if (reg.saida > 0) {
                transacoes.push({
                    id: Math.random().toString(36),
                    data: dataStr,
                    mesChave: mesChaveFormatado,
                    parceiro: reg.parceiro,
                    servico: reg.servico || 'N/A',
                    tipo: 'SAIDA',
                    valor: Number(reg.saida)
                });
            }
        }
    });

    // Ordenar da mais recente para a mais antiga
    return transacoes.sort((a, b) => b.data.localeCompare(a.data));
  }, [registros]);

  const listaTransacoesFiltrada = useMemo(() => {
    return listaTransacoesRaw.filter(t => {
        const dataFormatada = t.data.length >= 10 ? t.data.substring(0, 10).split('-').reverse().join('/') : t.data.split('-').reverse().join('/');
        
        if (filterTableData && !dataFormatada.includes(filterTableData)) return false;
        if (filterTableMes && !t.mesChave.toLowerCase().includes(filterTableMes.toLowerCase())) return false;
        if (filterTableParceiro && !t.parceiro.toLowerCase().includes(filterTableParceiro.toLowerCase())) return false;
        if (filterTableServico && !(t.servico || 'N/A').toLowerCase().includes(filterTableServico.toLowerCase())) return false;
        if (filterTableTipo !== 'ALL' && t.tipo !== filterTableTipo) return false;
        if (filterTableValor && !String(t.valor).includes(filterTableValor)) return false;
        
        return true;
    });
  }, [listaTransacoesRaw, filterTableData, filterTableMes, filterTableParceiro, filterTableServico, filterTableTipo, filterTableValor]);

  const chartPrevisaoOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
    },
    plugins: { legend: { labels: { color: textColor } } }
  };

  return (
    <>
      <header style={{
          backgroundImage: 'url(/CAPA_DASHBOARD.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          color: '#1f2937',
          padding: '85px 20px 80px 20px',
          boxShadow: 'none',
          position: 'relative'
      }}>
        <div className="header-content" style={{ position: 'relative', zIndex: 1 }}>
            <div>
                <h1 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: 800, color: '#064e3b', textShadow: '1px 1px 2px rgba(255,255,255,0.7)' }}></h1>
            </div>
            <div className="header-actions">
                <button onClick={fetchData} className="btn btn-primary" style={{ background: '#059669', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: 'none' }}>
                    <i className="fa-solid fa-rotate-right"></i> Atualizar
                </button>
            </div>
        </div>
      </header>

      <div className="container">
        
        {/* KPI Cards */}
        <div className="grid-row grid-5">
            <div className="card kpi-card">
                <div className="kpi-icon primary"><i className="fa-solid fa-wallet"></i></div>
                <div className="kpi-info">
                    <span className="kpi-label">Faturamento Total</span>
                    <span className="kpi-value">{formatarMoeda(dashboardData.kpis.faturamentoTotal)}</span>
                </div>
            </div>
            <div className="card kpi-card">
                <div className="kpi-icon success"><i className="fa-solid fa-arrow-trend-up"></i></div>
                <div className="kpi-info">
                    <span className="kpi-label">Total Entradas</span>
                    <span className="kpi-value">{formatarMoeda(dashboardData.kpis.totalEntradas)}</span>
                </div>
            </div>
            <div className="card kpi-card">
                <div className="kpi-icon danger"><i className="fa-solid fa-arrow-trend-down"></i></div>
                <div className="kpi-info">
                    <span className="kpi-label">Total Saídas</span>
                    <span className="kpi-value">{formatarMoeda(dashboardData.kpis.totalSaidas)}</span>
                </div>
            </div>
            <div className="card kpi-card">
                <div className="kpi-icon warning"><i className="fa-solid fa-file-invoice-dollar"></i></div>
                <div className="kpi-info">
                    <span className="kpi-label">A Receber</span>
                    <span className="kpi-value">{formatarMoeda(dashboardData.kpis.aReceber)}</span>
                </div>
            </div>
            <div className="card kpi-card">
                <div className="kpi-icon success"><i className="fa-solid fa-sack-dollar"></i></div>
                <div className="kpi-info">
                    <span className="kpi-label">Lucro Líquido</span>
                    <span className="kpi-value">{formatarMoeda(dashboardData.kpis.lucroLiquido)}</span>
                </div>
            </div>
        </div>

        {/* Barra de Filtros Rápida em cima dos gráficos */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select 
                    value={filterPreset} 
                    onChange={e => handlePresetChange(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontWeight: '600' }}
                >
                    <option value="this-month">Este Mês</option>
                    <option value="this-quarter">Este Trimestre</option>
                    <option value="this-semester">Este Semestre</option>
                    <option value="this-year">Este Ano</option>
                    <option value="all">Todo Histórico</option>
                    <option value="custom">Personalizado</option>
                </select>

                {filterPreset === 'custom' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                            type="date" 
                            value={filterDe} 
                            onChange={e => setFilterDe(e.target.value)} 
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '13px' }} 
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>até</span>
                        <input 
                            type="date" 
                            value={filterAte} 
                            onChange={e => setFilterAte(e.target.value)} 
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '13px' }} 
                        />
                        <button className="btn btn-primary" onClick={aplicarFiltros} style={{ padding: '6px 12px', fontSize: '13px', marginLeft: '4px' }}>OK</button>
                    </div>
                )}

                <select 
                    value={filterAgrupamento} 
                    onChange={e => setFilterAgrupamento(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                >
                    <option value="mensal">Agrupar por Mês</option>
                    <option value="semanal">Agrupar por Semana</option>
                </select>

                <select 
                    value={filterFlowType} 
                    onChange={e => setFilterFlowType(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                >
                    <option value="line">Gráfico de Linha</option>
                    <option value="bar">Gráfico de Coluna</option>
                </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {filteredRegistros.length} lançamentos via {fonte}
                </span>
                <button className="btn btn-secondary" onClick={downloadCSV} title="Baixar CSV" style={{ margin: 0, padding: '8px 14px' }}>
                    <i className="fa-solid fa-file-csv"></i> CSV
                </button>
            </div>
        </div>

        <div className="grid-row">
            <div className="card">
                <div className="card-header" style={{ marginBottom: 0 }}>
                    <span className="card-title"><i className="fa-solid fa-chart-bar"></i> Faturamento por Parceiro</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', background: 'var(--bg-color)' }}>
                        <i className="fa-solid fa-search" style={{ color: 'var(--text-muted)', fontSize: '13px' }}></i>
                        <input 
                            type="text" 
                            placeholder="Buscar parceiro..." 
                            value={searchParceiroGrafico}
                            onChange={e => setSearchParceiroGrafico(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: 'var(--text-main)', width: '130px' }}
                        />
                    </div>
                </div>
                <div className="bar-chart" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px', marginTop: '16px' }}>
                    {dashboardData.parceiros.length > 0 ? dashboardData.parceiros
                        .filter(([nome]) => nome.toLowerCase().includes(searchParceiroGrafico.toLowerCase()))
                        .map(([nome, val], i) => {
                        const maxVal = Math.max(...dashboardData.parceiros.map(p => p[1]), 1);
                        const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                        return (
                            <div className="bar-row" key={nome}>
                                <div className="bar-label">{nome}</div>
                                <div className="bar-track">
                                    <div className="bar-fill" style={{ width: `${(val / maxVal) * 100}%`, background: cores[i % cores.length], minWidth: val < 3000 ? '4px' : 'auto', position: 'relative' }}>
                                        <span className={val < 3000 ? "val-outside d-desktop-only" : "val-inside"}>
                                            {formatarMoeda(val)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : 'Sem dados'}
                </div>
            </div>
        </div>

        <div className="grid-row">
            <div className="card">
                <div className="card-header">
                    <span className="card-title"><i className="fa-solid fa-chart-line"></i> Evolução de Entradas e Saídas</span>
                </div>
                <div className="chart-container">
                    <Chart type="bar" data={chartPrevisaoData} options={chartPrevisaoOptions} />
                </div>
            </div>
            
            {previsaoRegistros.length > 0 && chartPrevisaoCaixaData && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title"><i className="fa-solid fa-money-bill-trend-up"></i> Previsão de Contas e Caixa</span>
                    </div>
                    <div className="chart-container">
                        <Chart type="bar"
                            data={chartPrevisaoCaixaData} 
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                                    y: { grid: { color: gridColor }, ticks: { color: textColor } }
                                },
                                plugins: { legend: { labels: { color: textColor } } }
                            }} 
                        />
                    </div>
                </div>
            )}
        </div>

        <div className="grid-row">
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <span className="card-title"><i className="fa-solid fa-list-check"></i> Status dos Projetos</span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input 
                            type="text" 
                            placeholder="Buscar parceiro ou serviço..." 
                            value={searchProjeto}
                            onChange={(e) => setSearchProjeto(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', minWidth: '200px' }}
                        />
                        <select 
                            value={filterStatusProjeto}
                            onChange={(e) => setFilterStatusProjeto(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
                        >
                            <option value="all">Todos os Status</option>
                            <option value="em-andamento">Em Andamento</option>
                            <option value="concluido">Concluído</option>
                        </select>
                    </div>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Cliente / Parceiro</th>
                                <th>Serviço Executado</th>
                                <th style={{ textAlign: 'center' }}>Status Atual</th>
                                <th style={{ textAlign: 'right' }}>Valor Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProjetos.map((reg, idx) => (
                                <tr key={idx}>
                                    <td><span className="client-name">{reg.parceiro}</span></td>
                                    <td>{reg.servico || 'N/A'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {String(reg.id).startsWith('avulsos-') ? (
                                            <span className="status-badge status-concluido">{reg.status}</span>
                                        ) : (
                                            <select
                                                value={(() => {
                                                    const s = (reg.status || 'EM ANDAMENTO').trim().toUpperCase();
                                                    if (s === 'CONCLUIDO') return 'CONCLUÍDO';
                                                    return s;
                                                })()}
                                                onChange={(e) => updateProjetoStatus(reg.id, e.target.value)}
                                                className={`status-badge ${(() => {
                                                    const s = (reg.status || "").toLowerCase().trim();
                                                    if (s === 'concluído' || s === 'concluido') return 'status-concluido';
                                                    if (s === 'em elaboração' || s === 'em elaboracao') return 'status-em-elaboracao';
                                                    if (s === 'em analise orgao' || s === 'em análise órgão') return 'status-em-analise';
                                                    return 'status-em-andamento';
                                                })()}`}
                                                style={{ cursor: 'pointer', appearance: 'auto', border: 'none', fontWeight: 'bold', paddingRight: '20px', textAlign: 'center' }}
                                            >
                                                <option value="EM ANDAMENTO" style={{color: '#fff', background: 'var(--primary)'}}>EM ANDAMENTO</option>
                                                <option value="EM ELABORAÇÃO" style={{color: '#fff', background: 'var(--warning)'}}>EM ELABORAÇÃO</option>
                                                <option value="EM ANALISE ORGAO" style={{color: '#fff', background: '#8b5cf6'}}>EM ANÁLISE ÓRGÃO</option>
                                                <option value="CONCLUÍDO" style={{color: '#fff', background: 'var(--success)'}}>CONCLUÍDO</option>
                                            </select>
                                        )}
                                    </td>
                                    <td className="money-cell" style={{ textAlign: 'right' }}>{formatarMoeda(reg.valorFechado)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div className="grid-row">
            <div className="card">
                <div className="card-header">
                    <span className="card-title"><i className="fa-solid fa-money-bill-transfer"></i> Detalhamento de Entradas e Saídas</span>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Mês</th>
                                <th>Cliente / Parceiro</th>
                                <th>Serviço</th>
                                <th style={{ textAlign: 'center' }}>Tipo</th>
                                <th style={{ textAlign: 'right' }}>Valor</th>
                            </tr>
                            <tr style={{ background: 'var(--card-bg)' }}>
                                <th style={{ padding: '4px' }}><input type="text" placeholder="Filtrar..." value={filterTableData} onChange={e => setFilterTableData(e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px' }} /></th>
                                <th style={{ padding: '4px' }}><input type="text" placeholder="Filtrar..." value={filterTableMes} onChange={e => setFilterTableMes(e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px' }} /></th>
                                <th style={{ padding: '4px' }}><input type="text" placeholder="Filtrar..." value={filterTableParceiro} onChange={e => setFilterTableParceiro(e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px' }} /></th>
                                <th style={{ padding: '4px' }}><input type="text" placeholder="Filtrar..." value={filterTableServico} onChange={e => setFilterTableServico(e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px' }} /></th>
                                <th style={{ padding: '4px', textAlign: 'center' }}>
                                    <select value={filterTableTipo} onChange={e => setFilterTableTipo(e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                        <option value="ALL">Todos</option>
                                        <option value="ENTRADA">Entrada</option>
                                        <option value="SAIDA">Saída</option>
                                    </select>
                                </th>
                                <th style={{ padding: '4px' }}><input type="text" placeholder="Filtrar..." value={filterTableValor} onChange={e => setFilterTableValor(e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'right' }} /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {listaTransacoesFiltrada.length > 0 ? (
                                listaTransacoesFiltrada.map((t, idx) => (
                                    <tr key={idx}>
                                        <td>{t.data.length >= 10 ? t.data.substring(0, 10).split('-').reverse().join('/') : t.data.split('-').reverse().join('/')}</td>
                                        <td>{t.mesChave}</td>
                                        <td><span className="client-name">{t.parceiro}</span></td>
                                        <td>{t.servico}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                                backgroundColor: t.tipo === 'ENTRADA' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: t.tipo === 'ENTRADA' ? '#10b981' : '#ef4444'
                                            }}>
                                                {t.tipo}
                                            </span>
                                        </td>
                                        <td className="money-cell" style={{ color: t.tipo === 'ENTRADA' ? '#10b981' : '#ef4444', fontWeight: 'bold', textAlign: 'right' }}>
                                            {t.tipo === 'SAIDA' ? '-' : '+'}{formatarMoeda(t.valor)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                        Nenhuma transação encontrada no período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>

      <footer>
        <p>
          Desenvolvido por{' '}
          <a href="https://github.com/patrickangeli" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'inherit', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'} onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}>
            <i className="fa-brands fa-github" style={{ fontSize: '18px' }}></i>
            patrickangeli
          </a>
        </p>
      </footer>
    </>
  );
}