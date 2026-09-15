/* ============================================================
   SABOR DE QUELIMANE — LOGIN
   ============================================================ */

const $ = s => document.querySelector(s);

const Store = {
  get(key, fallback){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch{ return fallback; }
  }
};

const SESSION_KEY = 'restaurante_admin_session';

/* Se já tem sessão ativa, vai direto para o painel */
if(localStorage.getItem(SESSION_KEY) === 'ok'){
  window.location.href = 'restauranteadm.html';
}

/* Garantir config base */
if(!localStorage.getItem('rest_config')){
  localStorage.setItem('rest_config', JSON.stringify(CONFIG));
}

document.addEventListener('DOMContentLoaded', () => {
  const form = $('#loginForm');
  if(!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const user = $('#loginUser').value.trim();
    const pass = $('#loginPass').value;
    const cfg = Store.get('rest_config', CONFIG);

    const adminUser = cfg.admin?.user || 'restaurante';
    const adminPass = cfg.admin?.pass || 'sabor2025';

    if(user === adminUser && pass === adminPass){
      sessionStorage.setItem(SESSION_KEY, 'ok');
      window.location.href = 'restauranteadm.html';
    } else {
      $('#loginError').textContent = '❌ Credenciais inválidas. Tenta novamente.';
      $('#loginPass').value = '';
      $('#loginPass').focus();
    }
  });
});