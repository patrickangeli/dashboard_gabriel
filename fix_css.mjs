import fs from 'fs';

const css = `:root {
    --bg-color: #f8fafc; --card-bg: #ffffff; --text-main: #334155; --text-muted: #64748b;
    --text-heading: #0f172a; --primary: #3b82f6; --success: #10b981; --warning: #f59e0b;
    --danger: #ef4444; --border: #e2e8f0; --accent: #2563eb;
    --header-bg: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    --shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --card-radius: 16px;
}

body.dark-mode {
    --bg-color: #0f172a; --card-bg: #1e293b; --text-main: #cbd5e1; --text-muted: #94a3b8;
    --text-heading: #f8fafc; --primary: #60a5fa; --border: #334155; --accent: #3b82f6;
    --header-bg: #0f172a;
    --shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
}

* { box-sizing: border-box; margin: 0; padding: 0; transition: background-color 0.3s, color 0.3s, border-color 0.3s; }
body { background-color: var(--bg-color); font-family: 'Inter', sans-serif; color: var(--text-main); }

header { background: var(--header-bg); color: white; padding: 30px 20px 80px 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 15px; align-items: center; }

.container { max-width: 1400px; margin: -60px auto 40px auto; padding: 0 20px; display: flex; flex-direction: column; gap: 24px; position: relative; }

.grid-row { display: grid; gap: 24px; }
.grid-4 { grid-template-columns: repeat(4, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-2 { grid-template-columns: 1fr 1fr; }

.card { background: var(--card-bg); border-radius: var(--card-radius); padding: 24px; box-shadow: var(--shadow); border: 1px solid var(--border); overflow: hidden; }
.card-header { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: 600; color: var(--text-heading); align-items: center; flex-wrap: wrap; gap: 10px;}

/* KPI Cards */
.kpi-card { display: flex; align-items: center; gap: 20px; padding: 24px; }
.kpi-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
.kpi-icon.primary { background: rgba(59, 130, 246, 0.1); color: var(--primary); }
.kpi-icon.success { background: rgba(16, 185, 129, 0.1); color: var(--success); }
.kpi-icon.warning { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
.kpi-icon.danger { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

.kpi-info { display: flex; flex-direction: column; }
.kpi-label { font-size: 13px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
.kpi-value { font-size: 28px; font-weight: 700; color: var(--text-heading); }

.chart-container { position: relative; height: 320px; width: 100%; }

.controls-card { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; align-items: end; }
.control-group { display: flex; flex-direction: column; gap: 8px; }
.control-group label { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
.control-group input, .control-group select {
    width: 100%; border: 1px solid var(--border); border-radius: 10px; padding: 12px;
    background: var(--bg-color); color: var(--text-main); font-family: inherit; font-size: 14px;
}
.actions-row { display: flex; gap: 12px; }
.btn { border: none; border-radius: 10px; padding: 12px 20px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
.btn-secondary { background: var(--bg-color); color: var(--text-heading); border: 1px solid var(--border); }
.btn-secondary:hover { background: var(--border); }
.btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 8px rgba(59, 130, 246, 0.4); }

.filter-status { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; background: rgba(59, 130, 246, 0.05); border: 1px dashed var(--primary); border-radius: 12px; padding: 12px 16px; margin-top: 20px; }
.filter-status strong { color: var(--primary); font-size: 14px; }

.card-title { font-size: 16px; font-weight: 600; color: var(--text-heading); display: inline-flex; align-items: center; gap: 10px; }
.card-summary { margin-top: 20px; padding-top: 16px; font-size: 14px; color: var(--text-muted); border-top: 1px solid var(--border); }

.bar-chart { display: flex; flex-direction: column; gap: 16px; margin-top: 10px; }
.bar-row { display: flex; align-items: center; gap: 16px; }
.bar-label { flex: 0 0 140px; font-size: 14px; font-weight: 600; color: var(--text-main); text-align: right; }
.bar-track { flex-grow: 1; background: var(--bg-color); border-radius: 8px; height: 32px; overflow: hidden; position: relative; }
.bar-fill { height: 100%; display: flex; align-items: center; justify-content: flex-end; padding-right: 12px; color: #fff; font-size: 13px; font-weight: 700; border-radius: 8px; transition: width 1s ease-out; }

.doughnut-wrapper { display: flex; gap: 30px; align-items: center; justify-content: center; padding: 10px 0; }
.doughnut-container { width: 220px; height: 220px; position: relative; }
.doughnut-legend { list-style: none; display: flex; flex-direction: column; gap: 16px; }
.doughnut-legend li { display: flex; align-items: center; font-size: 14px; color: var(--text-main); font-weight: 500;}

table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 14px; }
th { text-align: left; padding: 16px; border-bottom: 2px solid var(--border); color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;}
td { padding: 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
tr:last-child td { border-bottom: none; }

.status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.status-elaboracao { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
.status-concluido { background: rgba(16, 185, 129, 0.1); color: var(--success); }

.client-name { font-weight: 700; color: var(--text-heading); display: block; font-size: 15px;}
.money-cell { font-weight: 700; color: var(--text-heading); }

footer { text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 14px; border-top: 1px solid var(--border); background: var(--bg-color); margin-top: 40px;}

.theme-toggle { background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 8px; padding: 8px 12px; cursor: pointer; transition: 0.2s; font-size: 18px; }
.theme-toggle:hover { background: rgba(255,255,255,0.1); }
body.dark-mode .theme-toggle { color: #facc15; border-color: rgba(255,255,255,0.1); }

/* MEDIA QUERIES NA BASE DO ARQUIVO PARA OVERRIDE CORRETO */
@media (max-width: 1024px) { 
    .grid-4 { grid-template-columns: repeat(2, 1fr); } 
}

@media (max-width: 768px) { 
    .grid-3, .grid-2, .grid-4 { grid-template-columns: 1fr; } 
    .header-content { flex-direction: column; text-align: center; gap: 20px; }
    .header-actions { justify-content: center; width: 100%; flex-wrap: wrap; }
    
    .bar-chart { width: 100%; align-items: stretch !important; gap: 24px; }
    .bar-row { flex-direction: column; align-items: flex-start; gap: 8px; width: 100%; }
    .bar-track { width: 100%; overflow: visible !important; }
    .bar-fill { overflow: visible !important; min-width: max-content; padding: 0 12px; border-radius: 8px; justify-content: center; }
    
    /* AQUI A CORREÇAO DO NOME! */
    .bar-label { 
        text-align: right; 
        flex: none; 
        font-size: 13px; 
        width: 100%; 
        color: var(--text-muted); 
        padding-top: 2px;
        order: 2; /* Coloca titulo EMBAIXO da barra! */
    }

    .doughnut-wrapper { flex-direction: column; }
    .container { margin-top: -20px; }
    .kpi-card { flex-direction: column; text-align: center; padding: 20px; }
    .kpi-info { align-items: center; }
    .card { padding: 16px; }
    .table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    nav { flex-direction: column; text-align: center; }
}
`;
fs.writeFileSync('src/index.css', css);
