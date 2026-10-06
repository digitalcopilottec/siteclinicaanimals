/* PETHUB · Site do cliente — aplica o plano de assinatura ativo.
   Para o cliente final, o que não está no plano simplesmente não aparece
   (o convite de upgrade fica no painel staff, para quem contrata o aplicativo). */
(function () {
  const P = window.PetHubPlans;
  const FARMACIA_CATS = ['medsr', 'rx', 'supl'];

  // O que esconder quando cada módulo NÃO está no plano
  const ESCONDER = {
    'clinica': [
      '[onclick^="goClinica"]'
    ],
    'petshop': [
      '[onclick^="goBanhoTosa"]', '[onclick^="openBathBooking"]', '[onclick^="openPS"]', '#dogFab',
      '.tsb-item[data-tpage="petshop"]', '.tsb-item[data-tpage="plano-estetica"]', '.next-appt.petshop'
    ],
    'loja-fisica': [
      '[onclick^="goPetshop"]'
    ],
    'loja-online': [
      '.srv-card[onclick^="goShop"]'
    ],
    'farmacia': [
      '[onclick^="goFarmacia"]'
    ]
  };

  const css = Object.keys(ESCONDER).map(mod =>
    ESCONDER[mod].map(sel => 'body.sem-' + mod + ' ' + sel).join(',') + '{display:none !important;}'
  ).concat([
    // Sem loja online e sem farmácia não existe carrinho nem pedidos
    'body.sem-vendas [onclick^="goShop"], body.sem-vendas .tsb-item[data-tpage="pedidos"]{display:none !important;}',
    // Só farmácia: a loja online mostra apenas as categorias de farmácia
    'body.so-farmacia .shop-cat-btn:not([data-cat="all"])' + FARMACIA_CATS.map(c => ':not([data-cat="' + c + '"])').join('') + '{display:none !important;}'
  ]).join('\n');
  const style = document.createElement('style');
  style.id = 'planos-style';
  style.textContent = css;
  document.head.appendChild(style);

  Object.keys(P.MODULOS).forEach(mod => document.body.classList.toggle('sem-' + mod, !P.tem(mod)));
  const soFarmacia = P.tem('farmacia') && !P.tem('loja-online');
  document.body.classList.toggle('sem-vendas', !P.tem('farmacia') && !P.tem('loja-online'));
  document.body.classList.toggle('so-farmacia', soFarmacia);

  if (soFarmacia) {
    // Catálogo fica só com os itens de farmácia
    for (let i = products.length - 1; i >= 0; i--) {
      if (!FARMACIA_CATS.includes(products[i].cat)) products.splice(i, 1);
    }
    const btn = document.querySelector('.nav-links [onclick^="goShop"]');
    if (btn) btn.textContent = '💊 Farmácia online';
  }

  // Plano trocado no painel (outra aba): recarrega para aplicar
  P.subscribe(() => location.reload());
})();
