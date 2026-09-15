/* ============================================================
   SABOR DE QUELIMANE — ADMIN
   ============================================================ */

const SESSION_KEY = 'restaurante_admin_session';

if(localStorage.getItem(SESSION_KEY) !== 'ok'){
  window.location.replace('login.html');
}

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const Store = {
  get(key, fallback){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch{ return fallback; }
  },
  set(key, v){ localStorage.setItem(key, JSON.stringify(v)); }
};

function ensureData(){
  if(!localStorage.getItem('rest_config'))   Store.set('rest_config', CONFIG);
  if(!localStorage.getItem('rest_pratos'))   Store.set('rest_pratos', PRATOS_PADRAO);
  if(!localStorage.getItem('rest_pedidos'))  Store.set('rest_pedidos', []);
}
ensureData();

/* ---------- SUPABASE ---------- */
let supabaseClient = null;
try{
  if(window.supabase && CONFIG.supabase && CONFIG.supabase.url.includes('supabase.co')){
    supabaseClient = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);
    console.log('✅ Admin ligado ao Supabase');
  }
}catch(err){ console.error('❌', err); }

let filtroAtual = 'todos';

/* ---------- CARREGAR DO SUPABASE ---------- */
async function carregarPedidosDoServidor(){
  if(!supabaseClient) return;
  try{
    const { data, error } = await supabaseClient
      .from('pedidos_restaurante')
      .select('*')
      .order('created_at', { ascending: false });

    if(error) throw error;

    const pedidos = (data || []).map(p => ({
      id: 'R' + p.id,
      dbId: p.id,
      data: p.created_at,
      cliente: p.cliente,
      telefone: p.telefone,
      produto: p.produto,
      quantidade: p.quantidade,
      unidade: p.unidade || 'un',
      precoUnit: p.preco_unit,
      subtotal: p.subtotal,
      modo: p.modo,
      velocidade: p.velocidade,
      zona: p.zona,
      tempo: p.tempo,
      endereco: p.endereco,
      referencia: p.referencia,
      observacoes: p.observacoes,
      entrega: p.taxa,
      total: p.total,
      status: p.status
    }));

    Store.set('rest_pedidos', pedidos);
    return pedidos;
  }catch(err){
    console.error('❌ Erro ao carregar:', err);
    return Store.get('rest_pedidos', []);
  }
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const app = $('#adminApp');
  if(app) app.style.visibility = 'visible';

  const d = new Date();
  const dataFmt = d.toLocaleDateString('pt-PT', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });
  const horaFmt = d.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'});
  if($('#welcomeDate')) $('#welcomeDate').textContent = `${dataFmt} · ${horaFmt}`;

  await carregarPedidosDoServidor();
  renderTudo();

  setInterval(async () => {
    await carregarPedidosDoServidor();
    renderPendentes();
    renderTabela();
  }, 30000);
});

/* ---------- LOGOUT ---------- */
$('#logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.replace('login.html');
});

/* ---------- RENDER ---------- */
function renderTudo(){
  renderSwitches();
  renderPendentes();
  renderTabela();
}

/* ---------- SWITCHES ---------- */
function renderSwitches(){
  const lista = Store.get('rest_pratos', PRATOS_PADRAO);
  const el = $('#switchList');
  if(!el) return;

  el.innerHTML = lista.map(p => `
    <div class="switch-row">
      <div class="switch-info">
        <span class="sw-icon">${p.icon || '🍽️'}</span>
        <div>
          <b>${p.nome}</b>
          <small>${p.disponivel ? '🟢 Disponível' : '⚪ Esgotado'}</small>
        </div>
      </div>
      <label class="switch">
        <input type="checkbox" data-id="${p.id}" ${p.disponivel ? 'checked' : ''}/>
        <span class="slider"></span>
      </label>
    </div>
  `).join('');

  $$('[data-id]').forEach(chk => {
    chk.addEventListener('change', () => {
      const lista = Store.get('rest_pratos', PRATOS_PADRAO);
      const p = lista.find(x => x.id === chk.dataset.id);
      if(p){ p.disponivel = chk.checked; Store.set('rest_pratos', lista); }
      renderSwitches();
    });
  });
}

/* ---------- PENDENTES ---------- */
function renderPendentes(){
  const pedidos = Store.get('rest_pedidos', []);
  const pendentes = pedidos.filter(p =>
    p.status === 'PENDENTE' || p.status === 'PREPARACAO' || p.status === 'CAMINHO'
  );

  $('#pendentesCount').textContent = pendentes.length;

  const container = $('#pendentesList');
  if(!container) return;

  if(!pendentes.length){
    container.innerHTML = `<p class="empty">✅ Nenhum pedido pendente.</p>`;
    return;
  }

  container.innerHTML = pendentes.map(p => {
    const label = {
      PENDENTE:   { txt:'Pendente',       color:'#FFD200' },
      PREPARACAO: { txt:'Em preparação',  color:'#4D9FFF' },
      CAMINHO:    { txt:'A caminho',      color:'#FFA84D' }
    }[p.status] || { txt:'Pendente', color:'#FFD200' };

    return `
      <div class="receipt pending">
        <div class="receipt-head">
          <span class="receipt-id">${p.id.slice(-6)}</span>
          <span class="receipt-date">${new Date(p.data).toLocaleString('pt-PT')}</span>
        </div>
        <div class="receipt-body">
          <div class="receipt-row"><span>Cliente</span><b>${p.cliente}</b></div>
          <div class="receipt-row"><span>Telefone</span><b>${p.telefone}</b></div>
          <div class="receipt-row"><span>Pedido</span><b>${p.produto}</b></div>
          <div class="receipt-row"><span>Qtd</span><b>${p.quantidade} un</b></div>
          <div class="receipt-row"><span>Modo</span><b>${
            p.modo === 'entrega'
              ? `${p.velocidade === 'premium' ? '⚡ Expresso' : '🛵 Normal'} — ${p.zona || '—'}`
              : '🏪 Retirada'
          }</b></div>
          ${p.modo === 'entrega' ? `
            <div class="receipt-row"><span>Local</span><b>${p.endereco || '—'}</b></div>
            ${p.referencia ? `<div class="receipt-row"><span>Ref.</span><b>${p.referencia}</b></div>` : ''}
          ` : ''}
          ${p.observacoes ? `<div class="receipt-row"><span>Obs.</span><b>${p.observacoes}</b></div>` : ''}
          <div class="receipt-row"><span>Taxa</span><b>${p.entrega ? p.entrega + ' MT' : 'GRÁTIS'}</b></div>
          <div class="receipt-row total"><span>TOTAL</span><b>${p.total} MT</b></div>
        </div>
        <div class="receipt-foot">
          <span class="status-dot" style="background:${label.color}"></span>
          <span style="color:${label.color};font-weight:600">${label.txt}</span>

          <div class="action-buttons">
            <button class="btn-action btn-imprimir-mini" data-imprimir="${p.id}">🖨️ Recibo</button>
            <button class="btn-action btn-entregue" data-entregue="${p.id}">✅ Entregue</button>
            <button class="btn-action btn-cancelar" data-cancelar="${p.id}">❌ Cancelado</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  $$('[data-entregue]').forEach(b => {
    b.addEventListener('click', () => {
      if(!confirm('Confirmar que este pedido foi ENTREGUE?')) return;
      atualizarStatus(b.dataset.entregue, 'ENTREGUE');
    });
  });

  $$('[data-cancelar]').forEach(b => {
    b.addEventListener('click', () => {
      if(!confirm('Cancelar este pedido?')) return;
      atualizarStatus(b.dataset.cancelar, 'CANCELADO');
    });
  });

  $$('[data-imprimir]').forEach(b => {
    b.addEventListener('click', () => imprimirRecibo(b.dataset.imprimir));
  });
}

/* ---------- TABELA ---------- */
function renderTabela(){
  const pedidos = Store.get('rest_pedidos', []);
  let filtrados = pedidos;

  if(filtroAtual !== 'todos'){
    filtrados = pedidos.filter(p => p.status === filtroAtual);
  }

  $('#totalRegistos').textContent = `${filtrados.length} registos`;

  const body = $('#tabelaPedidosBody');
  if(!body) return;

  if(!filtrados.length){
    body.innerHTML = `<tr><td colspan="13" class="empty">Sem registos.</td></tr>`;
    $('#totalGeral').textContent = '0 MT';
    return;
  }

  body.innerHTML = filtrados.map((p, i) => {
    const isEntregue  = p.status === 'ENTREGUE';
    const isCancelado = p.status === 'CANCELADO';
    const isPendente  = !isEntregue && !isCancelado;

    const badgeClass = isEntregue ? 'badge-entregue'
                     : isCancelado ? 'badge-cancelado'
                     : 'badge-pendente';

    const modoTxt = p.modo === 'entrega'
      ? `${p.velocidade === 'premium' ? '⚡ Expresso' : '🛵 Normal'}`
      : '🏪 Retirada';

    const acoes = isPendente
      ? `
        <div class="acoes-linha">
          <button class="btn-mini btn-entregue-mini" data-entregue="${p.id}" title="Entregue">✅</button>
          <button class="btn-mini btn-cancelar-mini" data-cancelar="${p.id}" title="Cancelar">❌</button>
          <button class="btn-mini btn-imprimir-mini" data-imprimir="${p.id}" title="Recibo">🖨️</button>
        </div>
      `
      : `
        <div class="acoes-linha">
          <span class="txt-final">${isEntregue ? '✅ Finalizado' : '❌ Cancelado'}</span>
          <button class="btn-mini btn-imprimir-mini" data-imprimir="${p.id}" title="Recibo">🖨️</button>
        </div>
      `;

    return `
      <tr>
        <td>${i + 1}</td>
        <td><b>${p.id.slice(-6)}</b></td>
        <td>${new Date(p.data).toLocaleDateString('pt-PT')}</td>
        <td>${p.cliente}</td>
        <td>${p.telefone || '—'}</td>
        <td>${p.produto}</td>
        <td>${p.quantidade} un</td>
        <td>${modoTxt}</td>
        <td>${p.zona || '—'}</td>
        <td>${p.entrega ? p.entrega + ' MT' : '—'}</td>
        <td><b>${p.total} MT</b></td>
        <td><span class="badge ${badgeClass}">${p.status}</span></td>
        <td>${acoes}</td>
      </tr>
    `;
  }).join('');

  const total = filtrados.reduce((s, p) => s + (p.total || 0), 0);
  $('#totalGeral').textContent = `${total} MT`;

  body.querySelectorAll('[data-entregue]').forEach(b => {
    b.addEventListener('click', () => {
      if(!confirm('Marcar como ENTREGUE?')) return;
      atualizarStatus(b.dataset.entregue, 'ENTREGUE');
    });
  });

  body.querySelectorAll('[data-cancelar]').forEach(b => {
    b.addEventListener('click', () => {
      if(!confirm('Cancelar e apagar este pedido?')) return;
      atualizarStatus(b.dataset.cancelar, 'CANCELADO');
    });
  });

  body.querySelectorAll('[data-imprimir]').forEach(b => {
    b.addEventListener('click', () => imprimirRecibo(b.dataset.imprimir));
  });
}

/* ---------- FILTROS ---------- */
$$('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroAtual = btn.dataset.filtro;
    renderTabela();
  });
});

/* ---------- ATUALIZAR STATUS ---------- */
async function atualizarStatus(id, novoStatus){
  const pedidos = Store.get('rest_pedidos', []);
  const p = pedidos.find(x => x.id === id);
  if(!p) return;

  if(supabaseClient && p.dbId){
    try{
      if(novoStatus === 'CANCELADO'){
        await supabaseClient.from('pedidos_restaurante').delete().eq('id', p.dbId);
        const restantes = pedidos.filter(x => x.id !== id);
        Store.set('rest_pedidos', restantes);
      } else {
        await supabaseClient.from('pedidos_restaurante').update({ status: novoStatus }).eq('id', p.dbId);
        p.status = novoStatus;
        Store.set('rest_pedidos', pedidos);
      }
    }catch(err){
      console.error('❌', err);
      alert('Erro ao comunicar com o servidor.');
      return;
    }
  } else {
    if(novoStatus === 'CANCELADO'){
      const restantes = pedidos.filter(x => x.id !== id);
      Store.set('rest_pedidos', restantes);
    } else {
      p.status = novoStatus;
      Store.set('rest_pedidos', pedidos);
    }
  }

  renderPendentes();
  renderTabela();
}

/* ---------- RECARREGAR ---------- */
$('#resetBtn')?.addEventListener('click', () => {
  if(!confirm('Recarregar menu do config.js?')) return;
  localStorage.removeItem('rest_config');
  localStorage.removeItem('rest_pratos');
  Store.set('rest_config', CONFIG);
  Store.set('rest_pratos', PRATOS_PADRAO);
  location.reload();
});

/* ---------- IMPRIMIR RECIBO ---------- */
function imprimirRecibo(id){
  const pedidos = Store.get('rest_pedidos', []);
  const p = pedidos.find(x => x.id === id);
  if(!p){ alert('Pedido não encontrado.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  desenharReciboGrande(doc, p);
  doc.save(`Recibo_${p.id.slice(-6)}.pdf`);
}

/* ---------- IMPRIMIR EXTRATO ---------- */
$('#imprimirExtrato')?.addEventListener('click', () => {
  const pedidos = Store.get('rest_pedidos', []);
  let filtrados = pedidos;
  if(filtroAtual !== 'todos') filtrados = pedidos.filter(p => p.status === filtroAtual);

  if(!filtrados.length){ alert('Não há pedidos para imprimir.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  const pageW = 297;
  const margin = 10;

  doc.setFillColor(42, 24, 16);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFillColor(232, 119, 34);
  doc.triangle(0, 22, 35, 22, 0, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SABOR DE QUELIMANE', margin, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Quelimane · Moçambique', margin, 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('EXTRATO DE PEDIDOS', pageW - margin, 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const filtroTxt = filtroAtual === 'todos' ? 'Todos os pedidos' : `Filtro: ${filtroAtual}`;
  doc.text(filtroTxt, pageW - margin, 16, { align: 'right' });

  doc.setTextColor(80, 80, 80);
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-PT')}`, margin, 30);
  doc.text(`Total: ${filtrados.length}`, pageW - margin, 30, { align: 'right' });

  const linhas = filtrados.map((p, i) => [
    i + 1,
    p.id.slice(-6),
    new Date(p.data).toLocaleDateString('pt-PT'),
    p.cliente,
    p.telefone || '—',
    p.produto,
    `${p.quantidade} un`,
    p.modo === 'entrega'
      ? (p.velocidade === 'premium' ? 'Expresso' : 'Normal')
      : 'Retirada',
    p.zona || '—',
    p.entrega ? `${p.entrega} MT` : '—',
    `${p.total} MT`,
    p.status
  ]);

  const total = filtrados.reduce((s, p) => s + (p.total || 0), 0);

  doc.autoTable({
    startY: 36,
    head: [['#','ID','Data','Cliente','Telefone','Pedido','Qtd','Modo','Zona','Taxa','Total','Estado']],
    body: linhas,
    foot: [['','','','','','','','','','TOTAL:',`${total} MT`,'']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor:[220,220,220], lineWidth: 0.1 },
    headStyles: { fillColor:[42,24,16], textColor:[255,255,255], fontStyle:'bold', halign:'center', fontSize: 8 },
    footStyles: { fillColor:[255,210,0], textColor:[42,24,16], fontStyle:'bold', fontSize: 9 },
    alternateRowStyles: { fillColor:[255,250,240] },
    margin: { left: margin, right: margin }
  });

  const dataFile = new Date().toISOString().slice(0, 10);
  doc.save(`Extrato_${dataFile}.pdf`);
});

/* ---------- IMPRIMIR MINI ---------- */
$('#imprimirMini')?.addEventListener('click', () => {
  const pedidos = Store.get('rest_pedidos', []);
  let filtrados = pedidos;
  if(filtroAtual !== 'todos') filtrados = pedidos.filter(p => p.status === filtroAtual);
  if(!filtrados.length){ alert('Não há pedidos.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const cols = 6, rows = 5;
  const porPagina = cols * rows;
  const marginX = 5, marginY = 5, gapX = 1.5, gapY = 1.5;
  const pageW = 210, pageH = 297;
  const cardW = (pageW - marginX * 2 - gapX * (cols - 1)) / cols;
  const cardH = (pageH - marginY * 2 - gapY * (rows - 1)) / rows;

  filtrados.forEach((p, i) => {
    const pos = i % porPagina;
    const col = pos % cols;
    const row = Math.floor(pos / cols);
    const x = marginX + col * (cardW + gapX);
    const y = marginY + row * (cardH + gapY);
    if(i > 0 && pos === 0) doc.addPage();
    desenharReciboMini(doc, p, x, y, cardW, cardH);
  });

  doc.save(`Recibos_${filtrados.length}.pdf`);
});

/* ---------- RECIBO MINI ---------- */
function desenharReciboMini(doc, p, x, y, w, h){
  const marrom = [42, 24, 16];
  const laranja = [232, 119, 34];
  const cinzaClaro = [230, 230, 230];
  const cinza = [120, 120, 120];

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.setLineDash([1, 1], 0);
  doc.roundedRect(x, y, w, h, 1, 1, 'S');
  doc.setLineDash([], 0);

  doc.setFillColor(...marrom);
  doc.rect(x, y, w, 7, 'F');
  doc.setFillColor(...laranja);
  doc.rect(x, y, 2, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('SABOR DE QUELIMANE', x + 3, y + 4.5);

  doc.setFontSize(5);
  doc.setTextColor(255, 210, 0);
  doc.text(`#${p.id.slice(-6)}`, x + w - 1.5, y + 4.5, { align: 'right' });

  let cy = y + 8;
  doc.setDrawColor(...cinzaClaro);
  doc.setLineWidth(0.15);
  doc.line(x + 2, cy, x + w - 2, cy);
  cy += 3;

  doc.setTextColor(...cinza);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.text('CLIENTE', x + 2, cy);
  cy += 2.5;

  doc.setTextColor(20, 20, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text((p.cliente || '—').substring(0, 22), x + 2, cy);
  cy += 2.8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(60, 60, 60);
  doc.text(p.telefone || '—', x + 2, cy);
  cy += 3.5;

  doc.setDrawColor(...cinzaClaro);
  doc.line(x + 2, cy, x + w - 2, cy);
  cy += 3;

  doc.setTextColor(...cinza);
  doc.setFontSize(4.5);
  doc.text('PEDIDO', x + 2, cy);
  cy += 2.5;

  doc.setTextColor(20, 20, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text((p.produto || '—').substring(0, 24), x + 2, cy);
  cy += 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(60, 60, 60);
  doc.text(`${p.quantidade} un × ${p.precoUnit || '—'} MT`, x + 2, cy);
  cy += 3.5;

  doc.setDrawColor(...cinzaClaro);
  doc.line(x + 2, cy, x + w - 2, cy);
  cy += 3;

  doc.setTextColor(...cinza);
  doc.setFontSize(4.5);
  doc.text('ENTREGA', x + 2, cy);
  cy += 2.5;

  doc.setTextColor(20, 20, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  const modoTxt = p.modo === 'entrega'
    ? `${p.velocidade === 'premium' ? 'EXPRESSO' : 'Normal'} — ${p.zona || ''}`
    : 'Retirada';
  doc.text(modoTxt.substring(0, 28), x + 2, cy);
  cy += 2.8;

  doc.setTextColor(60, 60, 60);
  doc.text(`Taxa: ${p.entrega ? p.entrega + ' MT' : 'GRÁTIS'}`, x + 2, cy);
  cy += 4;

  const totalY = y + h - 8;
  doc.setFillColor(...marrom);
  doc.rect(x, totalY, w, 8, 'F');
  doc.setFillColor(...laranja);
  doc.rect(x, totalY, 2, 8, 'F');

  doc.setTextColor(255, 210, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('TOTAL', x + 3, totalY + 3);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`${p.total} MT`, x + w - 2, totalY + 5.5, { align: 'right' });

  const statusCores = {
    PENDENTE:[255,210,0], PREPARACAO:[77,159,255], CAMINHO:[255,168,77],
    ENTREGUE:[0,200,83], CANCELADO:[227,6,19]
  };
  const cor = statusCores[p.status] || [150,150,150];
  doc.setFillColor(...cor);
  doc.circle(x + 3, y + h - 1.5, 0.7, 'F');
  doc.setTextColor(...cor);
  doc.setFontSize(4);
  doc.text(p.status, x + 5, y + h - 0.7);
}

/* ---------- RECIBO GRANDE ---------- */
function desenharReciboGrande(doc, p){
  const x = 8, w = 148 - 16;
  const marrom = [42, 24, 16];
  const laranja = [232, 119, 34];

  doc.setFillColor(...marrom);
  doc.rect(0, 0, 148, 26, 'F');
  doc.setFillColor(...laranja);
  doc.triangle(0, 26, 30, 26, 0, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SABOR DE QUELIMANE', x, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Quelimane · Moçambique', x, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PEDIDO', 148 - x, 11, { align: 'right' });
  doc.setFontSize(14);
  doc.setTextColor(255, 210, 0);
  doc.text(`#${p.id.slice(-6)}`, 148 - x, 18, { align: 'right' });

  let y = 34;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido: ${new Date(p.data).toLocaleString('pt-PT')}`, x, y);
  doc.text(`Estado: ${p.status}`, 148 - x, y, { align: 'right' });
  y += 8;

  function caixa(titulo, linhas){
    const altura = 7 + linhas.length * 6 + 4;
    doc.setFillColor(255, 250, 240);
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, altura, 1.5, 1.5, 'FD');
    doc.setFillColor(...laranja);
    doc.rect(x, y, 1.5, altura, 'F');

    doc.setTextColor(...marrom);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(titulo.toUpperCase(), x + 4, y + 5);

    let ly = y + 11;
    doc.setFontSize(9);
    linhas.forEach(([chave, valor]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(chave, x + 4, ly);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 30);
      doc.text(String(valor).substring(0, 40), x + w - 4, ly, { align: 'right' });
      ly += 6;
    });
    y += altura + 3;
  }

  caixa('Cliente', [
    ['Nome', p.cliente || '—'],
    ['Telefone', p.telefone || '—'],
  ]);

  caixa('Pedido', [
    ['Prato', p.produto],
    ['Quantidade', `${p.quantidade} un`],
    ['Preço', `${p.precoUnit} MT`],
    ['Subtotal', `${p.subtotal} MT`],
  ]);

  const modoTxt = p.modo === 'entrega'
    ? `${p.velocidade === 'premium' ? 'Expresso' : 'Normal'} — ${p.zona || '—'}`
    : 'Retirada no restaurante';
  const linhasEnt = [
    ['Modo', modoTxt],
    ['Tempo', p.tempo || '—'],
  ];
  if(p.modo === 'entrega'){
    linhasEnt.push(['Endereço', p.endereco || '—']);
    if(p.referencia) linhasEnt.push(['Referência', p.referencia]);
  }
  if(p.observacoes) linhasEnt.push(['Obs.', p.observacoes]);
  linhasEnt.push(['Taxa', p.entrega ? `${p.entrega} MT` : 'GRÁTIS']);
  caixa('Entrega', linhasEnt);

  y += 2;
  const totalH = 16;
  doc.setFillColor(...marrom);
  doc.roundedRect(x, y, w, totalH, 2, 2, 'F');
  doc.setFillColor(...laranja);
  doc.rect(x, y, 2, totalH, 'F');

  doc.setTextColor(255, 210, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', x + 5, y + 6);

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(`${p.total} MT`, x + w - 5, y + 11, { align: 'right' });

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Sabor de Quelimane · Documento gerado automaticamente', 74, 200, { align: 'center' });
}

/* ---------- FECHAR O DIA ---------- */
document.addEventListener('click', async e => {
  if(e.target.closest('#fecharDia')){
    const pedidos = Store.get('rest_pedidos', []);
    const entregues = pedidos.filter(p => p.status === 'ENTREGUE');
    const pendentes = pedidos.filter(p =>
      p.status === 'PENDENTE' || p.status === 'PREPARACAO' || p.status === 'CAMINHO'
    ).length;

    if(!entregues.length){ alert('Não há pedidos entregues para fechar.'); return; }

    const msg = `📅 FECHAR O DIA\n\n• ${entregues.length} pedidos ENTREGUES serão apagados\n• ${pendentes} pedidos PENDENTES ficam\n\nContinuar?`;
    if(!confirm(msg)) return;

    if(supabaseClient){
      for(const p of entregues){
        if(p.dbId) await supabaseClient.from('pedidos_restaurante').delete().eq('id', p.dbId);
      }
    }
    const restantes = pedidos.filter(p => p.status !== 'ENTREGUE');
    Store.set('rest_pedidos', restantes);
    renderPendentes();
    renderTabela();
    alert(`✅ Dia fechado! ${entregues.length} pedidos apagados.`);
  }
});

/* ---------- APAGAR TUDO ---------- */
document.addEventListener('click', async e => {
  if(e.target.closest('#apagarTudo')){
    const pedidos = Store.get('rest_pedidos', []);
    if(!pedidos.length){ alert('O extrato já está vazio.'); return; }
    if(!confirm(`🗑️ APAGAR TUDO?\n\n${pedidos.length} pedidos serão apagados.`)) return;
    if(!confirm('⚠️ TEM A CERTEZA?')) return;

    if(supabaseClient){
      await supabaseClient.from('pedidos_restaurante').delete().neq('id', 0);
    }
    Store.set('rest_pedidos', []);
    renderPendentes();
    renderTabela();
    alert('✅ Extrato limpo.');
  }
});