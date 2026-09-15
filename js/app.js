/* ============================================================
   RESTAURANTE — APP PRINCIPAL (Cliente)
   ============================================================ */

const Store = {
  get(key, fallback){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch{ return fallback; }
  },
  set(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
};

function getPratos(){ return Store.get('rest_pratos', PRATOS_PADRAO); }
function getConfig(){ return Store.get('rest_config', CONFIG); }

/* Supabase */
let supabaseClient = null;
try{
  if(window.supabase && CONFIG.supabase && CONFIG.supabase.url.includes('supabase.co')){
    supabaseClient = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);
    console.log('✅ Supabase ligado');
  }
}catch(err){ console.error('❌', err); }

const state = {
  prato: null,
  quantidade: 1,
  modo: 'entrega',
  velocidade: 'normal',
  endereco: '',
  referencia: '',
  nome: '',
  telefone: '',
  observacoes: '',
  zona: 0
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmtMT = v => `${Number(v||0)} MT`;

function arredondar(valor){
  const corrigido = Math.round(valor * 100) / 100;
  const inteiro = Math.floor(corrigido);
  const decimal = corrigido - inteiro;
  return decimal >= 0.5 ? inteiro + 1 : inteiro;
}

/* ---------- NAVBAR ---------- */
const hamburger = $('#hamburger');
const navLinks  = $('#navLinks');

function fecharMenu(){
  navLinks?.classList.remove('open');
  hamburger?.classList.remove('active');
  document.querySelector('.nav-overlay')?.classList.remove('active');
  document.body.style.overflow = '';
}
function abrirMenu(){
  navLinks?.classList.add('open');
  hamburger?.classList.add('active');
  document.querySelector('.nav-overlay')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

hamburger?.addEventListener('click', () => {
  if(navLinks.classList.contains('open')) fecharMenu();
  else abrirMenu();
});
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', fecharMenu));
document.querySelector('.nav-overlay')?.addEventListener('click', fecharMenu);

function renderMenu(){
  const grid = $('#menuGrid');
  if(!grid) return;
  const pratos = getPratos();

  grid.innerHTML = pratos.map(p => {
    // Se tem foto, mostra a foto. Se não, mostra o emoji.
    const imagemHTML = p.foto
      ? `<img src="${p.foto}" alt="${p.nome}" loading="lazy"
             onerror="this.parentElement.innerHTML='<span style=\\'font-size:64px\\'>${p.icon || '🍽️'}</span>'"/>`
      : `<span style="font-size:64px">${p.icon || '🍽️'}</span>`;

    return `
      <div class="menu-item ${p.disponivel ? '' : 'unavailable'}" data-id="${p.id}">
        <div class="mi-foto">
          ${imagemHTML}
          <span class="status-badge ${p.disponivel ? 'ok' : 'off'}">
            ● ${p.disponivel ? 'DISPONÍVEL' : 'ESGOTADO'}
          </span>
        </div>
        <div class="mi-body">
          <div class="mi-name">${p.nome}</div>
          <div class="mi-desc">${p.desc || ''}</div>
          <div class="mi-price">${p.preco} ${p.unidade}</div>
          <button class="btn btn-primary mi-btn" ${p.disponivel ? '' : 'disabled'}>
            ${p.disponivel ? 'ENCOMENDAR' : 'ESGOTADO'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.menu-item:not(.unavailable) .mi-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.closest('.menu-item').dataset.id;
      openOrder(id);
    });
  });
}

/* ---------- ABRIR PEDIDO ---------- */
function openOrder(id){
  const prato = getPratos().find(p => p.id === id);
  if(!prato || !prato.disponivel) return;

  state.prato = prato;
  state.quantidade = 1;

  const section = $('#pedido');
  section.hidden = false;
  section.scrollIntoView({behavior:'smooth', block:'start'});

  goToStep(1);
  renderStep1();
}

function goToStep(n){
  [1,2,3].forEach(i => { const el = $(`#step${i}`); if(el) el.hidden = i !== n; });
}

/* ---------- STEP 1 ---------- */
function renderStep1(){
  const p = state.prato;
  const cfg = getConfig();

  $('#opIcon').textContent = p.icon || '🍽️';
  $('#opNome').textContent = p.nome;
  $('#opPreco').textContent = `${p.preco} ${p.unidade}`;
  $('#qtyUnit').textContent = cfg.quantidade?.unidade || 'un';

  const inp = $('#qtyInput');
  inp.value = state.quantidade;
  inp.min = 1;

  const qtds = cfg.quantidade?.rapida || [1,2,3,5];
  $('#quickQty').innerHTML = qtds.map(q =>
    `<button data-q="${q}" class="${q===state.quantidade?'active':''}">${q}un</button>`
  ).join('');

  $('#quickQty').querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => setQty(Number(b.dataset.q)));
  });

  updateTotal();
}

function setQty(v){
  v = Number(v);
  if(isNaN(v) || v < 1) v = 1;
  if(v > 20) v = 20;
  state.quantidade = v;
  const inp = $('#qtyInput');
  if(inp) inp.value = v;
  $('#quickQty')?.querySelectorAll('button').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.q) === v);
  });
  updateTotal();
}

function updateTotal(){
  const p = state.prato;
  if(!p) return;
  const total = p.preco * state.quantidade;
  $('#orderTotal').textContent = fmtMT(total);
  $('#totalHint').textContent = `${p.preco} MT × ${state.quantidade} un`;
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.qty-btn');
  if(!btn) return;
  setQty(state.quantidade + Number(btn.dataset.qty));
});
document.addEventListener('input', e => {
  if(e.target.id === 'qtyInput') setQty(e.target.value);
});

$('#toStep2')?.addEventListener('click', () => { goToStep(2); renderStep2(); });
$('#orderClose')?.addEventListener('click', () => {
  $('#pedido').hidden = true;
  state.prato = null;
});

/* ---------- STEP 2 ---------- */
function renderStep2(){
  const cfg = getConfig();
  const sel = $('#zonaSelect');

  if(sel && cfg.entrega?.zonas?.length){
    sel.innerHTML = cfg.entrega.zonas.map((z,i) =>
      `<option value="${i}">${z.nome}</option>`
    ).join('');
  }

  $$('input[name="modo"]').forEach(r => {
    r.checked = r.value === state.modo;
    r.onchange = () => {
      state.modo = r.value;
      toggleDeliveryFields();
      updateDeliveryPreview();
      updateSpeedPrices();
    };
  });

  $$('input[name="velocidade"]').forEach(r => {
    r.checked = r.value === state.velocidade;
    r.onchange = () => { state.velocidade = r.value; updateDeliveryPreview(); };
  });

  toggleDeliveryFields();

  if($('#endereco')) $('#endereco').value = state.endereco;
  if($('#referencia')) $('#referencia').value = state.referencia;
  if($('#nome')) $('#nome').value = state.nome;
  if($('#telefone')) $('#telefone').value = state.telefone;
  if($('#observacoes')) $('#observacoes').value = state.observacoes;

  if(sel){
    state.zona = Number(sel.value || 0);
    sel.onchange = () => {
      state.zona = Number(sel.value);
      updateSpeedPrices();
      updateDeliveryPreview();
    };
  }

  updateSpeedPrices();
  updateDeliveryPreview();
}

function toggleDeliveryFields(){
  const wrap = $('#deliveryFields');
  if(wrap) wrap.style.display = state.modo === 'entrega' ? 'block' : 'none';
}

function updateSpeedPrices(){
  const cfg = getConfig();
  const zona = cfg.entrega?.zonas?.[state.zona];
  if(!zona) return;
  const normal = zona.valor;
  const mult = cfg.entrega?.premium?.multiplicador || 1.5;
  const premium = Math.round(normal * mult);
  if($('#precoNormal')) $('#precoNormal').textContent = `${normal} MT`;
  if($('#precoPremium')) $('#precoPremium').textContent = `${premium} MT`;
}

function calcularEntrega(){
  const cfg = getConfig();
  if(state.modo === 'retirada') return 0;
  if(state.quantidade * (state.prato?.preco || 0) >= (cfg.entrega?.gratisAcimaDe || 1000)) return 0;
  const zona = cfg.entrega?.zonas?.[state.zona];
  if(!zona) return 0;
  if(state.velocidade === 'premium'){
    const mult = cfg.entrega?.premium?.multiplicador || 1.5;
    return Math.round(zona.valor * mult);
  }
  return zona.valor;
}

function calcularTempo(){
  const cfg = getConfig();
  if(state.modo === 'retirada') return 'Retirada imediata';
  const zona = cfg.entrega?.zonas?.[state.zona];
  if(state.velocidade === 'premium') return cfg.entrega?.premium?.tempo || 'até 15 min';
  return zona?.tempo || '30-40 min';
}

function updateDeliveryPreview(){
  const preview = $('#deliveryPreview');
  if(!preview) return;
  const cfg = getConfig();

  if(state.modo === 'retirada'){
    preview.innerHTML = `🏪 Retirada no restaurante — <b>GRÁTIS</b>`;
    return;
  }

  const subtotal = state.quantidade * (state.prato?.preco || 0);
  if(subtotal >= (cfg.entrega?.gratisAcimaDe || 1000)){
    preview.innerHTML = `🛵 Entrega — <b style="color:#00C853">GRÁTIS 🎉</b> (pedido ≥ ${cfg.entrega.gratisAcimaDe} MT)`;
    return;
  }

  const valor = calcularEntrega();
  const tempo = calcularTempo();
  const tipo = state.velocidade === 'premium' ? '⚡ Expresso' : '🛵 Normal';
  preview.innerHTML = `${tipo} · ${tempo} — <b>${valor} MT</b>`;
}

$('#useLocation')?.addEventListener('click', () => {
  const hint = $('#locHint');
  if(!navigator.geolocation){
    hint.textContent = 'Escreva a localização manualmente.';
    return;
  }
  hint.textContent = 'A obter localização...';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      $('#endereco').value = `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`;
      hint.textContent = '✅ Localização obtida.';
      hint.classList.add('ok');
    },
    () => { hint.textContent = 'Não foi possível. Escreva manualmente.'; }
  );
});

$('#backStep1')?.addEventListener('click', () => goToStep(1));

$('#toStep3')?.addEventListener('click', () => {
  state.endereco = $('#endereco')?.value.trim() || '';
  state.referencia = $('#referencia')?.value.trim() || '';
  state.nome = $('#nome')?.value.trim() || '';
  state.telefone = $('#telefone')?.value.trim() || '';
  state.observacoes = $('#observacoes')?.value.trim() || '';

  if(!state.nome || !state.telefone){
    alert('Preencha o nome e o telefone.');
    return;
  }
  if(state.modo === 'entrega' && !state.endereco){
    alert('Informe o endereço.');
    return;
  }
  goToStep(3);
  renderSummary();
});

/* ---------- STEP 3 ---------- */
function renderSummary(){
  const p = state.prato;
  const subtotal = p.preco * state.quantidade;
  const entrega = calcularEntrega();
  const total = subtotal + entrega;
  const totalArr = arredondar(total);
  const tempo = calcularTempo();

  let modoLabel = '';
  let entregaLinha = '';

  if(state.modo === 'retirada'){
    modoLabel = '🏪 Retirada no restaurante';
    entregaLinha = `<div class="summary-row"><span>Taxa</span><b style="color:#00C853">GRÁTIS</b></div>`;
  } else {
    const zonaNome = getConfig().entrega?.zonas?.[state.zona]?.nome || '—';
    const tipo = state.velocidade === 'premium' ? '⚡ Expresso' : '🛵 Normal';
    modoLabel = `Entrega — ${zonaNome}`;
    entregaLinha = `
      <div class="summary-row"><span>Tipo</span><b>${tipo} (${tempo})</b></div>
      <div class="summary-row"><span>Taxa de entrega</span><b>${entrega === 0 ? 'GRÁTIS 🎉' : entrega + ' MT'}</b></div>
    `;
  }

  $('#summary').innerHTML = `
    <div class="summary-section">
      <h4>Prato</h4>
      <div class="summary-row"><span>Item</span><b>${p.nome}</b></div>
      <div class="summary-row"><span>Quantidade</span><b>${state.quantidade} un</b></div>
      <div class="summary-row"><span>Preço</span><b>${p.preco} MT</b></div>
      <div class="summary-row"><span>Subtotal</span><b>${subtotal} MT</b></div>
    </div>

    <div class="summary-section">
      <h4>${state.modo === 'entrega' ? 'Entrega' : 'Retirada'}</h4>
      <div class="summary-row"><span>Modo</span><b>${modoLabel}</b></div>
      ${state.modo === 'entrega' ? `
        <div class="summary-row"><span>Endereço</span><b>${state.endereco}</b></div>
        ${state.referencia ? `<div class="summary-row"><span>Referência</span><b>${state.referencia}</b></div>` : ''}
      ` : ''}
      ${entregaLinha}
    </div>

    <div class="summary-section">
      <h4>Cliente</h4>
      <div class="summary-row"><span>Nome</span><b>${state.nome}</b></div>
      <div class="summary-row"><span>Telefone</span><b>${state.telefone}</b></div>
      ${state.observacoes ? `<div class="summary-row"><span>Obs.</span><b>${state.observacoes}</b></div>` : ''}
    </div>

    <div class="summary-row total">
      <span>TOTAL</span>
      <b>${totalArr} MT</b>
    </div>
  `;
}

$('#backStep2')?.addEventListener('click', () => goToStep(2));

/* ---------- CONFIRMAR ---------- */
$('#confirmOrder')?.addEventListener('click', () => {
  const cfg = getConfig();
  const p = state.prato;
  const subtotal = p.preco * state.quantidade;
  const entrega = calcularEntrega();
  const total = subtotal + entrega;
  const totalArr = arredondar(total);
  const tempo = calcularTempo();

  const zonaNome = state.modo === 'entrega'
    ? (cfg.entrega?.zonas?.[state.zona]?.nome || '—')
    : 'Retirada';

  const pedido = {
    cliente: state.nome,
    telefone: state.telefone,
    produto: p.nome,
    quantidade: state.quantidade,
    unidade: 'un',
    preco_unit: p.preco,
    subtotal,
    modo: state.modo,
    velocidade: state.velocidade,
    zona: zonaNome,
    tempo,
    endereco: state.endereco,
    referencia: state.referencia,
    observacoes: state.observacoes,
    taxa: entrega,
    total: totalArr,
    status: 'PENDENTE'
  };

  if(supabaseClient){
    supabaseClient.from('pedidos_restaurante').insert([pedido]).then(({ error }) => {
      if(error) console.error('❌', error);
      else console.log('✅ Pedido enviado');
    });
  } else {
    const pedidos = Store.get('rest_pedidos', []);
    pedidos.unshift({ ...pedido, id: 'R' + Date.now(), data: new Date().toISOString() });
    Store.set('rest_pedidos', pedidos);
  }

  const linhas = [
    cfg.mensagemWhatsApp || 'Olá, gostaria de fazer um pedido!',
    '',
    `Cliente: ${state.nome}`,
    `Telefone: ${state.telefone}`,
    '',
    `Pedido: ${p.nome}`,
    `Quantidade: ${state.quantidade} un`,
    `Preço: ${p.preco} MT`,
    `Subtotal: ${subtotal} MT`,
    '',
    state.modo === 'entrega'
      ? `Entrega: ${state.velocidade === 'premium' ? 'Expresso' : 'Normal'} (${tempo})`
      : 'Retirada no restaurante',
    state.modo === 'entrega' ? `Zona: ${zonaNome}` : '',
    state.modo === 'entrega' ? `Localização: ${state.endereco}` : '',
    state.modo === 'entrega' && state.referencia ? `Referência: ${state.referencia}` : '',
    state.observacoes ? `Obs.: ${state.observacoes}` : '',
    entrega > 0 ? `Taxa: ${entrega} MT` : 'Taxa: GRÁTIS',
    '',
    `TOTAL: ${totalArr} MT`,
    '',
    'Pedido realizado através do site.'
  ].filter(Boolean).join('\n');

  window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(linhas)}`, '_blank');

  $('#pedido').hidden = true;
  state.prato = null;
  alert('✅ Pedido registado! Continue no WhatsApp.');
});

/* ---------- GALERIA ---------- */
const galeriaItems = [
  { cat:'restaurante', foto:'assets/images/galeria/sala.jpg',       label:'Sala principal' },
  { cat:'restaurante', foto:'assets/images/galeria/cozinha.jpg',    label:'Cozinha' },
  { cat:'pratos',      foto:'assets/images/pratos/frango-zambeziana.jpg', label:'Frango Zambeziana' },
  { cat:'pratos',      foto:'assets/images/pratos/camarao-grelhado.jpg',  label:'Camarão grelhado' },
  { cat:'pratos',      foto:'assets/images/pratos/peixe-corvina.jpg',     label:'Peixe fresco' },
  { cat:'atendimento', foto:'assets/images/galeria/atendimento.jpg', label:'Atendimento' },
  { cat:'atendimento', foto:'assets/images/galeria/ambiente.jpg',   label:'Ambiente noturno' },
  { cat:'restaurante', foto:'assets/images/galeria/sala.jpg',       label:'Espaço interior' }
];

function renderGaleria(){
  const g = $('#gallery');
  if(!g) return;

  g.innerHTML = galeriaItems.map((it, i) => `
    <div class="gal-item" data-cat="${it.cat}" data-i="${i}">
      <img src="${it.foto}" alt="${it.label}" loading="lazy"
           onerror="this.parentElement.innerHTML='<span class=\\'emoji\\'>🍽️</span><b>${it.label}</b>'"/>
      <div class="gal-overlay"><b>${it.label}</b></div>
    </div>
  `).join('');

  g.querySelectorAll('.gal-item').forEach(el => {
    el.addEventListener('click', () => openLightbox(el));
  });

  $$('.gf').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.gf').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      g.querySelectorAll('.gal-item').forEach(it => {
        it.classList.toggle('hidden', f !== 'todos' && it.dataset.cat !== f);
      });
    });
  });
}

function openLightbox(el){
  const lb = $('#lightbox');
  $('#lbImg').src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2A1810"/><stop offset="1" stop-color="#8B0000"/>
      </linearGradient></defs>
      <rect width="800" height="600" fill="url(#g)"/>
      <text x="400" y="300" text-anchor="middle" fill="#FFD200"
        font-family="sans-serif" font-size="42" font-weight="700">SABOR DE QUELIMANE</text>
      <text x="400" y="350" text-anchor="middle" fill="#fff"
        font-family="sans-serif" font-size="20">${el.querySelector('b').textContent}</text>
    </svg>
  `);
  lb.classList.add('active');
}

document.addEventListener('click', e => {
  if(e.target.closest('#lbClose')) $('#lightbox')?.classList.remove('active');
  if(e.target.id === 'lightbox') $('#lightbox')?.classList.remove('active');
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') $('#lightbox')?.classList.remove('active');
});

/* ---------- SCROLL REVEAL ---------- */
function setupReveal(){
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold:.15 });
  $$('.fade-up, .step-card').forEach(el => { el.classList.add('fade-up'); io.observe(el); });
}

/* ---------- CONFIG NA UI ---------- */
function aplicarConfigNaUI(){
  const cfg = getConfig();
  if($('#locEndereco')) $('#locEndereco').textContent = cfg.empresa?.endereco || '';
  if($('#locTelefone')) $('#locTelefone').textContent = cfg.telefone || cfg.whatsapp;
  if($('#locHorario'))  $('#locHorario').textContent  = cfg.empresa?.horario || '';

  const floatLink = $('#floatWhats');
  if(floatLink) floatLink.href = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(cfg.mensagemWhatsApp)}`;
  const locLink = $('#locWhatsApp');
  if(locLink) locLink.href = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de saber mais.')}`;

  if($('#year')) $('#year').textContent = new Date().getFullYear();
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  aplicarConfigNaUI();
  renderMenu();
  renderGaleria();
  setupReveal();
});