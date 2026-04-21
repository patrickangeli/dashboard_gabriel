import fetch from 'node-fetch';
async function run() {
    const res = await fetch('http://localhost:3001/api/dashboard');
    const records = await res.json();
    let totalEntradas = 0;
    records.forEach(r => totalEntradas += r.entrada);
    console.log('Total API Entradas =', totalEntradas);
    const sumProjs = records.filter(r => !r.id.toString().startsWith('avulso')).reduce((s, r) => s + r.entrada, 0);
    console.log('Total API Entradas (somente projetos) =', sumProjs);
}
run();
