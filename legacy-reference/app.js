// ==========================================================================
// Cascada de Cobranza · Grupo Segal
// Frontend JS: auth, carga de datos, render de vista y registro de gestiones
// ==========================================================================

const SUPABASE_URL = 'https://cqgdtqcwgtbqjxpibzzy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eb5J0xNHlCU4kPAau5Nvmw_q4sDoCjD';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// === Estado global ===
const state = {
  user: null,             // auth user
  perfil: null,           // {id,nombre,rol,meta_diaria,es_pool}
  cobradoras: [],         // lista de cobradoras para sidebar (solo jefa)
  filtroAmbito: 'mia',    // 'mia' | 'todos' | cobradora_id
  filtroRegla: 'CRITICO',  // Urgentes por defecto al cargar
  sortMora: null,         // null | 'asc' | 'desc'
  data: [],               // clientes cargados
  resumenDia: null,       // resumen para el contexto actual
  resumenTodas: [],       // resumen completo de las 7 cobradoras (siempre)
  lastCarga: null,
  search: '',
  page: 0,
  pageSize: 50,
};

// === Utilidades ===
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmtNum   = new Intl.NumberFormat('es-CL');
const fmtMoney = n => '$' + fmtNum.format(Math.round(n || 0));
const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const fmtDate = d => {
  if (!d) return '—';
  // Las fechas vienen como strings ISO ('2026-04-20') o como Date UTC
  // Siempre leer en UTC para no shiftear por zona horaria del navegador (Chile = UTC-3/4)
  let dt;
  if (typeof d === 'string') {
    // '2026-04-20' o '2026-04-20T00:00:00+00:00'
    // Forzar interpretación UTC añadiendo T00:00:00Z si es solo fecha
    const s = d.length === 10 ? d + 'T00:00:00Z' : d;
    dt = new Date(s);
  } else {
    dt = d;
  }
  if (isNaN(dt.getTime())) return '—';
  const dia = String(dt.getUTCDate()).padStart(2, '0');
  const mes = MESES_CORTOS[dt.getUTCMonth()];
  return `${dia}-${mes}`;
};

function toast(msg, type) {
  const t = $('#toast');
  t.className = 'toast ' + (type || '') + ' active';
  t.textContent = msg;
  setTimeout(() => t.classList.remove('active'), 3500);
}

function showLoading(msg) {
  $('#loading-msg').textContent = msg || 'Procesando…';
  $('#loading-overlay').classList.add('active');
}
function hideLoading() { $('#loading-overlay').classList.remove('active'); }

// ==========================================================================
// AUTH
// ==========================================================================
async function login(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

async function logout() {
  await sb.auth.signOut();
  location.reload();
}

async function checkSession() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    state.user = data.session.user;
    return true;
  }
  return false;
}

async function loadPerfil() {
  const { data, error } = await sb.rpc('cascada_mi_perfil');
  if (error) throw error;
  if (!data) throw new Error('Usuario sin perfil en cascada.cobradoras');
  state.perfil = data;
  return data;
}

// ==========================================================================
// DATA LOADING
// ==========================================================================
async function loadCobradoras() {
  const { data, error } = await sb
    .from('cascada_cobradoras')
    .select('*')
    .eq('estado', 'activa')
    .order('meta_diaria');
  if (error) throw error;
  state.cobradoras = data || [];
}

async function loadClientes() {
  let q = sb.from('cascada_clientes').select('*');

  // Si es cobradora, RLS ya filtra a los suyos.
  // Si es jefa y eligió una cobradora específica, filtrar.
  if (state.perfil.rol === 'jefatura' && state.filtroAmbito !== 'todos') {
    q = q.eq('cobradora_id', state.filtroAmbito);
  }

  const { data, error } = await q.limit(10000);
  if (error) throw error;

  // Ordenar: zona crítica primero, luego por regla, luego por días mora
  const orden = { SAYORANA:1, R7:2, R2:3, R1:4, R5:5, R3:6, R4:7, R6:8, PRE_DESISTIDO:9 };
  data.sort((a,b) => {
    const ca = a.zona_critica ? 0 : 1;
    const cb = b.zona_critica ? 0 : 1;
    if (ca !== cb) return ca - cb;
    const ra = orden[a.regla] || 99;
    const rb = orden[b.regla] || 99;
    if (ra !== rb) return ra - rb;
    return (b.dias_mora || 0) - (a.dias_mora || 0);
  });

  state.data = data || [];
}

async function loadResumenDia() {
  // SIEMPRE cargar el resumen completo de todas las cobradoras activas.
  // La agregación/filtrado se hace en el cliente según el ámbito actual.
  const { data, error } = await sb.from('cascada_resumen_dia').select('*');
  if (error) throw error;
  const todas = data || [];

  // Guardar siempre los datos completos
  state.resumenTodas = todas;

  if (state.perfil.rol === 'jefatura') {
    if (state.filtroAmbito === 'todos') {
      // Vista equipo completo
      state.resumenDia = {
        gestiones_hoy: todas.reduce((s, r) => s + (+r.gestiones_hoy || 0), 0),
        gestiones_mes: todas.reduce((s, r) => s + (+r.gestiones_mes || 0), 0),
        meta: todas.reduce((s, r) => s + (+r.meta_diaria || 0), 0),
        meta_mes_acumulada: todas.reduce((s, r) => s + (+r.meta_mes_acumulada || 0), 0),
        meta_mes_total: todas.reduce((s, r) => s + (+r.meta_mes_total || 0), 0),
        cartera: todas.reduce((s, r) => s + (+r.cartera_total || 0), 0),
        monto_cartera: todas.reduce((s, r) => s + (+r.monto_cartera || 0), 0),
        porCobradora: todas
      };
    } else {
      // Jefa filtrada a una cobradora
      const r = todas.find(x => x.cobradora_id === state.filtroAmbito);
      state.resumenDia = r ? {
        gestiones_hoy: +r.gestiones_hoy,
        gestiones_mes: +r.gestiones_mes,
        meta: +r.meta_diaria,
        meta_mes_acumulada: +r.meta_mes_acumulada,
        meta_mes_total: +r.meta_mes_total,
        cartera: +r.cartera_total,
        monto_cartera: +r.monto_cartera,
        nombre: r.cobradora_nombre,
        porCobradora: todas  // mantenerlo siempre para sidebar
      } : { gestiones_hoy: 0, meta: 0, cartera: 0, porCobradora: todas };
    }
  } else {
    // Cobradora: sus datos
    const r = todas.find(x => x.cobradora_id === state.perfil.id);
    state.resumenDia = r ? {
      gestiones_hoy: +r.gestiones_hoy,
      gestiones_mes: +r.gestiones_mes,
      meta: +r.meta_diaria,
      meta_mes_acumulada: +r.meta_mes_acumulada,
      meta_mes_total: +r.meta_mes_total,
      cartera: +r.cartera_total,
      monto_cartera: +r.monto_cartera,
      nombre: r.cobradora_nombre
    } : { gestiones_hoy: 0, meta: state.perfil.meta_diaria, cartera: 0 };
  }
}

async function loadLastCarga() {
  const { data } = await sb.from('cascada_cargas_hist').select('*').limit(1);
  state.lastCarga = (data && data[0]) || null;
}

async function loadData() {
  try {
    showLoading('Cargando cartera…');
    await Promise.all([
      loadClientes(),
      loadResumenDia(),
      loadLastCarga(),
      loadKpiGestionados(),
    ]);
    render();
  } catch (e) {
    console.error(e);
    toast('Error: ' + (e.message || 'No se pudo cargar'), 'error');
  } finally {
    hideLoading();
  }
}

async function loadKpiGestionados() {
  try {
    const { data, error } = await sb.rpc('cascada_kpi_gestionados');
    if (error) throw error;
    state.kpiGestionados = data || {};
  } catch (e) {
    state.kpiGestionados = {};
    console.warn('[KPI] Error cargando gestionados:', e.message);
  }
}

// ==========================================================================
// RENDER
// ==========================================================================
function render() {
  const p = state.perfil;
  document.body.className = p.rol === 'jefatura' ? 'modo-jefatura' : 'modo-cobradora';
  $('#user-name').textContent = p.nombre;
  $('#user-badge').textContent = p.rol;
  $('#user-badge').className = 'user-badge ' + p.rol;

  renderHeader();
  renderSidebar();
  renderKPIs();
  renderFilters();
  renderTable();
  renderLastCarga();
}

function renderHeader() {
  const p = state.perfil;
  if (p.rol === 'cobradora') {
    $('#page-title').textContent = 'Hola, ' + p.nombre.split(' ')[0];
    $('#page-subtitle').textContent = 'Tu cartera priorizada por la cascada. Empieza por las urgencias.';
  } else {
    const nCob = state.cobradoras.length;
    const label = state.filtroAmbito === 'todos' 
      ? 'Equipo completo' 
      : (state.cobradoras.find(c => c.id === state.filtroAmbito)?.nombre || '—');
    $('#page-title').textContent = 'Sala de operaciones · ' + label;
    $('#page-subtitle').textContent = `${state.data.length.toLocaleString('es-CL')} casos en vista · ${nCob} cobradoras activas`;
  }
}

function renderSidebar() {
  if (state.perfil.rol !== 'jefatura') return;

  // Conteos por cobradora: vienen SIEMPRE del resumen completo
  const porCob = {};
  (state.resumenTodas || []).forEach(r => { porCob[r.cobradora_id] = +r.cartera_total || 0; });
  const totalCartera = Object.values(porCob).reduce((s, v) => s + v, 0);
  $('#cartera-total').textContent = fmtNum.format(totalCartera);

  // Conteos de atención prioritaria por REGLA (no por zona_critica)
  const d = state.data;
  const zonas = {
    venceHoy:   d.filter(x => x.zona_critica === 'CRIT_VENCE_HOY').length,
    r5:         d.filter(x => x.regla === 'R5').length,
    preBloqueo: d.filter(x => x.regla === 'R2' && x.dias_mora >= 30).length,
    moraActiva: d.filter(x => x.regla === 'R2' && x.dias_mora < 30).length,
    r1:         d.filter(x => x.regla === 'R1').length,
  };
  const totalCrit = zonas.venceHoy + zonas.r5 + zonas.preBloqueo + zonas.moraActiva + zonas.r1;

  // --- Sección: Carteras ---
  let cartHtml = `<div class="cob-item ${state.filtroAmbito === 'todos' ? 'active' : ''}" onclick="setAmbito('todos')">
    <span>Equipo completo</span>
    <span class="cob-count">${fmtNum.format(totalCartera)}</span>
  </div>`;
  state.cobradoras.forEach(c => {
    const act = state.filtroAmbito === c.id ? 'active' : '';
    cartHtml += `<div class="cob-item ${act}" onclick="setAmbito('${c.id}')">
      <span>${escHtml(c.nombre)}</span>
      <span class="cob-count">${fmtNum.format(porCob[c.id] || 0)}</span>
    </div>`;
  });
  $('#cob-list').innerHTML = cartHtml;

  const critTotal = $('#crit-total');
  if (critTotal) critTotal.textContent = fmtNum.format(totalCrit);
  const critList = $('#crit-list');
  if (critList) {
    const items = [
      { k: 'CRIT_VENCE_HOY', label: 'Vence hoy',        n: zonas.venceHoy,   color: 'var(--ocean)',    filtro: 'CRIT_VENCE_HOY',  tipo: 'zona' },
      { k: 'R5',             label: 'R5 · Al límite',    n: zonas.r5,         color: 'var(--rust)',     filtro: 'R5',              tipo: 'regla' },
      { k: 'R2_BLOQUEO',    label: 'Pre-bloqueo 30+d',  n: zonas.preBloqueo, color: 'var(--amber-hot)',filtro: 'R2_BLOQUEO',      tipo: 'regla' },
      { k: 'R2_MORA',       label: 'Mora activa 15-29d', n: zonas.moraActiva, color: 'var(--amber)',    filtro: 'R2_MORA',         tipo: 'regla' },
      { k: 'R1',             label: 'R1 · Primer contacto', n: zonas.r1,     color: 'var(--ink-mute)', filtro: 'R1',              tipo: 'regla' },
    ];
    critList.innerHTML = items.map(it => `
      <div class="crit-item ${state.filtroZona === it.k || state.filtroRegla === it.k ? 'active' : ''}" onclick="setFiltroPrioritario('${it.k}','${it.tipo}')">
        <span class="crit-dot" style="background:${it.color}"></span>
        <span>${it.label}</span>
        <span class="cob-count">${fmtNum.format(it.n)}</span>
      </div>
    `).join('');
  }
}

function setFiltroZona(k) {
  state.filtroZona = state.filtroZona === k ? null : k;
  state.filtroRegla = null;
  state.page = 0;
  renderTable();
  renderSidebar();
  renderFilters();
}

function toggleSortMora() {
  state.sortMora = state.sortMora === null ? 'desc'
                 : state.sortMora === 'desc' ? 'asc'
                 : null;
  state.page = 0;
  renderTable();
  const th = $('#th-mora');
  if (th) {
    const icon = state.sortMora === 'desc' ? ' ↓' : state.sortMora === 'asc' ? ' ↑' : ' ↕';
    th.textContent = 'Mora' + icon;
    th.style.color = state.sortMora ? 'var(--amber)' : '';
  }
}

function setFiltroPrioritario(k, tipo) {
  if (tipo === 'zona') {
    state.filtroZona = state.filtroZona === k ? null : k;
    state.filtroRegla = null;
  } else {
    state.filtroRegla = state.filtroRegla === k ? null : k;
    state.filtroZona = null;
  }
  state.sortMora = null; // reset sort al cambiar filtro
  state.page = 0;
  renderTable();
  renderSidebar();
  renderFilters();
}

function setAmbito(v) {
  state.filtroAmbito = v;
  state.filtroRegla = null;
  state.filtroZona  = null;
  state.sortMora    = null;  // reset sort al cambiar cobradora
  state.page = 0;
  loadData();
}

function renderKPIs() {
  const p = state.perfil;
  const data = state.data;
  const criticos = data.filter(d => d.zona_critica && d.regla !== 'PAGADO').length;
  const r5 = data.filter(d => d.regla === 'R5').length;
  const urgentes = criticos + r5;
  const res = state.resumenDia || { gestiones_hoy: 0, meta: p.meta_diaria || 0, gestiones_mes: 0, meta_mes_total: 0 };
  const pctDia = res.meta ? Math.min(100, Math.round(res.gestiones_hoy / res.meta * 100)) : 0;
  const pctMes = res.meta_mes_total ? Math.min(100, Math.round(res.gestiones_mes / res.meta_mes_total * 100)) : 0;
  const mesNombre = new Date().toLocaleDateString('es-CL', { month: 'long' });

  let html = '';

  if (p.rol === 'cobradora') {
    html = `
      <div class="kpi kpi-critico">
        <div class="kpi-label">Urgentes hoy</div>
        <div class="kpi-value">${fmtNum.format(urgentes)}</div>
        <div class="kpi-delta">${criticos} zonas críticas · ${r5} R5 al límite</div>
      </div>
      <div class="kpi kpi-meta">
        <div class="kpi-label">Mi meta del día</div>
        <div class="kpi-value">${res.gestiones_hoy} <span style="color:var(--ink-mute);font-size:22px">/ ${res.meta}</span></div>
        <div class="kpi-delta">${res.gestiones_hoy >= res.meta ? '✓ Meta alcanzada' : `${Math.max(0, res.meta - res.gestiones_hoy)} gestiones restantes`}</div>
        <div class="progress"><div class="bar" style="width: ${pctDia}%"></div></div>
      </div>
      <div class="kpi kpi-mes">
        <div class="kpi-label">Mi meta del mes · ${mesNombre}</div>
        <div class="kpi-value">${res.gestiones_mes || 0} <span style="color:var(--ink-mute);font-size:22px">/ ${res.meta_mes_total || 0}</span></div>
        <div class="kpi-delta">${pctMes}% del mes completo</div>
        <div class="progress"><div class="bar" style="width: ${pctMes}%"></div></div>
      </div>`;
  } else {
    const promesas = data.filter(d => d.regla === 'R3').length;
    const venceHoy = data.filter(d => d.zona_critica === 'CRIT_VENCE_HOY').length;
    const montoCartera = res.monto_cartera || 0;
    const kg = state.kpiGestionados || {};
    const critGest = kg.criticas_gest || 0;
    const critPct  = kg.criticas_pct  || 0;
    const urgGest  = kg.urgentes_gest || 0;
    const urgPct   = kg.urgentes_pct  || 0;
    const promGest = kg.promesas_gest || 0;
    const promPct  = kg.promesas_pct  || 0;

    const barHtml = (gest, total, pct) => `
      <div style="margin-top:8px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink-mute);margin-bottom:3px">
          <span>Gestionadas hoy</span>
          <span style="font-weight:600;color:${pct>=80?'var(--sage)':pct>=50?'var(--amber)':'var(--rust)'}">${gest} / ${total} · ${pct}%</span>
        </div>
        <div style="height:5px;background:var(--line-soft);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${pct>=80?'var(--sage)':pct>=50?'var(--amber)':'var(--rust)'};border-radius:3px;transition:width 0.4s"></div>
        </div>
      </div>`;

    html = `
      <div class="kpi kpi-critico" style="cursor:pointer" onclick="verDesgloseSegmento('criticas','Zonas críticas')">
        <div class="kpi-label">Zonas críticas <span style="font-size:10px;opacity:0.5">↗</span></div>
        <div class="kpi-value">${fmtNum.format(criticos)}</div>
        <div class="kpi-delta">${venceHoy} vencen HOY</div>
        ${barHtml(critGest, criticos, critPct)}
      </div>
      <div class="kpi" style="cursor:pointer" onclick="verDesgloseSegmento('urgentes','Urgentes hoy (R5+R1)')">
        <div class="kpi-label">Urgentes hoy (R5+R1) <span style="font-size:10px;opacity:0.5">↗</span></div>
        <div class="kpi-value">${fmtNum.format(urgentes)}</div>
        <div class="kpi-delta">de ${fmtNum.format(data.length)} casos en vista</div>
        ${barHtml(urgGest, urgentes, urgPct)}
      </div>
      <div class="kpi" style="cursor:pointer" onclick="verDesgloseSegmento('promesas','Promesas vigentes R3')">
        <div class="kpi-label">Promesas vigentes <span style="font-size:10px;opacity:0.5">↗</span></div>
        <div class="kpi-value">${fmtNum.format(promesas)}</div>
        <div class="kpi-delta">R3 · compromisos de pago activos</div>
        ${barHtml(promGest, promesas, promPct)}
      </div>
      <div class="kpi kpi-cartera">
        <div class="kpi-label">Cartera total gestionable</div>
        <div class="kpi-value" style="font-size:22px">${fmtMoney(montoCartera)}</div>
        <div class="kpi-delta">${fmtNum.format(res.cartera || 0)} clientes activos</div>
      </div>`;
  }
  $('#kpis').innerHTML = html;

  // Productividad del equipo: solo en vista jefa con ámbito = todos
  renderProductividad();
}

function renderProductividad() {
  const cont = $('#productividad');
  if (!cont) return;
  if (state.perfil.rol !== 'jefatura' || state.filtroAmbito !== 'todos') {
    cont.innerHTML = '';
    return;
  }

  const todas = (state.resumenTodas || []).filter(r => !r.es_pool || true);
  todas.sort((a, b) => {
    if (a.es_pool !== b.es_pool) return a.es_pool ? 1 : -1;
    return (+b.meta_diaria) - (+a.meta_diaria);
  });

  const mesNombre = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const fechaHoy = new Date().toLocaleDateString('es-CL');

  let html = `
    <div class="prod-section">
      <div class="prod-section-head">
        <h3 class="prod-title">Productividad del equipo</h3>
        <span class="prod-sub">Hoy · ${fechaHoy} · <i style="color:var(--ink-mute)">clic en tarjeta = desglose · ✎ = editar meta</i></span>
      </div>
      <div class="prod-grid">
  `;
  todas.forEach(c => {
    const hoy = +c.gestiones_hoy || 0;
    const meta = +c.meta_diaria || 0;
    const pct = meta ? Math.min(100, Math.round(hoy / meta * 100)) : 0;
    const estado = meta === 0 ? '' : hoy >= meta ? 'cumplida' : pct >= 80 ? 'en-ruta' : 'atrasada';
    const label = estado === 'cumplida' ? '✓ Cumplida'
                : estado === 'en-ruta' ? 'En ruta'
                : meta === 0 ? ''
                : `Atrasada · ${hoy - meta}`;
    const iniciales = (c.cobradora_nombre || '').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
    html += `
      <div class="prod-card ${estado}" onclick="verDesglose('${c.cobradora_id}', '${escHtml(c.cobradora_nombre)}')">
        <div class="prod-head">
          <span class="prod-avatar">${iniciales}</span>
          <span class="prod-name">${escHtml(c.cobradora_nombre)}</span>
          <span class="prod-edit" title="Editar meta" onclick="event.stopPropagation();editarMeta('${c.cobradora_id}','${escHtml(c.cobradora_nombre)}',${meta})">✎</span>
        </div>
        <div class="prod-numbers">
          <span class="prod-hoy">${hoy}</span>
          <span class="prod-sep">/</span>
          <span class="prod-meta">${meta}</span>
        </div>
        <div class="prod-bar"><div class="prod-bar-fill" style="width: ${pct}%"></div></div>
        <div class="prod-status">${label}</div>
      </div>`;
  });
  html += `</div>`;

  html += `
    <div class="prod-section-head" style="margin-top: 18px;">
      <h3 class="prod-title">Mes acumulado · ${mesNombre}</h3>
      <span class="prod-sub">Hábiles transcurridos del mes</span>
    </div>
    <div class="prod-grid">
  `;
  todas.forEach(c => {
    const mes = +c.gestiones_mes || 0;
    const metaAcum = +c.meta_mes_acumulada || 0;
    const metaTotal = +c.meta_mes_total || 0;
    const pct = metaAcum ? Math.min(100, Math.round(mes / metaAcum * 100)) : 0;
    const diff = mes - metaAcum;
    const estado = metaAcum === 0 ? '' : mes >= metaAcum ? 'cumplida' : pct >= 85 ? 'en-ruta' : 'atrasada';
    const label = estado === 'cumplida' ? '✓ Al día'
                : metaAcum === 0 ? ''
                : `${diff >= 0 ? '+' : ''}${diff} vs meta`;
    const iniciales = (c.cobradora_nombre || '').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
    html += `
      <div class="prod-card ${estado}">
        <div class="prod-head">
          <span class="prod-avatar">${iniciales}</span>
          <span class="prod-name">${escHtml(c.cobradora_nombre)}</span>
        </div>
        <div class="prod-numbers">
          <span class="prod-hoy">${fmtNum.format(mes)}</span>
          <span class="prod-sep">/</span>
          <span class="prod-meta">${fmtNum.format(metaTotal)}</span>
        </div>
        <div class="prod-bar"><div class="prod-bar-fill" style="width: ${pct}%"></div></div>
        <div class="prod-status">${label}</div>
      </div>`;
  });
  html += `</div></div>`;
  cont.innerHTML = html;
}

// ==========================================================================
// DESGLOSE DE GESTIONES POR COBRADORA
// ==========================================================================
const EFECTO_LABELS = {
  'compromiso_pago':       'Compromiso de pago',
  'agenda_llamado':        'Agenda llamado',
  'no_contesta':           'No contesta',
  'ocupado':               'Ocupado',
  'indica_deuda_pagada':   'Indica deuda pagada',
  'dificultad_pago':       'Dificultad de pago',
  'no_quiere_pagar':       'No quiere pagar',
  'no_corresponde_numero': 'No corresponde número',
  'cliente_equivocado':    'Cliente equivocado',
  'pre_desistido':         'Pre-desistido',
  'otro':                  'Otro',
};
const TIPO_LABELS = {
  'llamada':  'Llamada',
  'whatsapp': 'WhatsApp',
  'sms':      'SMS',
  'correo':   'Correo',
};
const EFECTO_COLORS = {
  'compromiso_pago':       'var(--sage)',
  'agenda_llamado':        'var(--ocean)',
  'no_contesta':           'var(--rust)',
  'ocupado':               'var(--amber)',
  'indica_deuda_pagada':   'var(--sage)',
  'dificultad_pago':       'var(--amber-hot)',
  'no_quiere_pagar':       'var(--rust)',
  'no_corresponde_numero': 'var(--mute,#8a8473)',
  'cliente_equivocado':    'var(--mute,#8a8473)',
  'pre_desistido':         'var(--rust)',
  'otro':                  'var(--ink-mute)',
};

async function verDesgloseSegmento(segmento, titulo) {
  const modal = $('#desglose-modal');
  const titleEl = $('#desglose-nombre');
  const bodyEl = $('#desglose-body');
  if (!modal) return;

  titleEl.textContent = titulo;
  bodyEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--ink-mute)"><span class="spinner"></span> Cargando…</div>';
  modal.classList.add('active');

  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb.rpc('cascada_desglose_segmento', {
      p_segmento: segmento,
      p_fecha: hoy
    });
    if (error) throw error;

    const total = data.total || 0;
    const porEfecto = data.por_efecto || {};
    const porTipo = data.por_tipo || {};

    if (total === 0) {
      bodyEl.innerHTML = `
        <div style="padding:30px;text-align:center;color:var(--ink-mute)">
          <div style="font-size:28px;margin-bottom:8px">0</div>
          <div>Sin gestiones registradas hoy en este segmento</div>
        </div>`;
      return;
    }

    const maxN = Math.max(...Object.values(porEfecto), 1);
    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-size:36px;font-weight:700;letter-spacing:-1px;color:var(--ink)">${total}</div>
          <div style="font-size:12px;color:var(--ink-mute);text-transform:uppercase;letter-spacing:0.5px">gestiones hoy en este segmento</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          ${Object.entries(porTipo).map(([tipo, n]) => `
            <div style="padding:4px 10px;background:var(--bg-soft);border-radius:12px;font-size:12px;color:var(--ink-soft)">
              <b>${n}</b> ${TIPO_LABELS[tipo] || tipo}
            </div>`).join('')}
        </div>
      </div>
      <div style="font-size:11px;font-weight:600;color:var(--ink-mute);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Desglose por resultado</div>`;

    Object.entries(porEfecto).sort((a,b) => b[1]-a[1]).forEach(([efecto, n]) => {
      const pct = Math.round(n / total * 100);
      const barPct = Math.round(n / maxN * 100);
      const color = EFECTO_COLORS[efecto] || 'var(--ink-mute)';
      html += `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-size:13px;color:var(--ink-soft)">${EFECTO_LABELS[efecto] || efecto}</span>
            <span style="font-size:13px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums">${n} <span style="font-size:11px;color:var(--ink-mute);font-weight:400">(${pct}%)</span></span>
          </div>
          <div style="height:6px;background:var(--line-soft);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${barPct}%;background:${color};border-radius:3px;transition:width 0.3s"></div>
          </div>
        </div>`;
    });

    bodyEl.innerHTML = html;
  } catch (e) {
    bodyEl.innerHTML = `<div style="padding:20px;color:var(--rust)">${e.message}</div>`;
  }
}

async function verDesglose(cobId, nombre) {
  const modal = $('#desglose-modal');
  const titleEl = $('#desglose-nombre');
  const bodyEl = $('#desglose-body');
  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = nombre;
  bodyEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--ink-mute)"><span class="spinner"></span> Cargando…</div>';
  modal.classList.add('active');

  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb.rpc('cascada_resumen_gestiones', {
      p_cobradora_id: cobId,
      p_fecha: hoy
    });
    if (error) throw error;

    const total = data.total || 0;
    const porEfecto = data.por_efecto || {};
    const porTipo = data.por_tipo || {};

    if (total === 0) {
      bodyEl.innerHTML = `
        <div style="padding:30px;text-align:center;color:var(--ink-mute)">
          <div style="font-size:28px;margin-bottom:8px">0</div>
          <div>Sin gestiones registradas hoy</div>
        </div>`;
      return;
    }

    // Calcular barra proporcional al mayor
    const maxN = Math.max(...Object.values(porEfecto), 1);

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-size:36px;font-weight:700;letter-spacing:-1px;color:var(--ink)">${total}</div>
          <div style="font-size:12px;color:var(--ink-mute);text-transform:uppercase;letter-spacing:0.5px">gestiones hoy</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          ${Object.entries(porTipo).map(([tipo, n]) => `
            <div style="padding:4px 10px;background:var(--bg-soft);border-radius:12px;font-size:12px;color:var(--ink-soft)">
              <b>${n}</b> ${TIPO_LABELS[tipo] || tipo}
            </div>`).join('')}
        </div>
      </div>
      <div style="font-size:11px;font-weight:600;color:var(--ink-mute);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Desglose por resultado</div>`;

    // Ordenar por cantidad desc
    const efectosOrdenados = Object.entries(porEfecto).sort((a,b) => b[1] - a[1]);

    html += efectosOrdenados.map(([efecto, n]) => {
      const pct = Math.round(n / total * 100);
      const barPct = Math.round(n / maxN * 100);
      const color = EFECTO_COLORS[efecto] || 'var(--ink-mute)';
      const label = EFECTO_LABELS[efecto] || efecto;
      return `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-size:13px;color:var(--ink-soft)">${label}</span>
            <span style="font-size:13px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums">${n} <span style="font-size:11px;color:var(--ink-mute);font-weight:400">(${pct}%)</span></span>
          </div>
          <div style="height:6px;background:var(--line-soft);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${barPct}%;background:${color};border-radius:3px;transition:width 0.3s"></div>
          </div>
        </div>`;
    }).join('');

    bodyEl.innerHTML = html;
  } catch (e) {
    bodyEl.innerHTML = `<div style="padding:20px;color:var(--rust)">${e.message}</div>`;
  }
}

// ==========================================================================
// BOTÓN SIGUIENTE — Cola de gestión priorizada
// ==========================================================================
let colaActiva = false;   // true mientras la cobradora está en modo cola

async function abrirSiguiente() {
  const btn = $('#btn-siguiente');
  btn.disabled = true;
  btn.textContent = '⏳ Cargando…';

  try {
    const { data, error } = await sb.rpc('cascada_siguiente_cliente');
    if (error) throw error;

    if (data.fin_cola) {
      toast(data.mensaje, 'success');
      btn.disabled = false;
      btn.textContent = '⏭ Siguiente cliente';
      colaActiva = false;
      return;
    }

    colaActiva = true;
    // Buscar el cliente en el state local o construirlo desde la respuesta
    let c = state.data.find(x => x.rut === data.rut && x.cuota_id === data.cuota_id);
    if (!c) c = data;  // usar datos de la RPC si no está en vista actual

    // Abrir el modal con este cliente, con botón "Siguiente →" al guardar
    openClienteModal(c.rut, true);  // true = modo cola
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '⏭ Siguiente cliente';
  }
}

// Contar cuántos quedan en la cola (para mostrar en el botón)
async function actualizarContadorSiguiente() {
  try {
    const { count } = await sb
      .from('cascada_clientes')
      .select('rut', { count: 'exact', head: true })
      .eq('estado_cuota', 'vigente')
      .not('regla', 'in', '(SAYORANA,PAGADO,R6)')
      .not('estado_gestion', 'in', '(gestionado_hoy,compromiso_vigente,verificacion_pendiente)');
    
    const btn = $('#btn-siguiente');
    if (btn && count !== null) {
      btn.textContent = count > 0 
        ? `⏭ Siguiente cliente  (${count})`
        : '✓ Cola al día';
      btn.style.background = count > 0 ? 'var(--ink)' : 'var(--sage)';
    }
  } catch (e) { /* silencioso */ }
}

// ==========================================================================
// PLANTILLAS WSP POR REGLA
// ==========================================================================
const LINK_PAGO = 'https://system.segal.cl/';

const WSP_PLANTILLAS = {
  R1: {
    label: '💬 WSP R1 · acompañar',
    texto: (c, cob) =>
      `Hola ${primerNombre(c.nombre)}, soy ${primerNombre(cob)} de Grupo Segal. Te escribo porque tienes una cuota de ${fmtMoney(c.monto)} con vencimiento el ${fmtDateLarga(c.fec_vencimiento)} que está pendiente. ¿Puedes regularizarla esta semana? Puedes pagar en ${LINK_PAGO} Quedo atenta.`,
  },
  R2: {
    label: (c) => c.dias_mora >= 30 ? '💬 WSP R2 · pre-bloqueo' : '💬 WSP R2 · negociar',
    texto: (c, cob) => c.dias_mora >= 30
      ? `Hola ${primerNombre(c.nombre)}, soy ${primerNombre(cob)} de Grupo Segal. Tu cuota de ${fmtMoney(c.monto)} lleva ${c.dias_mora} días vencida. Si no se regulariza pronto, el servicio quedará bloqueado. Puedes pagar en ${LINK_PAGO} ¿Confirmas qué día puedes pagar?`
      : `Hola ${primerNombre(c.nombre)}, soy ${primerNombre(cob)} de Grupo Segal. Tu cuota de ${fmtMoney(c.monto)} lleva ${c.dias_mora} días vencida. Necesitamos coordinar el pago para evitar que se acumule con la siguiente. Puedes pagar en ${LINK_PAGO} ¿Qué fecha podrías comprometer esta semana?`,
  },
  R3: {
    label: '💬 WSP R3 · recordatorio compromiso',
    texto: (c, cob) => {
      const fechaProx = c.fec_proxima ? fmtDateLarga(c.fec_proxima) : 'la fecha acordada';
      return `Hola ${primerNombre(c.nombre)}, soy ${primerNombre(cob)} de Grupo Segal. Te recuerdo que tienes un compromiso de pago de ${fmtMoney(c.monto)} para el ${fechaProx}. Puedes pagar en ${LINK_PAGO} Si necesitas reagendar o tienes algún inconveniente, avísame con anticipación. Gracias.`;
    },
  },
  R5: {
    label: '💬 WSP R5 · URGENTE',
    texto: (c, cob) =>
      `Hola ${primerNombre(c.nombre)}, soy ${primerNombre(cob)} de Grupo Segal. Tu cuota de ${fmtMoney(c.monto)} vence el ${fmtDateLarga(c.fec_vencimiento)}. Si no se paga a tiempo, quedará morosa y puede acumularse con la siguiente. Puedes pagar en ${LINK_PAGO} ¿Puedes pagar hoy o mañana?`,
  },
  R6: {
    label: '💬 WSP R6 · recordatorio',
    texto: (c, cob) =>
      `Hola ${primerNombre(c.nombre)}, soy ${primerNombre(cob)}. Tu cuota de ${fmtMoney(c.monto)} venció ayer. Si fue un olvido, puedes regularizarla hoy en ${LINK_PAGO} Cualquier cosa me avisas.`,
  },
  R7: {
    label: '💬 WSP R7 · reactivar',
    texto: (c, cob) =>
      `Hola ${primerNombre(c.nombre)}, soy ${primerNombre(cob)} de Grupo Segal. Tu servicio está suspendido por ${c.dias_mora} días de mora (cuota de ${fmtMoney(c.monto)}). Podemos reactivarlo con un abono parcial. Puedes pagar en ${LINK_PAGO} ¿Conversamos hoy las opciones?`,
  },
  PRE_DESISTIDO: {
    label: '💬 WSP · reactivar acuerdo',
    texto: (c, cob) =>
      `Hola ${primerNombre(c.nombre)}, soy ${primerNombre(cob)} de Grupo Segal. Queremos ayudarte a regularizar tu deuda de ${fmtMoney(c.monto)}. Tenemos opciones de pago flexibles disponibles. Puedes pagar en ${LINK_PAGO} ¿Tienes unos minutos para conversar hoy?`,
  },
};

function primerNombre(nombre) {
  if (!nombre) return '';
  return nombre.trim().split(/\s+/)[0]
    .toLowerCase()
    .replace(/^\w/, l => l.toUpperCase());
}

function fmtDateLarga(d) {
  if (!d) return '—';
  const s = typeof d === 'string' && d.length === 10 ? d + 'T00:00:00Z' : d;
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return '—';
  const dia = dt.getUTCDate();
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${dia} de ${meses[dt.getUTCMonth()]}`;
}

function getPlantillaWSP(c) {
  const cobNombre = state.perfil?.nombre || state.perfil?.email || 'tu cobradora';

  // R3: compromiso vigente — recordatorio fecha pactada (prioridad sobre regla)
  if (c.estado_gestion === 'compromiso_vigente') {
    const tpl = WSP_PLANTILLAS['R3'];
    return { label: tpl.label, texto: tpl.texto(c, cobNombre) };
  }

  // R4: agendado — plantilla dinámica según días de mora
  if (c.ultimo_efecto === 'agenda_llamado') {
    const mora = c.dias_mora;
    let claveR;
    if (mora >= 45)      claveR = 'R7';
    else if (mora >= 30) claveR = 'R2';  // pre-bloqueo
    else if (mora >= 15) claveR = 'R2';  // negociar
    else                 claveR = 'R1';
    const tpl = WSP_PLANTILLAS[claveR];
    if (!tpl) return null;
    const label = typeof tpl.label === 'function' ? tpl.label(c) : tpl.label;
    return { label: `💬 WSP R4 · ${label.replace('💬 ','').split('·')[1]?.trim() || claveR}`, texto: tpl.texto(c, cobNombre) };
  }

  // Resto: por regla
  const tpl = WSP_PLANTILLAS[c.regla];
  if (!tpl) return null;
  return {
    label: typeof tpl.label === 'function' ? tpl.label(c) : tpl.label,
    texto: tpl.texto(c, cobNombre),
  };
}

async function enviarWSP(c) {
  const movil = c.movil_efectivo || c.celular || c.telefono;
  if (!movil) { toast('Sin móvil disponible para este cliente', 'error'); return; }

  const plantilla = getPlantillaWSP(c);
  if (!plantilla) { 
    // Sin plantilla: abrir WSP directo
    window.open(`https://wa.me/56${movil.replace(/\D/g,'')}`, '_blank');
    return;
  }

  const texto = encodeURIComponent(plantilla.texto);
  window.open(`https://wa.me/56${movil.replace(/\D/g,'')}?text=${texto}`, '_blank');

  // Auto-registrar "No contesta · WSP enviado" con nota del texto enviado
  try {
    await sb.rpc('cascada_registrar_gestion', {
      p_rut: c.rut,
      p_cuota_id: c.cuota_id,
      p_tipo: 'whatsapp',
      p_efecto: 'no_contesta',
      p_nota: `WSP enviado: ${plantilla.texto.slice(0, 180)}`,
      p_fec_proxima: null,
    });
    toast('WSP enviado · gestión registrada automáticamente', 'success');
    // Actualizar estado local optimistamente
    const idx = state.data.findIndex(x => x.rut === c.rut);
    if (idx >= 0) state.data[idx].estado_gestion = 'gestionado_hoy';
    renderTable();
    loadData().catch(() => {});
  } catch (e) {
    toast('WSP abierto · error al registrar: ' + e.message, 'error');
  }
}

// ==========================================================================
// MODAL DEL CLIENTE (actualizado con botón WSP dinámico)
// ==========================================================================
function editarMeta(cobId, nombre, metaActual) {
  const modal = $('#meta-modal');
  $('#meta-modal-nombre').textContent = nombre;
  $('#meta-modal-actual').textContent = metaActual;
  $('#meta-modal-input').value = metaActual;
  $('#meta-modal-input').dataset.cobId = cobId;
  $('#meta-modal-permanente').checked = false;
  $('#meta-modal-motivo').value = '';
  modal.classList.add('active');
  setTimeout(() => $('#meta-modal-input').focus(), 100);
}

async function guardarMeta() {
  const input = $('#meta-modal-input');
  const cobId = input.dataset.cobId;
  const nuevaMeta = parseInt(input.value, 10);
  const permanente = $('#meta-modal-permanente').checked;
  const motivo = $('#meta-modal-motivo').value.trim() || null;

  if (!cobId) { toast('Error: cobradora no identificada', 'error'); return; }
  if (isNaN(nuevaMeta) || nuevaMeta < 0) { toast('Meta inválida', 'error'); return; }

  const btn = $('#meta-modal-guardar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Guardando…';

  try {
    const rpcPromise = sb.rpc('cascada_setear_meta', {
      p_cobradora_id: cobId,
      p_meta: nuevaMeta,
      p_fecha: new Date().toISOString().slice(0,10),
      p_aplicar_permanente: permanente,
      p_motivo: motivo,
    });
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('Tiempo de espera agotado. Intenta de nuevo.')), 12000)
    );
    const { data, error } = await Promise.race([rpcPromise, timeout]);
    if (error) throw error;

    toast(`Meta actualizada a ${nuevaMeta}`, 'success');
    closeModal('meta-modal');

    // Actualizar optimistamente el resumen local sin esperar loadData completo
    const cobResumen = (state.resumenTodas || []).find(r => r.cobradora_id === cobId);
    if (cobResumen) cobResumen.meta_diaria = nuevaMeta;
    renderKPIs();

    // Recargar en segundo plano
    loadData().catch(e => console.warn('Reload post-meta falló:', e));
  } catch (e) {
    console.error('[Meta]', e);
    toast('Error: ' + (e.message || 'No se pudo guardar'), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
}

function renderFilters() {
  const d = state.data;
  const pillDef = [
    { id: 'CRITICO',  label: 'Urgentes',          count: d.filter(x => 
        (x.estado_gestion === 'sin_gestion' && x.dias_mora >= 0 && !['SAYORANA','PAGADO','R6'].includes(x.regla)) ||
        (x.estado_gestion === 'compromiso_vigente' && x.fec_proxima && x.fec_proxima <= new Date().toISOString().slice(0,10))
      ).length, crit: true },
    { id: 'R5',       label: 'R5 Al Límite',       count: d.filter(x => x.regla === 'R5').length },
    { id: 'R1',       label: 'R1 Primer Contacto', count: d.filter(x => x.regla === 'R1').length },
    { id: 'R2',       label: 'R2 Mora Activa',     count: d.filter(x => x.regla === 'R2').length },
    { id: 'R3',       label: 'R3 Compromisos',     count: d.filter(x => x.estado_gestion === 'compromiso_vigente').length },
    { id: 'R4',       label: 'R4 Agendados',       count: d.filter(x => x.ultimo_efecto === 'agenda_llamado').length },
    { id: 'R7',       label: 'R7 Recuperación',    count: d.filter(x => x.regla === 'R7').length },
    { id: 'R6',       label: 'R6 Fidelizados',     count: d.filter(x => x.regla === 'R6').length },
    { id: 'SAYORANA', label: 'Sayorana',            count: d.filter(x => x.regla === 'SAYORANA').length },
  ].filter(p => p.count > 0);

  const html = pillDef.map(p => {
    const active = state.filtroRegla === p.id ? 'active' : '';
    return `<button class="pill ${p.crit ? 'crit' : ''} ${active}" onclick="setFiltroRegla('${p.id}')">${p.label}<span class="count">${fmtNum.format(p.count)}</span></button>`;
  }).join('');
  $('#filters').innerHTML = html;
}

function setFiltroRegla(r) {
  state.filtroRegla = r;
  state.filtroZona = null;
  state.page = 0;
  renderTable();
  renderSidebar();
}

function getFiltered() {
  let d = state.data;

  // Filtro zona crítica (desde sidebar atención prioritaria)
  if (state.filtroZona) d = d.filter(x => x.zona_critica === state.filtroZona);

  if (!state.filtroZona && !state.filtroRegla) {
    // Vista por defecto: orden estable por mora asc + rut como desempate
    d = [...d].sort((a, b) => a.dias_mora - b.dias_mora || a.rut.localeCompare(b.rut));

  } else if (state.filtroRegla === 'CRITICO') {
    const hoy = new Date().toISOString().slice(0, 10);
    d = d.filter(x =>
      (x.estado_gestion === 'sin_gestion' && x.dias_mora >= 0 && !['SAYORANA','PAGADO','R6'].includes(x.regla)) ||
      (x.estado_gestion === 'compromiso_vigente' && x.fec_proxima && x.fec_proxima <= hoy)
    );
    d = [...d].sort((a, b) => {
      // Compromisos vencidos primero, luego todo por mora ascendente puro
      const esCompromiso = x => x.estado_gestion === 'compromiso_vigente';
      if (esCompromiso(a) !== esCompromiso(b)) return esCompromiso(a) ? -1 : 1;
      return a.dias_mora - b.dias_mora || a.rut.localeCompare(b.rut);
    });

  } else if (state.filtroRegla === 'R4') {
    d = d.filter(x => x.ultimo_efecto === 'agenda_llamado');
    d = [...d].sort((a, b) => a.dias_mora - b.dias_mora || a.rut.localeCompare(b.rut));

  } else if (state.filtroRegla === 'R3') {
    d = d.filter(x => x.estado_gestion === 'compromiso_vigente');
    d = [...d].sort((a, b) => a.dias_mora - b.dias_mora || a.rut.localeCompare(b.rut));

  } else if (state.filtroRegla === 'R2_BLOQUEO') {
    d = d.filter(x => x.regla === 'R2' && x.dias_mora >= 30);
    d = [...d].sort((a, b) => a.dias_mora - b.dias_mora || a.rut.localeCompare(b.rut));

  } else if (state.filtroRegla === 'R2_MORA') {
    d = d.filter(x => x.regla === 'R2' && x.dias_mora < 30);
    d = [...d].sort((a, b) => a.dias_mora - b.dias_mora || a.rut.localeCompare(b.rut));

  } else if (state.filtroRegla) {
    d = d.filter(x => x.regla === state.filtroRegla);
    d = [...d].sort((a, b) => a.dias_mora - b.dias_mora || a.rut.localeCompare(b.rut));
  }

  // Búsqueda por nombre o RUT
  const q = state.search.trim().toLowerCase();
  if (q) d = d.filter(x =>
    (x.nombre || '').toLowerCase().includes(q) ||
    (x.rut || '').toLowerCase().includes(q)
  );

  // Sort manual por mora — sobreescribe con desempate estable
  if (state.sortMora === 'asc')  d = [...d].sort((a, b) => a.dias_mora - b.dias_mora || a.rut.localeCompare(b.rut));
  if (state.sortMora === 'desc') d = [...d].sort((a, b) => b.dias_mora - a.dias_mora || a.rut.localeCompare(b.rut));

  return d;
}

function renderTable() {
  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  if (state.page >= totalPages) state.page = 0;
  const pageData = filtered.slice(state.page * state.pageSize, (state.page + 1) * state.pageSize);

  if (pageData.length === 0) {
    $('#table-body').innerHTML = `<tr><td colspan="8"><div class="empty">
      <div class="empty-icon">✓</div>
      <h3>Sin pendientes en esta categoría</h3>
      <p>Pasa al siguiente filtro.</p>
    </div></td></tr>`;
  } else {
    $('#table-body').innerHTML = pageData.map((c, i) => renderRow(c, state.page * state.pageSize + i + 1)).join('');
    $$('#table-body tr[data-rut]').forEach(tr => {
      tr.addEventListener('click', () => openClienteModal(tr.dataset.rut));
    });
  }

  $('#pager-info').textContent = `Mostrando ${Math.min(pageData.length, state.pageSize)} de ${fmtNum.format(filtered.length)} casos`;
  $('#prev-btn').disabled = state.page === 0;
  $('#next-btn').disabled = state.page >= totalPages - 1;
}

function renderRow(c, pos) {
  const esPagada = c.estado_cuota === 'pagada' || c.regla === 'PAGADO';
  const moraClass = esPagada ? '' : (c.dias_mora >= 45 ? 'alto' : c.dias_mora >= 15 ? 'medio' : '');
  const accClass = esPagada ? 'ok' : (c.zona_critica ? 'urgente' : 
                   (c.regla === 'R5' || c.regla === 'R2' ? 'warn' : 
                   (c.regla === 'R6' ? 'ok' : '')));
  const ultGes = c.ultima_gestion_fecha
    ? `<div class="last-ges"><span class="last-ges-fecha">${fmtDate(c.ultima_gestion_fecha)}</span> · ${c.ultimo_efecto || '—'}${c.ultima_gestion_nota ? '<br>' + escHtml(c.ultima_gestion_nota.slice(0, 60)) + (c.ultima_gestion_nota.length > 60 ? '…' : '') : ''}</div>`
    : `<div class="last-ges" style="color:var(--ink-faint)">Sin gestión</div>`;

  // Indicador de estado de gestión del día
  const ESTADO_ICON = {
    'sin_gestion':          '⚪',
    'gestionado_hoy':       '🟡',
    'wsp_respondido':       '🟢',
    'verificacion_pendiente':'🔵',
    'compromiso_vigente':   '🟣',
    'no_requiere':          '⚫',
  };
  const ESTADO_TITLE = {
    'sin_gestion':          'Sin gestión hoy — pendiente',
    'gestionado_hoy':       'Gestionado hoy — esperando respuesta',
    'wsp_respondido':       'WSP respondido — prioridad alta',
    'verificacion_pendiente':'Verificación pendiente — indica deuda pagada',
    'compromiso_vigente':   'Compromiso de pago vigente',
    'no_requiere':          'No requiere gestión',
  };
  const eg = c.estado_gestion || 'sin_gestion';
  const indicador = `<span title="${ESTADO_TITLE[eg] || eg}" style="font-size:14px;cursor:default">${ESTADO_ICON[eg] || '⚪'}</span>`;

  let rowClass = '';
  if (esPagada) {
    rowClass = 'pagada';
  } else if (eg === 'gestionado_hoy') {
    rowClass = 'gestionado-hoy';
  } else if (state.perfil.rol === 'cobradora') {
    const esDelPool = state.resumenTodas.some(r => r.es_pool && r.cobradora_id === c.cobradora_id);
    if (c.regla === 'SAYORANA' || esDelPool) rowClass = 'no-gestionable';
  }

  return `<tr data-rut="${c.rut}" class="${rowClass}">
    <td class="pos">${pos}</td>
    <td><span class="regla-chip r-${c.regla}">${c.regla.replace('_',' ')}</span></td>
    <td>
      ${indicador}
      <div class="cli-name" style="display:inline-block;vertical-align:middle;margin-left:4px">${escHtml(c.nombre || '')}</div>
      <div class="cli-rut">${c.rut}</div>
    </td>
    <td><span class="mora-dias ${moraClass}">${esPagada ? '✓' : c.dias_mora + 'd'}</span></td>
    <td class="num">${c.nro_cuota}${c.nro_total_cuotas ? '/' + c.nro_total_cuotas : ''}</td>
    <td class="num">${fmtMoney(c.monto)}</td>
    <td><span class="accion-chip ${accClass}">${escHtml(c.accion_sugerida || '—')}</span></td>
    <td>${ultGes}</td>
  </tr>`;
}

function escHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function changePage(delta) {
  state.page += delta;
  renderTable();
}

function renderLastCarga() {
  if (!state.lastCarga) { $('#last-carga').textContent = 'Sin cargas aún'; return; }
  const c = state.lastCarga;
  const d = new Date(c.created_at);
  $('#last-carga').innerHTML = `
    ${d.toLocaleDateString('es-CL')} ${d.toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}<br>
    <span style="color:var(--ink-soft)">${fmtNum.format(c.registros_procesados)} reg · ${fmtNum.format(c.registros_nuevos)} nuevos</span>
  `;
}

async function exportarVista() {
  const filtered = getFiltered();
  if (!filtered.length) { toast('Nada que exportar', 'error'); return; }
  const rows = filtered.map(c => ({
    RUT: c.rut,
    Cliente: c.nombre,
    Regla: c.regla,
    'Días mora': c.dias_mora,
    Cuota: `${c.nro_cuota}/${c.nro_total_cuotas || ''}`,
    Monto: c.monto,
    'Acción sugerida': c.accion_sugerida,
    'Zona crítica': c.zona_critica || '',
    Celular: c.celular || '',
    Email: c.email || '',
    Cobradora: c.cobradora_nombre || '',
    'Última gestión': c.ultima_gestion_fecha || '',
    'Último efecto': c.ultimo_efecto || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cartera');
  const fecha = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `cascada_${fecha}.xlsx`);
}

// ==========================================================================
// MODAL DE CLIENTE + REGISTRO DE GESTIÓN
// ==========================================================================
let clienteActual = null;

function openClienteModal(rut, modoColaParam) {
  // Buscar en state.data o usar el objeto directo si viene de la RPC
  let c = state.data.find(x => x.rut === rut);
  if (!c) return;
  clienteActual = c;
  const modoCola = modoColaParam === true || colaActiva;

  $('#cli-modal-name').textContent = c.nombre || '—';
  $('#cli-modal-rut').textContent = 'RUT ' + c.rut;
  $('#cli-modal-accion').textContent = c.accion_sugerida || '—';
  $('#cli-modal-regla').innerHTML = `<span class="regla-chip r-${c.regla}">${c.regla.replace('_',' ')}</span>`;
  $('#cli-modal-mora').textContent = c.dias_mora + ' días';
  $('#cli-modal-cel').textContent = c.celular || '—';
  $('#cli-modal-tel').textContent = c.telefono || '—';
  $('#cli-modal-email').textContent = c.email || '—';
  $('#cli-modal-monto').textContent = fmtMoney(c.monto);
  $('#cli-modal-cuota').textContent = `${c.nro_cuota}${c.nro_total_cuotas ? '/' + c.nro_total_cuotas : ''}`;
  $('#cli-modal-venc').textContent = fmtDate(c.fec_vencimiento);

  // Mostrar botón Saltar solo en modo cola
  const btnSaltar = $('#btn-saltar');
  if (btnSaltar) btnSaltar.style.display = modoCola ? 'inline-flex' : 'none';

  // === Historial previo: última gestión conocida ===
  const histEl = $('#cli-modal-historial');
  if (histEl) {
    if (c.ultima_gestion_fecha) {
      const efecto = (c.ultimo_efecto || '').replace(/_/g, ' ').toUpperCase();
      const fechaGes = fmtDate(c.ultima_gestion_fecha);
      const proxGes = c.fec_proxima ? ` · Próx: ${fmtDate(c.fec_proxima)}` : '';
      const nota = c.ultima_gestion_nota ? `<div style="color:var(--ink-mute);font-size:11px;margin-top:3px;font-style:italic">"${escHtml(c.ultima_gestion_nota.slice(0,120))}${c.ultima_gestion_nota.length > 120 ? '…' : ''}"</div>` : '';
      histEl.innerHTML = `
        <div style="font-size:11px;font-weight:600;color:var(--ink-mute);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Última gestión registrada</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:12px;font-weight:600;color:var(--ink-soft)">${fechaGes}</span>
          <span style="padding:2px 8px;background:var(--bg-soft);border-radius:4px;font-size:11px;font-weight:600;color:var(--ink-soft)">${efecto || '—'}</span>
          ${proxGes ? `<span style="font-size:11px;color:var(--amber)">${proxGes}</span>` : ''}
        </div>
        ${nota}`;
      histEl.style.display = 'block';
    } else {
      histEl.innerHTML = `<div style="font-size:12px;color:var(--ink-faint)">Sin gestiones previas registradas</div>`;
      histEl.style.display = 'block';
    }
  }

  const movil = c.movil_efectivo || c.celular || c.telefono;
  const tienMovil = !!movil;
  const plantilla = getPlantillaWSP(c);
  const wspLabel = plantilla ? plantilla.label : '💬 WhatsApp';

  // Botón WSP: etiqueta dinámica + abre plantilla
  const btnWsp = $('#btn-wsp');
  btnWsp.textContent = wspLabel;
  btnWsp.disabled = !tienMovil;
  btnWsp.title = tienMovil ? '' : 'Sin móvil válido — registrar gestión sin WSP';
  btnWsp.style.opacity = tienMovil ? '1' : '0.45';
  btnWsp.onclick = () => enviarWSP(c);

  // Botón Llamar
  $('#btn-tel').onclick = () => {
    if (!movil) { toast('Sin número disponible', 'error'); return; }
    window.location.href = 'tel:+56' + movil.replace(/\D/g,'');
  };

  // Agregar "WSP respondido" al select de efectos si corresponde
  const efectoSel = $('#ges-efecto');
  const optWspResp = efectoSel.querySelector('option[value="wsp_respondido"]');
  if (!optWspResp) {
    const opt = document.createElement('option');
    opt.value = 'wsp_respondido';
    opt.textContent = '🟢 WSP respondido';
    // Insertar al inicio después de "Seleccionar"
    efectoSel.insertBefore(opt, efectoSel.children[1]);
  }

  // Reset form
  $('#ges-tipo').value = 'llamada';
  $('#ges-efecto').value = '';
  $('#ges-fec-proxima').value = '';
  $('#ges-nota').value = '';
  $('#row-fecha-proxima').style.display = 'none';
  $('#btn-guardar-ges').disabled = false;
  $('#btn-guardar-siguiente').disabled = false;

  // --- Quién puede gestionar qué ---
  // PRE-DESISTIDO: las cobradoras SÍ pueden gestionar (el equipo los trabaja activamente)
  // SAYORANA y POOL: solo jefatura/pool
  const esJefa = state.perfil.rol === 'jefatura';
  const esSayorana = c.regla === 'SAYORANA';
  const esPagada = c.estado_cuota === 'pagada' || c.regla === 'PAGADO';
  const esDelPool = !esJefa && state.resumenTodas.some(r => r.es_pool && r.cobradora_id === c.cobradora_id);

  const bloqueado = esPagada || (!esJefa && (esSayorana || esDelPool));
  const motivo = esPagada   ? 'Cuota ya pagada. No requiere gestión de cobranza.'
              : esSayorana  ? 'Cliente en Sayorana (90+ días). Solo jefatura/pool puede gestionar.'
              : esDelPool   ? 'Cliente reasignado al pool jefatura.'
              : '';

  $('#form-gest-container').style.display = bloqueado ? 'none' : 'block';
  $('#gest-bloqueado').style.display = bloqueado ? 'block' : 'none';
  if (bloqueado) $('#gest-bloqueado-msg').textContent = motivo;

  $('#cliente-modal').classList.add('active');
}

function closeModal(id) { $('#' + id).classList.remove('active'); }

$('#ges-efecto').addEventListener('change', e => {
  const needFecha = ['compromiso_pago', 'agenda_llamado'].includes(e.target.value);
  $('#row-fecha-proxima').style.display = needFecha ? 'grid' : 'none';
});

async function guardarGestion(avanzarSiguiente) {
  const efecto = $('#ges-efecto').value;
  if (!efecto) { toast('Selecciona un efecto', 'error'); return false; }
  const needFecha = ['compromiso_pago', 'agenda_llamado'].includes(efecto);
  const fecProxima = $('#ges-fec-proxima').value;
  if (needFecha && !fecProxima) { toast('Indica la fecha próxima', 'error'); return false; }

  const btnG = $('#btn-guardar-ges');
  const btnGS = $('#btn-guardar-siguiente');
  
  // Reset defensivo: asegurarse que los labels están limpios antes de empezar
  btnG.textContent = 'Solo guardar';
  btnGS.textContent = 'Guardar y siguiente →';
  
  btnG.disabled = true; btnGS.disabled = true;
  const btnActivo = avanzarSiguiente ? btnGS : btnG;
  btnActivo.innerHTML = '<span class="spinner"></span> Guardando…';

  // Helper: reset garantizado de botones
  const resetButtons = () => {
    btnG.disabled = false; btnGS.disabled = false;
    btnG.textContent = 'Solo guardar';
    btnGS.textContent = 'Guardar y siguiente →';
  };

  try {
    // Timeout de 15s: si la RPC no responde, abortamos con error claro
    const rpcPromise = sb.rpc('cascada_registrar_gestion', {
      p_rut: clienteActual.rut,
      p_cuota_id: clienteActual.cuota_id,
      p_tipo: $('#ges-tipo').value,
      p_efecto: efecto,
      p_nota: $('#ges-nota').value || null,
      p_fec_proxima: fecProxima || null,
    });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('La solicitud demoró más de 15 segundos. Revisa tu conexión o intenta de nuevo.')), 15000)
    );
    
    const result = await Promise.race([rpcPromise, timeoutPromise]);
    const { error, data } = result;
    console.log('[Cascada] Gestión guardada:', data, 'error:', error);
    if (error) throw error;

    toast('Gestión registrada', 'success');

    // Actualización optimista de KPIs
    if (state.resumenDia) {
      state.resumenDia.gestiones_hoy = (state.resumenDia.gestiones_hoy || 0) + 1;
      state.resumenDia.gestiones_mes = (state.resumenDia.gestiones_mes || 0) + 1;
    }
    const targetCobId = state.perfil.rol === 'cobradora' ? state.perfil.id : clienteActual.cobradora_id;
    const mio = (state.resumenTodas || []).find(r => r.cobradora_id === targetCobId);
    if (mio) {
      mio.gestiones_hoy = (+mio.gestiones_hoy || 0) + 1;
      mio.gestiones_mes = (+mio.gestiones_mes || 0) + 1;
    }

    resetButtons();
    renderKPIs();

    if (avanzarSiguiente) {
      siguienteCliente();
    } else {
      closeModal('cliente-modal');
    }

    loadData().catch(e => console.warn('[Cascada] Refresh background falló:', e));
    return true;
  } catch (e) {
    console.error('[Cascada] Error al guardar gestión:', e);
    toast('Error: ' + (e.message || 'desconocido'), 'error');
    resetButtons();
    return false;
  }
}

async function saltarCliente() {
  // Salta al siguiente sin registrar gestión
  closeModal('cliente-modal');
  if (colaActiva) await abrirSiguiente();
}

async function siguienteCliente() {
  // Si estamos en modo cola (botón Siguiente), usar la RPC priorizada
  if (colaActiva) {
    closeModal('cliente-modal');
    await abrirSiguiente();
    return;
  }
  // Modo normal: avanzar en la lista actual por orden de tabla
  const filtered = getFiltered();
  const idx = filtered.findIndex(x => x.rut === clienteActual.rut);
  for (let i = idx + 1; i < filtered.length; i++) {
    const n = filtered[i];
    if (state.perfil.rol === 'cobradora') {
      if (n.regla === 'SAYORANA') continue;
      const esDelPool = state.resumenTodas.some(r => r.es_pool && r.cobradora_id === n.cobradora_id);
      if (esDelPool) continue;
    }
    openClienteModal(n.rut);
    return;
  }
  closeModal('cliente-modal');
  toast('Se acabaron los casos en esta vista', 'success');
}

// ==========================================================================
// BÚSQUEDA
// ==========================================================================
let searchTimer;
$('#search').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = e.target.value;
    state.page = 0;
    renderTable();
  }, 180);
});

// ==========================================================================
// CARGA DE XLSX
// ==========================================================================
let cargaPendiente = null;

function openCargaModal() {
  if (state.perfil.rol !== 'jefatura') {
    toast('Solo jefatura puede cargar', 'error');
    return;
  }
  resetCarga();
  $('#carga-modal').classList.add('active');
}

function resetCarga() {
  cargaPendiente = null;
  $('#file-input').value = '';
  $('#preview-container').innerHTML = '';
  $('#carga-footer').style.display = 'none';
  $('#drop-zone').style.display = 'block';
  // Siempre resetear el botón confirmar (puede haber quedado disabled por error previo)
  const btn = $('#btn-confirmar-carga');
  if (btn) { btn.disabled = false; btn.textContent = 'Confirmar carga'; }
}

const dz = $('#drop-zone');
['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => {
  e.preventDefault(); dz.classList.add('dragover');
}));
['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => {
  e.preventDefault(); dz.classList.remove('dragover');
}));
dz.addEventListener('drop', e => {
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});
$('#file-input').addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) handleFile(f);
});

// Mapeo de columnas del Excel del ERP a los nombres internos
const COL_MAP = {
  'rutcli_mov':     'rut',
  'nomcli_mov':     'nombre',
  'tipoing_mov':    'tipo_ingreso',
  'nomtip_mov':     'nombre_tipo',
  'fecven_mov':     'fec_vencimiento',
  'nrodoc_mov':     'nro_cuota',
  'monto_mov':      'monto',
  'valor_con':      'valor_contrato',
  'nrodoc_con':     'nro_total_cuotas',
  'folcon_mov':     'nro_contrato',
  'cobrador_mov':   'cobrador_cod',
  'nombre_cobmov':  'cobradora_nombre',
  'descri_ubi':     'ubicacion',
  'telefono':       'telefono',
  'celular':        'celular',
  'email':          'email',
  'refere_mov':     'refere_mov',   // folio de gestión ERP — referencia para export
  'fecha_ges':      'fecha_ges',
  'accion_acc':     'accion_ges',
  'efecto_efe':     'efecto_ges',
  'nota_ges':       'nota_ges',
  'fecprox_ges':    'fecprox_ges',
  'nombre_ven':     'vendedor',
  'abogado':        'abogado',
  'procurador':     'procurador',
};

async function handleFile(file) {
  try {
    showLoading('Leyendo archivo…');
    const buf = await file.arrayBuffer();
    // cellDates: true + raw: true → SheetJS nos entrega objetos Date nativos
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    
    // Buscar la hoja que tenga rutcli_mov como columna
    let sheetName = wb.SheetNames[0];
    for (const sn of wb.SheetNames) {
      const ws = wb.Sheets[sn];
      const headers = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0 })[0] || [];
      if (headers.includes('rutcli_mov')) { sheetName = sn; break; }
    }
    const ws = wb.Sheets[sheetName];
    // raw: true respeta cellDates y nos da los valores nativos (Date, number, string)
    const raw = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
    
    if (!raw.length || !('rutcli_mov' in raw[0])) {
      throw new Error('El archivo no contiene columnas del ERP (rutcli_mov, etc). Verifica la hoja.');
    }

    // DEBUG: inspeccionar el primer registro para verificar tipos
    console.log('[Cascada] Primer registro del Excel:', raw[0]);
    console.log('[Cascada] Tipo fecven_mov:', typeof raw[0].fecven_mov, 'valor:', raw[0].fecven_mov);

    // Transformar al formato que espera la RPC
    let sinFechaCount = 0;
    const registros = raw.map(row => {
      const obj = {};
      for (const [erpCol, intName] of Object.entries(COL_MAP)) {
        let v = row[erpCol];
        if (v === null || v === undefined || v === '') { obj[intName] = null; continue; }
        // Fechas: aceptar Date, número serial, string en cualquier formato común
        if (['fec_vencimiento', 'fecha_ges', 'fecprox_ges'].includes(intName)) {
          obj[intName] = parseDateFlex(v);
          if (intName === 'fec_vencimiento' && !obj[intName]) sinFechaCount++;
        } else if (['rut', 'nro_contrato', 'folio', 'telefono', 'celular'].includes(intName)) {
          // Campos que siempre deben ser string aunque Excel los entregue como número
          obj[intName] = String(v).trim();
        } else {
          obj[intName] = typeof v === 'string' ? v.trim() : v;
        }
      }
      return obj;
    }).filter(r => r.rut);

    if (sinFechaCount > 0) {
      console.warn(`[Cascada] ${sinFechaCount} registros sin fec_vencimiento parseable`);
    }

    // Resumen antes de enviar
    const porCobradora = {};
    const sinCobradora = registros.filter(r => !r.cobradora_nombre).length;
    registros.forEach(r => {
      const k = (r.cobradora_nombre || '').toUpperCase().trim();
      if (k) porCobradora[k] = (porCobradora[k] || 0) + 1;
    });
    const preDesistidos = registros.filter(r => r.ubicacion === 'PRE-DESISTIDO').length;

    cargaPendiente = { registros, nombre: file.name };

    // Asegurar que el botón confirmar esté habilitado
    const btnConf = $('#btn-confirmar-carga');
    if (btnConf) { btnConf.disabled = false; btnConf.textContent = 'Confirmar carga'; }

    // Preview
    let html = `<div class="preview-card">
      <h4>Vista previa del archivo</h4>
      <div class="preview-row"><span>Archivo</span><span class="v">${escHtml(file.name)}</span></div>
      <div class="preview-row"><span>Registros totales</span><span class="v">${fmtNum.format(registros.length)}</span></div>
      <div class="preview-row"><span>Pre-desistidos</span><span class="v">${fmtNum.format(preDesistidos)}</span></div>
      <div class="preview-row"><span>Sin cobradora asignada</span><span class="v">${fmtNum.format(sinCobradora)} → pool</span></div>
    </div>`;
    html += `<div class="preview-card"><h4>Por cobradora</h4>`;
    Object.entries(porCobradora).sort((a,b) => b[1] - a[1]).forEach(([n, c]) => {
      html += `<div class="preview-row"><span>${escHtml(n)}</span><span class="v">${fmtNum.format(c)}</span></div>`;
    });
    html += `</div>`;
    $('#preview-container').innerHTML = html;
    $('#drop-zone').style.display = 'none';
    $('#carga-footer').style.display = 'flex';
  } catch (e) {
    console.error(e);
    toast('Error leyendo archivo: ' + e.message, 'error');
    resetCarga();
  } finally {
    hideLoading();
  }
}

function parseDateFlex(v) {
  if (v === null || v === undefined || v === '') return null;
  
  // 1. Objeto Date nativo (SheetJS con cellDates:true)
  //    Usar componentes UTC para evitar shift por zona horaria.
  //    SheetJS entrega fechas como UTC medianoche; si usamos getDate() local
  //    en UTC-4 ó UTC-3, la fecha retrocede un día.
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, '0');
    const d = String(v.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // 2. Número serial de Excel (días desde 1900-01-01, con el bug de 1900)
  if (typeof v === 'number' && isFinite(v)) {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const dt = new Date(ms);
    if (isNaN(dt.getTime())) return null;
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // 3. String en varios formatos
  const s = String(v).trim();
  if (!s) return null;
  
  // ISO YYYY-MM-DD o YYYY/MM/DD
  let mt = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (mt) return `${mt[1]}-${mt[2].padStart(2,'0')}-${mt[3].padStart(2,'0')}`;
  
  // DD-MM-YYYY o DD/MM/YYYY (formato chileno, 4 dígitos año)
  mt = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (mt) return `${mt[3]}-${mt[2].padStart(2,'0')}-${mt[1].padStart(2,'0')}`;
  
  // DD-MM-YY o DD/MM/YY (2 dígitos año, asume 20XX)
  mt = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (mt) {
    const yy = parseInt(mt[3], 10);
    const yyyy = yy < 70 ? 2000 + yy : 1900 + yy;
    return `${yyyy}-${mt[2].padStart(2,'0')}-${mt[1].padStart(2,'0')}`;
  }
  
  // Último recurso: parser nativo, leer en UTC
  const dt2 = new Date(s);
  if (!isNaN(dt2.getTime())) {
    const y = dt2.getUTCFullYear();
    const m = String(dt2.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt2.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  return null;
}

$('#btn-confirmar-carga').addEventListener('click', async () => {
  if (!cargaPendiente) return;
  const btn = $('#btn-confirmar-carga');
  btn.disabled = true;
  showLoading(`Cargando ${fmtNum.format(cargaPendiente.registros.length)} registros…`);

  try {
    const { data, error } = await sb.rpc('cascada_carga_mensual', {
      p_registros: cargaPendiente.registros,
      p_nombre_archivo: cargaPendiente.nombre,
    });
    if (error) throw error;
    toast(`Carga OK · ${data.nuevos} nuevos · ${data.actualizados} actualizados · ${data.gestiones_migradas} gestiones migradas`, 'success');
    closeModal('carga-modal');
    resetCarga();
    await loadData();
  } catch (e) {
    console.error(e);
    toast('Error en carga: ' + e.message, 'error');
    btn.disabled = false;
  } finally {
    hideLoading();
  }
});

async function aplicarSayorana() {
  if (!confirm('¿Mover al pool todos los clientes con 90+ días de mora?')) return;
  showLoading('Aplicando Sayorana…');
  try {
    const { data, error } = await sb.rpc('cascada_aplicar_sayorana');
    if (error) throw error;
    toast(`${data.movidos_al_pool} clientes movidos al pool`, 'success');
    await loadData();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    hideLoading();
  }
}

// ==========================================================================
// DASHBOARD DE RECAUDACIÓN (solo jefatura)
// ==========================================================================
async function verRecaudacion() {
  if (state.perfil.rol !== 'jefatura') { toast('Solo jefatura puede ver recaudación', 'error'); return; }

  const modal = $('#recaudacion-modal');
  const body = $('#recaudacion-body');
  body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--ink-mute)"><span class="spinner"></span> Cargando…</div>';
  modal.classList.add('active');

  try {
    const [resCob, resHist, resCuotas] = await Promise.all([
      sb.from('cascada_recaudacion_cobradora').select('*').order('monto_pagado', { ascending: false }),
      sb.from('cascada_historial_pagos').select('*').limit(20),
      sb.from('cascada_cuotas_pagadas').select('*').limit(200),
    ]);

    if (resCob.error) throw resCob.error;

    const cobData = resCob.data || [];
    const histData = resHist.data || [];
    const cuotasData = resCuotas.data || [];

    // Totales globales
    const totalMonto = cobData.reduce((s, r) => s + (+r.monto_pagado || 0), 0);
    const totalCuotas = cobData.reduce((s, r) => s + (+r.cuotas_pagadas || 0), 0);
    const totalClientes = cobData.reduce((s, r) => s + (+r.clientes_pagaron || 0), 0);
    const nArchivos = histData.length;
    const maxMonto = Math.max(...cobData.map(r => +r.monto_pagado || 0), 1);

    // === KPIs ===
    let html = `<div class="recap-kpis">
      <div class="recap-kpi">
        <div class="label">Total recaudado</div>
        <div class="val verde">${fmtMoney(totalMonto)}</div>
        <div class="sub">suma de cuotas pagadas</div>
      </div>
      <div class="recap-kpi">
        <div class="label">Cuotas pagadas</div>
        <div class="val">${fmtNum.format(totalCuotas)}</div>
        <div class="sub">sobre ${fmtNum.format(totalCuotas + (2239))} vigentes</div>
      </div>
      <div class="recap-kpi">
        <div class="label">Clientes que pagaron</div>
        <div class="val">${fmtNum.format(totalClientes)}</div>
        <div class="sub">clientes únicos</div>
      </div>
      <div class="recap-kpi">
        <div class="label">Archivos cargados</div>
        <div class="val">${nArchivos}</div>
        <div class="sub">cargas de pago registradas</div>
      </div>
    </div>`;

    // === Por cobradora ===
    html += `<div class="recap-section">
      <h4>Recaudación por cobradora</h4>
      <table class="recap-table">
        <thead>
          <tr>
            <th>Cobradora</th>
            <th class="num">Cuotas</th>
            <th class="num">Clientes</th>
            <th class="num">Monto recaudado</th>
            <th style="width:160px">% del total</th>
          </tr>
        </thead>
        <tbody>`;

    cobData.forEach(r => {
      const pct = totalMonto > 0 ? Math.round((+r.monto_pagado / totalMonto) * 100) : 0;
      html += `<tr>
        <td><b>${escHtml(r.cobradora)}</b></td>
        <td class="num">${fmtNum.format(r.cuotas_pagadas)}</td>
        <td class="num">${fmtNum.format(r.clientes_pagaron)}</td>
        <td class="num monto">${fmtMoney(+r.monto_pagado)}</td>
        <td>
          <div class="recap-bar-wrap">
            <div class="recap-bar"><div class="recap-bar-fill" style="width:${pct}%"></div></div>
            <span style="font-size:11px;color:var(--ink-mute);width:28px;text-align:right">${pct}%</span>
          </div>
        </td>
      </tr>`;
    });

    html += `<tr style="font-weight:700;background:var(--bg-soft)">
      <td>TOTAL</td>
      <td class="num">${fmtNum.format(totalCuotas)}</td>
      <td class="num">${fmtNum.format(totalClientes)}</td>
      <td class="num monto">${fmtMoney(totalMonto)}</td>
      <td></td>
    </tr></tbody></table></div>`;

    // === Historial de cargas ===
    if (histData.length > 0) {
      html += `<div class="recap-section">
        <h4>Historial de cargas de pago</h4>
        <table class="recap-table">
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Fecha carga</th>
              <th class="num">Registros</th>
              <th class="num">Cuotas marcadas</th>
              <th>Subido por</th>
            </tr>
          </thead>
          <tbody>`;

      histData.forEach(r => {
        const fecha = r.created_at ? new Date(r.created_at).toLocaleString('es-CL', {
          day:'2-digit', month:'short', year:'numeric',
          hour:'2-digit', minute:'2-digit'
        }) : '—';
        html += `<tr>
          <td><span class="carga-chip">✓</span> ${escHtml(r.nombre_archivo || '—')}</td>
          <td>${fecha}</td>
          <td class="num">${fmtNum.format(r.registros_archivo || 0)}</td>
          <td class="num"><b>${fmtNum.format(r.cuotas_marcadas || 0)}</b></td>
          <td>${escHtml(r.subido_por || '—')}</td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
    }

    // === Detalle cuotas pagadas ===
    if (cuotasData.length > 0) {
      html += `<div class="recap-section">
        <h4>Detalle cuotas pagadas (${fmtNum.format(cuotasData.length)} más recientes)</h4>
        <div style="max-height:240px;overflow-y:auto">
        <table class="recap-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>RUT</th>
              <th class="num">Cuota</th>
              <th class="num">Monto</th>
              <th>Cobradora</th>
              <th>Vencimiento</th>
            </tr>
          </thead>
          <tbody>`;

      cuotasData.forEach(r => {
        html += `<tr>
          <td>${escHtml(r.nombre || '—')}</td>
          <td style="font-family:monospace;font-size:11px">${r.rut}</td>
          <td class="num">${r.nro_cuota}${r.nro_total_cuotas ? '/'+r.nro_total_cuotas : ''}</td>
          <td class="num monto">${fmtMoney(+r.monto)}</td>
          <td>${escHtml(r.cobradora || '—')}</td>
          <td>${fmtDate(r.fec_vencimiento)}</td>
        </tr>`;
      });
      html += `</tbody></table></div></div>`;
    }

    // === Botón exportar ===
    html += `<div class="recap-export">
      <button class="btn-sm primary" onclick="exportarRecaudacion()">↓ Exportar recaudación XLSX</button>
    </div>`;

    body.innerHTML = html;

    // Guardar datos para el export
    body._exportData = { cobData, cuotasData, histData };

  } catch (e) {
    body.innerHTML = `<div style="padding:30px;color:var(--rust)">Error: ${e.message}</div>`;
  }
}

async function exportarRecaudacion() {
  const body = $('#recaudacion-body');
  const d = body._exportData;
  if (!d) return;

  const wb = XLSX.utils.book_new();

  // Hoja 1: resumen por cobradora
  const ws1 = XLSX.utils.json_to_sheet(d.cobData.map(r => ({
    'Cobradora': r.cobradora,
    'Cuotas pagadas': +r.cuotas_pagadas,
    'Clientes únicos': +r.clientes_pagaron,
    'Monto recaudado': +r.monto_pagado,
    'Monto promedio': Math.round(+r.monto_promedio),
  })));
  XLSX.utils.book_append_sheet(wb, ws1, 'Por Cobradora');

  // Hoja 2: historial de cargas
  if (d.histData.length) {
    const ws2 = XLSX.utils.json_to_sheet(d.histData.map(r => ({
      'Archivo': r.nombre_archivo,
      'Fecha carga': r.created_at ? new Date(r.created_at).toLocaleString('es-CL') : '',
      'Registros archivo': r.registros_archivo,
      'Cuotas marcadas': r.cuotas_marcadas,
      'Subido por': r.subido_por,
    })));
    XLSX.utils.book_append_sheet(wb, ws2, 'Historial Cargas');
  }

  // Hoja 3: detalle cuotas
  if (d.cuotasData.length) {
    const ws3 = XLSX.utils.json_to_sheet(d.cuotasData.map(r => ({
      'RUT': r.rut,
      'Nombre': r.nombre,
      'Cobradora': r.cobradora,
      'Cuota': `${r.nro_cuota}/${r.nro_total_cuotas || ''}`,
      'Nro Contrato': r.nro_contrato,
      'Monto': +r.monto,
      'Vencimiento': r.fec_vencimiento,
    })));
    XLSX.utils.book_append_sheet(wb, ws3, 'Detalle Cuotas');
  }

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Recaudacion_${fecha}.xlsx`);
  toast('Recaudación exportada', 'success');
}

// ==========================================================================
// CARGA DE PAGOS
// ==========================================================================
let pagosPendientes = null;

function openPagosModal() {
  if (state.perfil.rol !== 'jefatura') { toast('Solo jefatura puede cargar pagos', 'error'); return; }
  resetPagos();
  $('#pagos-modal').classList.add('active');
}

function resetPagos() {
  pagosPendientes = null;
  $('#pagos-file-input').value = '';
  $('#pagos-preview-container').innerHTML = '';
  $('#pagos-footer').style.display = 'none';
  $('#pagos-drop-zone').style.display = 'block';
}

const dzPagos = document.getElementById('pagos-drop-zone');
if (dzPagos) {
  ['dragenter','dragover'].forEach(ev => dzPagos.addEventListener(ev, e => { e.preventDefault(); dzPagos.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev => dzPagos.addEventListener(ev, e => { e.preventDefault(); dzPagos.classList.remove('dragover'); }));
  dzPagos.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) handlePagosFile(f); });
}
const pagosFileInput = document.getElementById('pagos-file-input');
if (pagosFileInput) pagosFileInput.addEventListener('change', e => { const f = e.target.files[0]; if (f) handlePagosFile(f); });

async function handlePagosFile(file) {
  try {
    showLoading('Leyendo archivo de pagos…');
    const buf = await file.arrayBuffer();
    // XLS y XLSX ambos soportados
    const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });

    if (!raw.length) throw new Error('El archivo está vacío');

    const firstRow = raw[0];
    // Detectar formato: ERP cancelaciones (rutcli_can), ERP cartera (rutcli_mov), o simple (rut)
    const esERPCancelaciones = 'rutcli_can' in firstRow;
    const esERPCartera = 'rutcli_mov' in firstRow;
    const esSimple = 'rut' in firstRow;

    if (!esERPCancelaciones && !esERPCartera && !esSimple) {
      throw new Error('Formato no reconocido. El archivo debe tener columna rutcli_can, rutcli_mov o rut.');
    }

    let pagos, resumenFormato, totalCancelaciones = 0;

    if (esERPCancelaciones) {
      // Formato cancelaciones_por_fecha.xls
      // Solo procesar registros tipoing_can=4 (CANCELACION) con haber_can > 0
      // nrodoc_can siempre = 0 en cancelaciones; la relación es por folcon_can (contrato)
      pagos = raw.map(row => ({
        rutcli_can: String(row.rutcli_can || '').trim(),
        folcon_can: row.folcon_can ? String(Math.round(row.folcon_can)) : null,
        tipoing_can: row.tipoing_can ? String(Math.round(row.tipoing_can)) : '0',
        haber_can: Number(row.haber_can) || 0,
        nrodoc_can: row.nrodoc_can ? String(Math.round(row.nrodoc_can)) : '0',
      })).filter(r => r.rutcli_can && r.rutcli_can.length > 3);

      totalCancelaciones = pagos.filter(r => r.tipoing_can === '4' && r.haber_can > 0).length;
      resumenFormato = `Formato ERP Cancelaciones · ${totalCancelaciones} registros de pago (tipoing=4)`;

    } else if (esERPCartera) {
      // Formato cartera del ERP (mismo que la carga mensual)
      pagos = raw.map(row => ({
        rut: String(row.rutcli_mov || '').trim(),
        nro_contrato: row.folcon_mov ? String(Math.round(row.folcon_mov)) : null,
        monto_pagado: Number(row.monto_mov) || 0,
      })).filter(r => r.rut && r.rut.length > 3);
      totalCancelaciones = pagos.length;
      resumenFormato = `Formato ERP Cartera · ${totalCancelaciones} registros`;

    } else {
      // Formato simple: columnas rut, nro_contrato?, nro_cuota?, monto_pagado?
      pagos = raw.map(row => ({
        rut: String(row.rut || '').trim(),
        nro_contrato: row.nro_contrato ? String(row.nro_contrato).trim() : null,
        nro_cuota: row.nro_cuota ? String(row.nro_cuota).trim() : null,
        monto_pagado: Number(row.monto_pagado) || 0,
      })).filter(r => r.rut && r.rut.length > 3);
      totalCancelaciones = pagos.length;
      resumenFormato = `Formato simple · ${totalCancelaciones} registros`;
    }

    pagosPendientes = { pagos, nombre: file.name, formato: esERPCancelaciones ? 'erp_can' : esERPCartera ? 'erp_mov' : 'simple' };

    const html = `<div class="preview-card">
      <h4>Vista previa</h4>
      <div class="preview-row"><span>Archivo</span><span class="v">${escHtml(file.name)}</span></div>
      <div class="preview-row"><span>Total registros en archivo</span><span class="v">${fmtNum.format(raw.length)}</span></div>
      <div class="preview-row"><span>Pagos a procesar</span><span class="v" style="color:var(--sage);font-weight:700">${fmtNum.format(totalCancelaciones)}</span></div>
      <div class="preview-row"><span>Formato detectado</span><span class="v">${resumenFormato}</span></div>
      ${esERPCancelaciones ? `<div class="preview-row" style="margin-top:8px;font-size:11px;color:var(--ink-mute);" colspan="2">Solo se procesarán registros con tipoing_can=4 (CANCELACION) y haber>0. Las cuotas se identifican por RUT+contrato.</div>` : ''}
    </div>`;
    $('#pagos-preview-container').innerHTML = html;
    $('#pagos-drop-zone').style.display = 'none';
    $('#pagos-footer').style.display = 'flex';
  } catch (e) {
    toast('Error leyendo archivo de pagos: ' + e.message, 'error');
    resetPagos();
  } finally {
    hideLoading();
  }
}

document.getElementById('btn-confirmar-pagos')?.addEventListener('click', async () => {
  if (!pagosPendientes) return;
  const btn = document.getElementById('btn-confirmar-pagos');
  btn.disabled = true;
  showLoading(`Procesando pagos…`);

  try {
    const { data, error } = await sb.rpc('cascada_carga_pagos', {
      p_pagos: pagosPendientes.pagos,
      p_nombre_archivo: pagosPendientes.nombre,
    });
    if (error) throw error;
    const msg = `✓ ${data.cuotas_marcadas_pagadas} cuotas pagadas · ${data.clientes_pagados} clientes pagados · ${data.no_encontradas} no encontrados`;
    toast(msg, 'success');
    closeModal('pagos-modal');
    resetPagos();
    await loadData();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
    btn.disabled = false;
  } finally {
    hideLoading();
  }
});

// ==========================================================================
// EXPORTAR GESTIONES DEL DÍA
// Formato idéntico a Gestiones_Masivas_YYYYMMDDHHSS.xlsx del ERP
// Columnas: fecha, referencia, acciontxt, efectotxt, proxges, obstxt, contactado
// ==========================================================================

// Mapeo de efectos del CRM → texto del ERP
const EFECTO_TO_ERP = {
  'compromiso_pago':       '05 COMPROMISO DE PAGO',
  'agenda_llamado':        '04 AGENDA LLAMADO',
  'no_contesta':           '09 NO CONTESTA',
  'ocupado':               '08 OCUPADO',
  'indica_deuda_pagada':   '28 INDICA DEUDA PAGADA',
  'dificultad_pago':       '07 DIFICULTAD DE PAGO',
  'no_quiere_pagar':       '10 NO QUIERE PAGAR',
  'no_corresponde_numero': '11 NO CORRESPONDE NUMERO',
  'cliente_equivocado':    '30 CLIENTE EQUIVOCADO',
  'pre_desistido':         '40 PRE-DESISTIDO',
  'otro':                  '99 OTRO',
};

// Mapeo de tipo gestión → acción del ERP
const TIPO_TO_ACCION = {
  'llamada':    '01 HACER LLAMADA',
  'whatsapp':   '05 ENVIAR WSP',
  'sms':        '06 ENVIAR SMS',
  'correo':     '07 ENVIAR EMAIL',
};

function exportarGestionesHoy() {
  if (state.perfil.rol !== 'jefatura') { toast('Solo jefatura puede exportar gestiones', 'error'); return; }
  // Abrir modal con selector de fechas
  const hoy = new Date().toISOString().slice(0, 10);
  $('#gest-fecha-desde').value = hoy;
  $('#gest-fecha-hasta').value = hoy;
  $('#gestiones-modal').classList.add('active');
}

async function ejecutarExportGestiones() {
  const desde = $('#gest-fecha-desde').value;
  const hasta = $('#gest-fecha-hasta').value;
  if (!desde || !hasta) { toast('Selecciona ambas fechas', 'error'); return; }
  if (desde > hasta) { toast('La fecha de inicio debe ser anterior al fin', 'error'); return; }

  const btn = $('#btn-exportar-gestiones');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Cargando…';

  try {
    const { data, error } = await sb.rpc('cascada_gestiones_rango', {
      p_fecha_desde: desde,
      p_fecha_hasta: hasta
    });
    if (error) throw error;
    if (!data || data.length === 0) {
      toast(`Sin gestiones entre ${desde} y ${hasta}`, 'error');
      return;
    }

    const formatFecha = iso => {
      if (!iso) return '';
      const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
      return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
    };

    const rows = data.map(g => ({
      'fecha':       formatFecha(g.fec_gestion),
      'referencia':  g.refere_erp || g.id,  // folio ERP si existe, si no ID interno
      'acciontxt':   TIPO_TO_ACCION[g.tipo] || '01 HACER LLAMADA',
      'efectotxt':   EFECTO_TO_ERP[g.efecto] || '99 OTRO',
      'proxges':     formatFecha(g.fec_proxima) || formatFecha(g.fec_gestion),
      'obstxt':      (g.nota || '').substring(0, 200).toUpperCase(),
      'contactado':  ['no_contesta','ocupado','no_corresponde_numero'].includes(g.efecto) ? 0 : 1,
      'rut':         g.rut,
      'nombre':      g.nombre_cliente,
      'cobradora':   g.cobradora,
      'nro_contrato': g.nro_contrato || '',
      'nro_cuota':   g.nro_cuota || '',
      'monto':       g.monto || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 30 },
      { wch: 12 }, { wch: 50 }, { wch: 10 },
      { wch: 14 }, { wch: 35 }, { wch: 20 }, { wch: 14 }, { wch: 8 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cuotas');
    const now = new Date();
    const ts = now.getFullYear().toString() +
      String(now.getMonth()+1).padStart(2,'0') +
      String(now.getDate()).padStart(2,'0') +
      String(now.getHours()).padStart(2,'0') +
      String(now.getMinutes()).padStart(2,'0');
    XLSX.writeFile(wb, `Gestiones_Masivas_${ts}.xlsx`);
    toast(`${data.length} gestiones exportadas (${desde} → ${hasta})`, 'success');
    closeModal('gestiones-modal');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Exportar';
  }
}

// ==========================================================================
// INIT
// ==========================================================================
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#login-submit');
  const err = $('#login-error');
  err.classList.remove('active');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Ingresando…';
  try {
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    await login(email, password);
    await bootApp();
  } catch (e) {
    err.textContent = 'Credenciales incorrectas o usuario sin acceso';
    err.classList.add('active');
    btn.disabled = false;
    btn.textContent = 'Ingresar';
  }
});

async function bootApp() {
  $('#login-screen').classList.remove('active');
  $('#app').classList.add('active');
  await loadPerfil();
  if (state.perfil.rol === 'jefatura') {
    state.filtroAmbito = 'todos';
    await loadCobradoras();
  }
  await loadData();
}

(async function init() {
  const ok = await checkSession();
  if (ok) {
    try { await bootApp(); }
    catch (e) {
      console.error(e);
      await sb.auth.signOut();
      $('#login-screen').classList.add('active');
      $('#app').classList.remove('active');
    }
  } else {
    $('#login-screen').classList.add('active');
  }
})();
