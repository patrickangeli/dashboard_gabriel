import React, { useState, useEffect } from 'react';

export default function InsertData() {
  const [projetos, setProjetos] = useState([]);
  const [tipoInsercao, setTipoInsercao] = useState('projeto');
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => setProjetos(data))
      .catch(e => console.error(e));
  }, []);

  const changeTab = (tipo) => {
    setTipoInsercao(tipo);
    setMensagem({texto:'', tipo:''});
  };

  const showMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: '', tipo: '' }), 5000);
  };

  const handleProjetoSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      cliente: e.target.cliente.value,
      servico: e.target.servico.value,
      status: e.target.status.value,
      valorFechado: e.target.valorFechado.value
    };
    try {
      const res = await fetch('/api/projetos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showMensagem('Projeto inserido com sucesso!', 'success');
        e.target.reset();
        const r = await fetch('/api/dashboard');
        const d = await r.json();
        setProjetos(d);
      } else throw new Error();
    } catch {
      showMensagem('Falha ao inserir projeto.', 'error');
    }
  };

  const handleTransacaoSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      projetoId: e.target.projetoId.value,
      tipo: e.target.tipo.value,
      valor: e.target.valor.value,
      dataPagamento: e.target.dataPagamento.value,
      categoria: e.target.categoria.value,
      descricao: e.target.descricao.value
    };
    try {
      const res = await fetch('/api/transacoes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showMensagem('Transação inserida com sucesso!', 'success');
        e.target.reset();
      } else throw new Error();
    } catch {
      showMensagem('Falha ao inserir transação.', 'error');
    }
  };

  const handlePrevisaoSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      tipo: e.target.tipo.value,
      valor: e.target.valor.value,
      dataPrevista: e.target.dataPrevista.value,
      categoria: e.target.categoria.value,
      descricao: e.target.descricao.value
    };
    try {
      const res = await fetch('/api/previsao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showMensagem('Previsão de caixa inserida com sucesso!', 'success');
        e.target.reset();
      } else throw new Error();
    } catch {
      showMensagem('Falha ao inserir previsão.', 'error');
    }
  };

  return (
    <>
      <header>
        <div className="header-content" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <div>
                <h1 style={{ fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>Inclusão de Movimentações</h1>
                <p style={{ color: '#cbd5e1', fontSize: '15px', opacity: 0.9 }}>Cadastre novos projetos, pagamentos ou receitas e gere previsões futuras.</p>
            </div>
        </div>
      </header>

      <main className="container" style={{ marginTop: '-40px', maxWidth: '800px' }}>
        
        <div className="card" style={{ padding: '0' }}>
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)' }}>
              <button 
                onClick={() => changeTab('projeto')}
                style={{ flex: 1, padding: '20px', background: tipoInsercao === 'projeto' ? 'var(--bg-color)' : 'transparent', border: 'none', borderBottom: tipoInsercao === 'projeto' ? '3px solid var(--primary)' : '3px solid transparent', fontWeight: tipoInsercao === 'projeto' ? 'bold' : 'normal', color: tipoInsercao === 'projeto' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '15px' }}>
                <i className="fa-solid fa-folder-plus"></i> Novo Projeto
              </button>
              <button 
                onClick={() => changeTab('transacao')}
                style={{ flex: 1, padding: '20px', background: tipoInsercao === 'transacao' ? 'var(--bg-color)' : 'transparent', border: 'none', borderBottom: tipoInsercao === 'transacao' ? '3px solid var(--success)' : '3px solid transparent', fontWeight: tipoInsercao === 'transacao' ? 'bold' : 'normal', color: tipoInsercao === 'transacao' ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '15px' }}>
                <i className="fa-solid fa-money-bill-transfer"></i> Transação Realizada
              </button>
              <button 
                onClick={() => changeTab('previsao')}
                style={{ flex: 1, padding: '20px', background: tipoInsercao === 'previsao' ? 'var(--bg-color)' : 'transparent', border: 'none', borderBottom: tipoInsercao === 'previsao' ? '3px solid #8b5cf6' : '3px solid transparent', fontWeight: tipoInsercao === 'previsao' ? 'bold' : 'normal', color: tipoInsercao === 'previsao' ? '#8b5cf6' : 'var(--text-muted)', cursor: 'pointer', fontSize: '15px' }}>
                <i className="fa-solid fa-calendar-plus"></i> Previsão Futura
              </button>
            </div>

            <div style={{ padding: '30px' }}>
              
              {mensagem.texto && (
                <div style={{ padding: '15px', borderRadius: '8px', marginBottom: '20px', background: mensagem.tipo === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: mensagem.tipo === 'success' ? '#10b981' : '#ef4444', border: mensagem.tipo === 'success' ? '1px solid #10b981' : '1px solid #ef4444', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
                  <i className={`fa-solid ${mensagem.tipo === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'}`}></i> {mensagem.texto}
                </div>
              )}

              {tipoInsercao === 'projeto' && (
                <form onSubmit={handleProjetoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="control-group">
                    <label>Cliente / Parceiro *</label>
                    <input name="cliente" required placeholder="Ex: João da Silva" />
                  </div>
                  <div className="control-group">
                    <label>Serviço / Descrição *</label>
                    <input name="servico" required placeholder="Ex: Regularização Ambiental" />
                  </div>
                  <div className="grid-row grid-2">
                    <div className="control-group">
                      <label>Status</label>
                      <select name="status" defaultValue="Serviço Fechado">
                        <option value="Serviço Fechado">Serviço Fechado</option>
                        <option value="Em Elaboração">Em Elaboração</option>
                        <option value="Em Análise Órgão">Em Análise Órgão</option>
                        <option value="Concluído">Concluído</option>
                      </select>
                    </div>
                    <div className="control-group">
                      <label>Valor Fechado (R$) *</label>
                      <input type="number" step="0.01" name="valorFechado" required placeholder="0.00" />
                    </div>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      <i className="fa-solid fa-plus"></i> Inserir Novo Projeto
                    </button>
                  </div>
                </form>
              )}

              {tipoInsercao === 'transacao' && (
                <form onSubmit={handleTransacaoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="control-group">
                    <label>Projeto Vinculado *</label>
                    <select name="projetoId" required defaultValue="">
                      <option value="" disabled>-- Selecione o Projeto --</option>
                      {projetos.map(p => (
                        <option key={p.id} value={p.id}>{p.parceiro} - {p.servico}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid-row grid-2">
                    <div className="control-group">
                      <label>Tipo de Transação *</label>
                      <select name="tipo" style={{ borderLeft: '4px solid var(--success)' }}>
                        <option value="ENTRADA">ENTRADA (Receita)</option>
                        <option value="SAIDA">SAÍDA (Despesa)</option>
                      </select>
                    </div>
                    <div className="control-group">
                      <label>Valor Pago (R$) *</label>
                      <input type="number" step="0.01" name="valor" required placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid-row grid-2">
                     <div className="control-group">
                        <label>Data do Pagamento *</label>
                        <input type="date" name="dataPagamento" required />
                     </div>
                     <div className="control-group">
                        <label>Categoria</label>
                        <input name="categoria" placeholder="Ex: Impostos, Taxas, Entrada" />
                     </div>
                  </div>
                  <div className="control-group">
                    <label>Descrição Opcional</label>
                    <input name="descricao" placeholder="Detalhe adicional" />
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--success)' }}>
                      <i className="fa-solid fa-check-double"></i> Registrar Transação
                    </button>
                  </div>
                </form>
              )}

              {tipoInsercao === 'previsao' && (
                <form onSubmit={handlePrevisaoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="grid-row grid-2">
                    <div className="control-group">
                      <label>Tipo de Lançamento Previsto *</label>
                      <select name="tipo" style={{ borderLeft: '4px solid #8b5cf6' }}>
                        <option value="ENTRADA">ENTRADA Prevista (A Receber)</option>
                        <option value="SAIDA">SAÍDA Prevista (A Pagar)</option>
                      </select>
                    </div>
                    <div className="control-group">
                      <label>Valor Previsto (R$) *</label>
                      <input type="number" step="0.01" name="valor" required placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid-row grid-2">
                    <div className="control-group">
                        <label>Data Prevista *</label>
                        <input type="date" name="dataPrevista" required />
                    </div>
                    <div className="control-group">
                        <label>Categoria</label>
                        <input name="categoria" placeholder="Ex: Folha, Licença, etc" />
                    </div>
                  </div>
                  <div className="control-group">
                    <label>Descrição Curta</label>
                    <input name="descricao" placeholder="Do que se trata esse lançamento?" />
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#8b5cf6' }}>
                      <i className="fa-solid fa-calendar-check"></i> Agendar Previsão
                    </button>
                  </div>
                </form>
              )}

            </div>
        </div>
      </main>

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
