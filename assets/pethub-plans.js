/* PETHUB — planos de assinatura do aplicativo (o que a clínica/pet shop contrata).
   Fonte única para o site do cliente e para o painel staff: cada plano liga um conjunto
   de módulos e define limites de uso. O plano ativo fica no localStorage (sem servidor,
   a troca de plano é simulada). */
(function () {
  const KEY = 'pethub:plano';
  const PADRAO = 'premium'; // sem plano salvo, a demonstração abre com tudo liberado
  const ouvintes = [];

  const MODULOS = {
    'clinica':     { nome: 'Clínica Veterinária', ico: '🩺' },
    'farmacia':    { nome: 'Farmácia Pet (online e balcão)', ico: '💊' },
    'petshop':     { nome: 'Petshop · Banho & Tosa', ico: '🛁' },
    'loja-fisica': { nome: 'Loja Física', ico: '🏪' },
    'loja-online': { nome: 'Loja Online', ico: '🛒' }
  };

  // Preços em dólar, por mês. Em ordem crescente: quem vem depois inclui tudo de quem vem antes.
  const PLANOS = [
    {
      id: 'basic', nome: 'Basic', preco: 19,
      resumo: 'Para a clínica que está começando.',
      modulos: ['clinica'],
      limites: { usuarios: 3, veterinarios: 1, unidades: 1, suporte: 'E-mail' }
    },
    {
      id: 'standard', nome: 'Standard', preco: 39,
      resumo: 'Clínica com farmácia vendendo online e no balcão.',
      modulos: ['clinica', 'farmacia'],
      limites: { usuarios: 8, veterinarios: 3, unidades: 1, suporte: 'E-mail e chat' }
    },
    {
      id: 'premium', nome: 'Premium', preco: 79,
      resumo: 'Operação completa: clínica, petshop, lojas e farmácia.',
      modulos: ['clinica', 'farmacia', 'petshop', 'loja-fisica', 'loja-online'],
      limites: { usuarios: null, veterinarios: null, unidades: 3, suporte: 'Prioritário 24h' }
    }
  ];

  function porId(id) { return PLANOS.find(p => p.id === id); }

  function avisar() {
    ouvintes.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }
  window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) avisar(); });

  let memoria = null;

  window.PetHubPlans = {
    MODULOS, PLANOS,

    /** Plano ativo. */
    atual() {
      let id = memoria;
      try { id = localStorage.getItem(KEY) || memoria; } catch (e) { /* segue só em memória */ }
      return porId(id) || porId(PADRAO);
    },

    /** Troca o plano ativo (simulado, sem cobrança). */
    definir(id) {
      if (!porId(id)) return;
      memoria = id;
      try { localStorage.setItem(KEY, id); } catch (e) { /* segue só em memória */ }
      avisar();
    },

    /** O plano ativo inclui este módulo? */
    tem(modulo) { return this.atual().modulos.includes(modulo); },

    /** Plano mais barato que inclui o módulo. */
    planoMinimo(modulo) { return PLANOS.find(p => p.modulos.includes(modulo)); },

    /** Texto de um limite: número ou "Ilimitado". */
    limiteTexto(v) { return v == null ? 'Ilimitado' : String(v); },

    preco(plano) { return 'US$ ' + plano.preco.toFixed(2).replace('.', ','); },

    subscribe(fn) { ouvintes.push(fn); }
  };
})();
