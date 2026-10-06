/* PETHUB · Painel Staff — planos de assinatura.
   Bloqueia perfis e módulos fora do plano ativo (com cadeado e convite de upgrade)
   e adiciona a tela "Assinatura" para os gestores trocarem de plano. */
(function () {
  const P = window.PetHubPlans;
  const MOD = 'assinatura';

  // Perfis inteiros que dependem de um módulo
  const PERFIL_EXIGE = { 'petshop': 'petshop', 'gestor-pet': 'petshop' };
  // Módulos de venda dentro dos perfis da clínica: precisam ao menos da farmácia
  const VENDAS = ['rc-pdv', 'rc-entrada', 'rc-inventory', 'rc-relatorios-merc',
                  'gc-rc-pdv', 'gc-rc-entrada', 'gc-inventory', 'gc-rc-relatorios-merc'];
  const PDVS = ['rc-pdv', 'gc-rc-pdv', 'ps-pdv', 'gp-ps-pdv'];
  const SEMPRE_LIVRES = [MOD, 'online-inbox'];

  ['gestor-pet', 'gestor-clin'].forEach(r => {
    ROLES[r].modules.push({ group: 'Conta' }, { id: MOD, icon: '💳', label: 'Assinatura' });
  });

  function exigido(moduleId) {
    if (SEMPRE_LIVRES.includes(moduleId)) return null;
    if (VENDAS.includes(moduleId)) return 'farmacia';
    return PERFIL_EXIGE[currentRole] || 'clinica';
  }
  function bloqueado(moduleId) {
    const mod = exigido(moduleId);
    return mod && !P.tem(mod) ? mod : null;
  }
  function ehGestor() { return currentRole === 'gestor-pet' || currentRole === 'gestor-clin'; }

  /* ---------- estilos ---------- */
  const style = document.createElement('style');
  style.id = 'planos-style';
  style.textContent = `
    .role-card.plano-bloqueado{opacity:.55;}
    .role-card .plano-lock{display:block;margin-top:8px;font-size:11.5px;font-weight:800;color:var(--accent);}
    .side-nav-item.plano-bloqueado{opacity:.55;}
    .side-nav-item .plano-cadeado{margin-left:auto;font-size:12px;}
    .planos-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;align-items:stretch;}
    .plano-card{display:flex;flex-direction:column;gap:12px;position:relative;}
    .plano-card.atual{border-color:var(--green-500);box-shadow:0 0 0 1px var(--green-500) inset;}
    .plano-card h3{font-family:'Fraunces',serif;font-size:22px;font-weight:800;color:var(--text-light);}
    .plano-preco{font-family:'Fraunces',serif;font-size:32px;font-weight:800;color:var(--text-light);line-height:1;}
    .plano-preco small{font-family:'Nunito';font-size:12.5px;font-weight:700;color:var(--text-muted);}
    .plano-resumo{font-size:12.5px;color:var(--text-muted);line-height:1.5;min-height:38px;}
    .plano-lista{list-style:none;display:flex;flex-direction:column;gap:7px;font-size:13px;color:var(--text-light-2);}
    .plano-lista li.off{color:var(--text-muted);opacity:.6;text-decoration:line-through;}
    .plano-limites{display:grid;grid-template-columns:1fr auto;gap:5px 12px;font-size:12.5px;color:var(--text-muted);
      border-top:1px solid var(--glass-border);padding-top:12px;}
    .plano-limites b{color:var(--text-light);text-align:right;}
    .plano-card .btn-primary,.plano-card .btn-secondary{justify-content:center;margin-top:auto;}
    .plano-selo{position:absolute;top:14px;right:14px;}
  `;
  document.head.appendChild(style);

  /* ---------- tela de login: perfis fora do plano ---------- */
  function marcarPerfis() {
    document.querySelectorAll('.role-card').forEach(card => {
      const perfil = Object.keys(PERFIL_EXIGE).find(r => card.classList.contains(r));
      const mod = perfil && PERFIL_EXIGE[perfil];
      const travado = !!mod && !P.tem(mod);
      card.classList.toggle('plano-bloqueado', travado);
      let aviso = card.querySelector('.plano-lock');
      if (!travado) { if (aviso) aviso.remove(); return; }
      if (!aviso) {
        aviso = document.createElement('span');
        aviso.className = 'plano-lock';
        card.querySelector('p').after(aviso);
      }
      aviso.textContent = '🔒 Disponível no plano ' + P.planoMinimo(mod).nome;
    });
  }

  const selecionarOriginal = window.selectRole;
  window.selectRole = function (role) {
    const mod = PERFIL_EXIGE[role];
    if (mod && !P.tem(mod)) {
      alert('Este perfil faz parte do plano ' + P.planoMinimo(mod).nome + '.\n\n'
        + 'Seu plano atual é o ' + P.atual().nome + '. Para liberar, entre como Gestor Clínica e abra "Assinatura".');
      return;
    }
    selecionarOriginal(role);
  };

  /* ---------- menu lateral: cadeado nos módulos fora do plano ---------- */
  function marcarMenu() {
    document.querySelectorAll('#sideNav .side-nav-item[data-module]').forEach(btn => {
      const travado = !!bloqueado(btn.dataset.module);
      btn.classList.toggle('plano-bloqueado', travado);
      let cad = btn.querySelector('.plano-cadeado');
      if (travado && !cad) {
        cad = document.createElement('span');
        cad.className = 'plano-cadeado';
        cad.textContent = '🔒';
        cad.title = 'Fora do seu plano';
        btn.appendChild(cad);
      } else if (!travado && cad) {
        cad.remove();
      }
    });
  }

  /* ---------- convite de upgrade ---------- */
  function telaUpgrade(moduleId, mod) {
    const alvo = P.planoMinimo(mod);
    const item = (ROLES[currentRole].modules.find(m => m.id === moduleId) || {}).label || 'Este módulo';
    const acao = ehGestor()
      ? '<button class="btn-primary" data-plano-ir="1">Ver planos e fazer upgrade →</button>'
      : '<div style="font-size:12.5px;color:var(--text-muted);">Peça ao gestor para fazer o upgrade em <b>Assinatura</b>.</div>';
    document.getElementById('mainContent').innerHTML = `
      <div class="module-page">
        <div class="module-header"><h2><span class="ico">🔒</span>${item}</h2></div>
        <div class="card" style="text-align:center;padding:54px 28px;">
          <div style="font-size:44px;margin-bottom:14px;">${P.MODULOS[mod].ico}</div>
          <h3 style="font-family:'Fraunces',serif;font-size:22px;font-weight:800;color:var(--text-light);margin-bottom:10px;">
            Disponível no plano ${alvo.nome}</h3>
          <p style="color:var(--text-muted);font-size:13.5px;max-width:440px;margin:0 auto 22px;line-height:1.6;">
            <b>${P.MODULOS[mod].nome}</b> não faz parte do seu plano atual (${P.atual().nome}).
            Faça o upgrade para o ${alvo.nome}, por ${P.preco(alvo)}/mês, e libere este módulo no painel e no site.</p>
          ${acao}
        </div>
      </div>`;
    document.querySelectorAll('.side-nav-item').forEach(b => b.classList.toggle('active', b.dataset.module === moduleId));
  }

  /* ---------- tela Assinatura ---------- */
  function renderAssinatura() {
    const root = document.querySelector('#mainContent #assinaturaRoot');
    if (!root) return;
    const atual = P.atual();
    const idxAtual = P.PLANOS.indexOf(atual);
    const cards = P.PLANOS.map((pl, i) => {
      const ehAtual = pl.id === atual.id;
      const modulos = Object.keys(P.MODULOS).map(m => {
        const on = pl.modulos.includes(m);
        return '<li class="' + (on ? '' : 'off') + '">' + (on ? '✓ ' : '— ') + P.MODULOS[m].nome + '</li>';
      }).join('');
      const l = pl.limites;
      const botao = ehAtual
        ? '<button class="btn-secondary" disabled style="opacity:.7;cursor:default;">Plano atual</button>'
        : '<button class="' + (i > idxAtual ? 'btn-primary' : 'btn-secondary') + '" data-plano-mudar="' + pl.id + '">'
          + (i > idxAtual ? 'Fazer upgrade para ' : 'Mudar para ') + pl.nome + '</button>';
      return '<div class="card plano-card' + (ehAtual ? ' atual' : '') + '">'
        + (ehAtual ? '<span class="pill success plano-selo">Seu plano</span>' : '')
        + '<h3>' + pl.nome + '</h3>'
        + '<div class="plano-preco">' + P.preco(pl) + ' <small>/ mês</small></div>'
        + '<div class="plano-resumo">' + pl.resumo + '</div>'
        + '<ul class="plano-lista">' + modulos + '</ul>'
        + '<div class="plano-limites">'
        + '<span>Usuários do painel</span><b>' + P.limiteTexto(l.usuarios) + '</b>'
        + '<span>Veterinários</span><b>' + P.limiteTexto(l.veterinarios) + '</b>'
        + '<span>Unidades</span><b>' + P.limiteTexto(l.unidades) + '</b>'
        + '<span>Suporte</span><b>' + l.suporte + '</b>'
        + '</div>' + botao + '</div>';
    }).join('');
    root.innerHTML = '<div class="planos-grid">' + cards + '</div>'
      + '<p style="margin-top:16px;font-size:12px;color:var(--text-muted);">Demonstração: a troca de plano é imediata e não gera cobrança. '
      + 'O site do cliente passa a mostrar apenas os serviços do plano escolhido.</p>';
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-plano-ir]')) { navigateTo(MOD); return; }
    const btn = e.target.closest('[data-plano-mudar]');
    if (!btn) return;
    const pl = P.PLANOS.find(p => p.id === btn.dataset.planoMudar);
    if (pl && confirm('Mudar a assinatura para o plano ' + pl.nome + ' (' + P.preco(pl) + '/mês)?')) P.definir(pl.id);
  });

  /* ---------- encaixe no fluxo existente ---------- */
  const navegarOriginal = window.navigateTo;
  window.navigateTo = function (moduleId) {
    const mod = bloqueado(moduleId);
    if (mod) { toggleMobileNav(false); telaUpgrade(moduleId, mod); return; }
    navegarOriginal(moduleId);
    if (moduleId === MOD) renderAssinatura();
    // Sem loja física, o PDV vende só farmácia
    if (PDVS.includes(moduleId) && !P.tem('loja-fisica')) {
      const root = document.getElementById('mainContent');
      const loja = root.querySelector('.pdv-tab[data-pdv-tab="loja"]');
      const farm = root.querySelector('.pdv-tab[data-pdv-tab="farmacia"]');
      if (loja && farm) { loja.style.display = 'none'; farm.click(); }
    }
  };

  const loginOriginal = window.doLogin;
  window.doLogin = function () {
    loginOriginal();
    marcarMenu();
  };

  P.subscribe(() => {
    marcarPerfis();
    if (!currentRole) return;
    marcarMenu();
    const ativo = document.querySelector('#sideNav .side-nav-item.active');
    if (ativo) navigateTo(ativo.dataset.module);
  });

  marcarPerfis();
})();
