import fs from 'fs';
let content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

content = content.replace("export default function App() {", "export default function Dashboard() {");

const oldFetchData = \`const fetchData = async () => {
    setLastUpdate('A buscar dados...');
    try {
      const response = await fetch(SHEET_URL);
      if (!response.ok) throw new Error('Falha na requisição CORS/HTTP');
      const text = await response.text();
      const parsedObj = parseCSV(text);
      const regs = extrairRegistrosDeLinhas(parsedObj);
      setRegistros(regs.length ? regs : getMockData());
      setFonte(regs.length ? 'Google Sheets (CSV)' : 'Mock Data (Nenhum válido)');
    } catch (e) {
      console.warn("Falling back to Mock Data:", e);
      setRegistros(getMockData());
      setFonte('Mock Data (Falha de Conexão)');
    }
    setLastUpdate(\\\`Última atualização: \\\${new Date().toLocaleTimeString()}\\\`);
  };\`;

const newFetchData = \`const fetchData = async () => {
    setLastUpdate('A buscar dados...');
    try {
      const respDash = await fetch('http://localhost:3001/api/dashboard');
      const respPrev = await fetch('http://localhost:3001/api/previsao');
      
      if (!respDash.ok || !respPrev.ok) throw new Error('Falha na API Local');
      
      const regs = await respDash.json();
      const previsoes = await respPrev.json();
      
      setRegistros(regs.length ? regs : getMockData());
      setPrevisaoRegistros(previsaoes || []);
      setFonte('PostgreSQL + Prisma');
    } catch (e) {
      console.warn("Falling back to Mock Data:", e);
      setRegistros(getMockData());
      setFonte('Mock Data (Falha de Conexão)');
    }
    setLastUpdate(\\\`Última atualização: \\\${new Date().toLocaleTimeString()}\\\`);
  };\`;

content = content.replace(oldFetchData, newFetchData);
fs.writeFileSync('src/pages/Dashboard.jsx', content);
