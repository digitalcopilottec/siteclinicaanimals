/* PETHUB — camada de dados compartilhada entre o site do cliente e o painel staff.
   Guarda tudo no localStorage do navegador (sem servidor): o que o cliente solicita
   no site aparece no painel, e o status alterado no painel volta para o site.
   Abas diferentes do mesmo navegador se atualizam sozinhas via evento "storage". */
(function () {
  const KEY = 'pethub:v1';
  const TIPOS = ['consultas', 'banhos', 'pedidos', 'clientes'];
  const ouvintes = [];
  let memoria = null; // usado quando o localStorage não está disponível

  function vazio() {
    const d = {};
    TIPOS.forEach(t => { d[t] = []; });
    return d;
  }

  function ler() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = memoria; }
    if (!d || typeof d !== 'object') d = memoria || vazio();
    TIPOS.forEach(t => { if (!Array.isArray(d[t])) d[t] = []; });
    return d;
  }

  function gravar(d) {
    memoria = d;
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* segue só em memória */ }
    avisar();
  }

  function avisar() {
    ouvintes.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) avisar(); });

  window.PetHubStore = {
    /** Lista os registros de um tipo, do mais novo para o mais antigo. */
    list(tipo) { return ler()[tipo] || []; },

    /** Cria um registro; devolve o registro já com id e criadoEm. */
    add(tipo, dados) {
      const d = ler();
      const reg = Object.assign({}, dados, {
        id: tipo.slice(0, 3) + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        criadoEm: new Date().toISOString()
      });
      d[tipo].unshift(reg);
      gravar(d);
      return reg;
    },

    /** Altera campos de um registro existente. */
    update(tipo, id, mudancas) {
      const d = ler();
      const reg = d[tipo].find(r => r.id === id);
      if (!reg) return null;
      Object.assign(reg, mudancas, { atualizadoEm: new Date().toISOString() });
      gravar(d);
      return reg;
    },

    remove(tipo, id) {
      const d = ler();
      d[tipo] = d[tipo].filter(r => r.id !== id);
      gravar(d);
    },

    /** Chama fn sempre que os dados mudarem (nesta aba ou em outra). */
    subscribe(fn) { ouvintes.push(fn); },

    /** Apaga todas as solicitações (útil para reiniciar a demonstração). */
    clear() { gravar(vazio()); },

    /** Etapas de acompanhamento de um pedido da loja — usadas no site e no painel. */
    etapasPedido(pedido) {
      return pedido.delivery === 'retirada'
        ? ['Pedido confirmado', 'Em separação', 'Pronto para retirada', 'Retirado pelo tutor']
        : ['Pedido confirmado', 'Em separação', 'Saiu para entrega', 'Entregue'];
    },

    STATUS: {
      pendente:   { rotulo: 'Aguardando confirmação', cor: '#E8913A' },
      confirmado: { rotulo: 'Confirmado',             cor: '#7C3AED' },
      concluido:  { rotulo: 'Concluído',              cor: '#2E9E6B' },
      cancelado:  { rotulo: 'Cancelado',              cor: '#E63946' }
    }
  };
})();
