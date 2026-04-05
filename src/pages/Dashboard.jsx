import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Chart } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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

const formatarMesChave = (chave) => {
  const [ano, mes] = String(chave).split('-');
  return `${mes}/${String(ano).slice(-2)}`;
};

const getMockData = () => [
  { parceiro: 'Cliente A', valorFechado: 12000, valorRestante: 5000, entrada: 7000, saida: 2000, mesChave: '2026-01' },
  { parceiro: 'Cliente B', valorFechado: 15000, valorRestante: 0, entrada: 15000, saida: 5000, mesChave: '2026-02' },
  { parceiro: 'Cliente C', valorFechado: 8000, valorRestante: 8000, entrada: 0, saida: 1000, mesChave: '2026-03' },
  { parceiro: 'Cliente A', valorFechado: 10000, valorRestante: 2000, entrada: 8000, saida: 1500, mesChave: '2026-04' }
];

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark'
  );
  const [registros, setRegistros] = useState([]);
  const [previsaoRegistros, setPrevisaoRegistros] = useState([]);
  const [fonte, setFonte] = useState('Aguardando...');
  const [lastUpdate, setLastUpdate] = useState('A aguardar dados...');

  // Filters State
  const [filterDe, setFilterDe] = useState('');
  const [filterAte, setFilterAte] = useState('');
  const [filterPreset, setFilterPreset] = useState('all');
  const [filterMetric, setFilterMetric] = useState('valorFechado');
  const [filterFlowType, setFilterFlowType] = useState('line');

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

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
    setLastUpdate('A buscar dados...');
    try {
      const resp = await fetch('/api/dashboard');
      if (!resp.ok) throw new Error('Falha na requisição CORS/HTTP para Dashboard');
      const dadosDashboard = await resp.json();
      
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
    setLastUpdate(`Última atualização: ${new Date().toLocaleTimeString()}`);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLastUpdate(`A processar ${file.name}...`);
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
        setLastUpdate(`Última atualização: ${new Date().toLocaleTimeString()}`);
      };
      reader.readAsArrayBuffer(file);
    } catch(err) {
      alert('Erro: ' + err.message);
    }
  };

  const handlePresetChange = (preset) => {
    setFilterPreset(preset);
    const hoje = new Date();
    if (preset === 'this-year') {
        setFilterDe(`${hoje.getFullYear()}-01`);
        setFilterAte(`${hoje.getFullYear()}-12`);
    } else if (preset === 'last-12') {
        const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const inicio = new Date(fim);
        inicio.setMonth(inicio.getMonth() - 11);
        setFilterDe(`${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}`);
        setFilterAte(`${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}`);
    } else if (preset === 'all') {
        setFilterDe('');
        setFilterAte('');
    }
  };

  const clearFilters = () => {
    setFilterMetric('valorFechado');
    setFilterFlowType('line');
    handlePresetChange('all');
  };

  // Apply filters logic
  const filteredRegistros = useMemo(() => {
    const existeDataValida = registros.some(reg => Boolean(reg.mesChave));
    if (!existeDataValida) return registros;
    return registros.filter(reg => {
        if (!reg.mesChave) return !filterDe && !filterAte;
        if (filterDe && reg.mesChave < filterDe) return false;
        if (filterAte && reg.mesChave > filterAte) return false;
        return true;
    });
  }, [registros, filterDe, filterAte]);

  const dashboardData = useMemo(() => {
    const kpis = { faturamentoTotal: 0, aReceber: 0, totalEntradas: 0, totalSaidas: 0 };
    const fluxoPorMes = {};
    const parceirosMap = {};

    filteredRegistros.forEach(reg => {
        kpis.faturamentoTotal += reg.valorFechado;
        kpis.aReceber += reg.valorRestante;
        kpis.totalEntradas += reg.entrada;
        kpis.totalSaidas += reg.saida;

        if (reg.mesChave) {
            if (!fluxoPorMes[reg.mesChave]) fluxoPorMes[reg.mesChave] = { entradas: 0, saidas: 0 };
            fluxoPorMes[reg.mesChave].entradas += reg.entrada;
            fluxoPorMes[reg.mesChave].saidas += reg.saida;
        }

        const mVal = Number(reg[filterMetric] || 0);
        if (mVal > 0) parceirosMap[reg.parceiro] = (parceirosMap[reg.parceiro] || 0) + mVal;
    });

    const chavesMeses = Object.keys(fluxoPorMes).sort();
    const fluxo = {
        meses: chavesMeses.map(formatarMesChave),
        entradas: chavesMeses.map(c => Number(fluxoPorMes[c].entradas.toFixed(2))),
        saidas: chavesMeses.map(c => Number(fluxoPorMes[c].saidas.toFixed(2)))
    };

    const parceiros = Object.entries(parceirosMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { kpis, fluxo, parceiros, qtdMeses: chavesMeses.length };
  }, [filteredRegistros, filterMetric]);

  const topProjetos = useMemo(() => {
    return [...filteredRegistros].sort((a, b) => b.valorFechado - a.valorFechado);
  }, [filteredRegistros]);

  // Chart styling
  const textColor = isDarkMode ? '#cbd5e1' : '#64748b';
  const gridColor = isDarkMode ? '#334155' : '#e2e8f0';

  const chartPrevisaoData = {
    labels: dashboardData.fluxo.meses,
    datasets: [
        { label: 'Entradas', data: dashboardData.fluxo.entradas, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.2)', fill: true, tension: 0.3 },
        { label: 'Saídas', data: dashboardData.fluxo.saidas, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.2)', fill: true, tension: 0.3 }
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
    if (filterDe || filterAte) {
        filteredPrevisao = previsaoRegistros.filter(linha => {
           const chaves = Object.keys(linha);
           const keyData = chaves.find(chave => ['DATA', 'MES', 'VENCIMENTO', 'COMPETENCIA'].some(kw => chave.includes(kw)));
           const dateVal = parseDataParaMes(keyData ? linha[keyData] : undefined)?.chave;
           if (!dateVal) return true; // keep items without date
           if (filterDe && dateVal < filterDe) return false;
           if (filterAte && dateVal > filterAte) return false;
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
  }, [previsaoRegistros, filterDe, filterAte]);

  const chartPrevisaoCaixaData = dadosPrevisaoCaixa ? {
    labels: dadosPrevisaoCaixa.meses,
    datasets: [
        { label: 'Entradas Previstas', data: dadosPrevisaoCaixa.entradas, backgroundColor: '#3b82f6', type: 'bar' },
        { label: 'Saídas Previstas', data: dadosPrevisaoCaixa.saidas, backgroundColor: '#f59e0b', type: 'bar' },
        { label: 'Saldo Previsto', data: dadosPrevisaoCaixa.saldos, borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.2)', type: 'line', fill: true, tension: 0.3 }
    ]
  } : null;

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
      <header>
        <div className="header-content">
            <div>
                <h1 style={{ fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>Dashboard Organizacional</h1>
                <p id="last-update" style={{ color: '#cbd5e1', fontSize: '15px', opacity: 0.9 }}>{lastUpdate}</p>
            </div>
            <div className="header-actions">
                <button className="theme-toggle" onClick={toggleTheme} title="Alternar Modo Escuro">
                    <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
                </button>
                <button onClick={fetchData} className="btn btn-primary" style={{ background: 'rgba(255,255,255,0.2)', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <i className="fa-solid fa-rotate-right"></i> Atualizar
                </button>
            </div>
        </div>
      </header>

      <div className="container">
        
        {/* KPI Cards */}
        <div className="grid-row grid-4">
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
        </div>

        {/* Filtros */}
        <div className="card">
            <div className="card-header">
                <span className="card-title"><i className="fa-solid fa-sliders"></i> Filtros de Análise</span>
            </div>
            <div className="controls-card">
                <div className="control-group">
                    <label>De (mês)</label>
                    <input type="month" value={filterDe} onChange={e => { setFilterDe(e.target.value); setFilterPreset('custom'); }} />
                </div>
                <div className="control-group">
                    <label>Até (mês)</label>
                    <input type="month" value={filterAte} onChange={e => { setFilterAte(e.target.value); setFilterPreset('custom'); }} />
                </div>
                <div className="control-group">
                    <label>Atalho de período</label>
                    <select value={filterPreset} onChange={e => handlePresetChange(e.target.value)}>
                        <option value="this-year">Este ano</option>
                        <option value="last-12">Últimos 12 meses</option>
                        <option value="all">Todo histórico</option>
                        <option value="custom">Personalizado</option>
                    </select>
                </div>
                <div className="control-group">
                    <label>Métrica de parceiros</label>
                    <select value={filterMetric} onChange={e => setFilterMetric(e.target.value)}>
                        <option value="valorFechado">Valor Fechado</option>
                        <option value="valorRestante">Valor Restante</option>
                        <option value="entrada">Entradas</option>
                        <option value="saida">Saídas</option>
                    </select>
                </div>
                <div className="control-group">
                    <label>Gráfico de fluxo</label>
                    <select value={filterFlowType} onChange={e => setFilterFlowType(e.target.value)}>
                        <option value="line">Linha</option>
                        <option value="bar">Coluna</option>
                    </select>
                </div>
                <div className="actions-row">
                    <button className="btn btn-secondary" onClick={clearFilters} title="Limpar Filtros"><i className="fa-solid fa-eraser"></i></button>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                        <i className="fa-solid fa-file-excel"></i>
                        <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </label>
                </div>
            </div>
            <div className="filter-status">
                <strong>Período: {filterDe ? formatarMesChave(filterDe) : 'Início'} a {filterAte ? formatarMesChave(filterAte) : 'Fim'}</strong>
                <span>{filteredRegistros.length} lançamento(s) em {dashboardData.qtdMeses} mês(es) via {fonte}</span>
            </div>
        </div>

        <div className="grid-row">
            <div className="card">
                <div className="card-header">
                    <span className="card-title"><i className="fa-solid fa-chart-bar"></i> Faturamento por Parceiro</span>
                </div>
                <div className="bar-chart">
                    {dashboardData.parceiros.length > 0 ? dashboardData.parceiros.map(([nome, val], i) => {
                        const maxVal = Math.max(...dashboardData.parceiros.map(p => p[1]), 1);
                        const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                        return (
                            <div className="bar-row" key={nome}>
                                <div className="bar-label">{nome}</div>
                                <div className="bar-track">
                                    <div className="bar-fill" style={{ width: `${(val / maxVal) * 100}%`, background: cores[i] }}>
                                        {formatarMoeda(val)}
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
                    {filterFlowType === 'line' ? (
                        <Line data={chartPrevisaoData} options={chartPrevisaoOptions} />
                    ) : (
                        <Bar data={chartPrevisaoData} options={chartPrevisaoOptions} />
                    )}
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
                <div className="card-header">
                    <span className="card-title"><i className="fa-solid fa-list-check"></i> Status dos Projetos</span>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Cliente / Parceiro</th>
                                <th>Serviço Executado</th>
                                <th>Status Atual</th>
                                <th>Valor Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topProjetos.map((reg, idx) => (
                                <tr key={idx}>
                                    <td><span className="client-name">{reg.parceiro}</span></td>
                                    <td>{reg.servico || 'N/A'}</td>
                                    <td><span className={`status-badge ${reg.valorRestante > 0 ? 'status-elaboracao' : 'status-concluido'}`}>{reg.valorRestante > 0 ? 'Em Andamento' : 'Concluído'}</span></td>
                                    <td className="money-cell">{formatarMoeda(reg.valorFechado)}</td>
                                </tr>
                            ))}
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