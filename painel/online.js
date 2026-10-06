/* PETHUB · Painel Staff — módulo "Solicitações Online".
   Mostra o que os clientes pediram pelo site (consultas, banho & tosa, pedidos da loja,
   cadastros) lendo a camada compartilhada PetHubStore, e devolve o status para o site. */
(function () {
  const MOD = 'online-inbox';
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // O que cada perfil enxerga
  const VISAO = {
    petshop: ['banhos', 'pedidos'],
    'gestor-pet': ['banhos', 'pedidos'],
    reception: ['consultas', 'pedidos', 'clientes'],
    'gestor-clin': ['consultas', 'pedidos', 'clientes'],
    vet: ['consultas']
  };
  const TITULOS = {
    consultas: '🩺 Consultas agendadas pelo site',
    banhos: '🛁 Banho & Tosa agendados pelo site',
    pedidos: '🛒 Pedidos da loja online',
    clientes: '👤 Novos cadastros de tutores'
  };

  // Entra no menu de todos os perfis, logo abaixo do primeiro módulo
  Object.keys(ROLES).forEach(r => {
    ROLES[r].modules.splice(2, 0, { id: MOD, icon: '🌐', label: 'Solicitações Online' });
  });

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function brl(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); }
  // Cada tipo de solicitação só existe se o plano de assinatura incluir o módulo
  const TIPO_NO_PLANO = {
    consultas: () => PetHubPlans.tem('clinica'),
    banhos: () => PetHubPlans.tem('petshop'),
    pedidos: () => PetHubPlans.tem('farmacia') || PetHubPlans.tem('loja-online'),
    clientes: () => true
  };
  function tipos() { return (VISAO[currentRole] || []).filter(t => TIPO_NO_PLANO[t]()); }

  function pendentes() {
    return tipos().reduce((n, t) => {
      const lista = PetHubStore.list(t);
      if (t === 'pedidos') return n + lista.filter(p => p.statusIdx < PetHubStore.etapasPedido(p).length - 1).length;
      if (t === 'clientes') return n;
      return n + lista.filter(x => x.status === 'pendente').length;
    }, 0);
  }

  function atualizarBadge() {
    const btn = document.querySelector('.side-nav-item[data-module="' + MOD + '"]');
    if (!btn) return;
    let b = btn.querySelector('.badge');
    const n = pendentes();
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'badge'; btn.appendChild(b); }
    b.textContent = n;
  }

  function pillStatus(status) {
    const st = PetHubStore.STATUS[status] || PetHubStore.STATUS.pendente;
    return '<span class="pill" style="background:' + st.cor + ';color:#fff;">' + st.rotulo + '</span>';
  }

  function acoes(tipo, reg) {
    const b = (acao, rotulo, cls) => '<button class="' + cls + '" style="padding:7px 14px;font-size:12px;" data-online-acao="' + acao + '" data-tipo="' + tipo + '" data-id="' + esc(reg.id) + '">' + rotulo + '</button>';
    if (reg.status === 'pendente') return b('confirmado', '✓ Confirmar', 'btn-primary') + b('cancelado', 'Cancelar', 'btn-secondary');
    if (reg.status === 'confirmado') return b('concluido', '✓ Concluir atendimento', 'btn-primary') + b('cancelado', 'Cancelar', 'btn-secondary');
    return '';
  }

  function linha(titulo, sub, direita) {
    return '<div style="display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px 0;border-top:1px solid var(--glass-border);">'
      + '<div style="min-width:220px;flex:1;"><div style="font-weight:800;color:var(--text-light);font-size:14px;">' + titulo + '</div>'
      + '<div style="color:var(--text-muted);font-size:12.5px;margin-top:3px;line-height:1.5;">' + sub + '</div></div>'
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' + direita + '</div></div>';
  }

  const LINHAS = {
    consultas(c) {
      const quando = String(c.dia).padStart(2, '0') + ' ' + MESES[c.mes] + ' ' + c.ano + ' · ' + esc(c.hora);
      return linha(
        esc(c.pet) + ' (' + esc(c.especie) + ') · ' + esc(c.especialidade) + (c.modalidade === 'video' ? ' · 📹 Teleconsulta' : ' · 🏥 Presencial'),
        '📅 ' + quando + ' · 👨‍⚕️ ' + esc(c.vet) + '<br>👤 ' + esc(c.tutor) + ' · 📱 ' + esc(c.telefone) + ' · 💰 ' + brl(c.total),
        pillStatus(c.status) + acoes('consultas', c));
    },
    banhos(b) {
      const transp = b.transporte === 'levatraz' ? '🚐 Leva-e-traz' + (b.endereco ? ' · ' + esc(b.endereco) : '') : '🏥 Tutor traz e retira';
      return linha(
        esc(b.pet) + ' · ' + esc(b.servico),
        '📅 ' + esc(b.data) + ' · ' + esc(b.hora) + ' · ' + transp + '<br>👤 ' + esc(b.tutor) + ' · 🐶 ' + esc(b.raca) + ' · 💰 ' + brl(b.total) + (b.whatsapp ? ' · 💬 Avisar no WhatsApp' : ''),
        pillStatus(b.status) + acoes('banhos', b));
    },
    pedidos(p) {
      const etapas = PetHubStore.etapasPedido(p);
      const fim = p.statusIdx >= etapas.length - 1;
      const itens = (p.items || []).map(it => it.qty + '× ' + esc(it.name)).join(', ');
      const btn = fim ? '' : '<button class="btn-primary" style="padding:7px 14px;font-size:12px;" data-online-acao="avancar" data-tipo="pedidos" data-id="' + esc(p.id) + '">→ ' + etapas[p.statusIdx + 1] + '</button>';
      return linha(
        esc(p.num) + ' · ' + brl(p.total),
        itens + '<br>' + esc(p.date) + ' · ' + esc(p.payLabel) + ' · ' + esc(p.delLabel),
        '<span class="pill" style="background:' + (fim ? '#2E9E6B' : '#7C3AED') + ';color:#fff;">' + etapas[p.statusIdx] + '</span>' + btn);
    },
    clientes(c) {
      return linha(esc(c.nome), '✉️ ' + esc(c.email) + ' · 📱 ' + esc(c.telefone) + ' · cadastrado em ' + new Date(c.criadoEm).toLocaleString('pt-BR'), '<span class="pill info">Novo pelo site</span>');
    }
  };

  function render() {
    const root = document.querySelector('#mainContent #onlineInboxRoot');
    if (!root) return;
    const secoes = tipos().map(t => {
      const lista = PetHubStore.list(t);
      const corpo = lista.length
        ? lista.map(LINHAS[t]).join('')
        : '<div style="padding:22px 0 8px;color:var(--text-muted);font-size:13px;border-top:1px solid var(--glass-border);">Nenhuma solicitação por enquanto. Assim que um cliente pedir pelo site, aparece aqui.</div>';
      return '<div class="card" style="margin-bottom:18px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
        + '<h3 style="font-family:\'Fraunces\',serif;font-size:18px;font-weight:800;color:var(--text-light);">' + TITULOS[t] + '</h3>'
        + '<span class="pill neutral">' + lista.length + '</span></div>' + corpo + '</div>';
    }).join('');
    root.innerHTML = secoes;
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-online-acao]');
    if (!btn) return;
    const { onlineAcao: acao, tipo, id } = btn.dataset;
    if (acao === 'limpar') {
      if (confirm('Apagar todas as solicitações online desta demonstração?')) PetHubStore.clear();
      return;
    }
    if (acao === 'avancar') {
      const p = PetHubStore.list('pedidos').find(x => x.id === id);
      if (p) PetHubStore.update('pedidos', id, { statusIdx: p.statusIdx + 1 });
      return;
    }
    PetHubStore.update(tipo, id, { status: acao });
  });

  PetHubStore.subscribe(() => { atualizarBadge(); render(); });

  // Encaixa no fluxo existente do painel sem alterar as funções originais
  const navegarOriginal = window.navigateTo;
  window.navigateTo = function (moduleId) {
    navegarOriginal(moduleId);
    if (moduleId === MOD) render();
  };
  const loginOriginal = window.doLogin;
  window.doLogin = function () {
    loginOriginal();
    atualizarBadge();
  };
})();
