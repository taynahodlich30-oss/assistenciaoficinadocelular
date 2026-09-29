/* Pesquisa inteligente de aparelhos - Oficina do Celular
   Substitui o bloco <script> inline "Pesquisa inteligente de aparelhos" do index.html.
   Aceita: código técnico, nome comercial, modelo parcial, marca + modelo e IMEI (quando o modelo já é conhecido). */
(function () {
  'use strict';

  /* ===== 1. BASE DE MODELOS =====
     [marca, modelo, código técnico, observação para a bancada (opcional)]
     Para crescer a base, basta adicionar linhas aqui. Confira os códigos antes de confiar neles. */
  const LINHAS = [
    ['Xiaomi', 'Redmi Note 15 5G', '25100RA69G', '5G'],
    ['Xiaomi', 'Redmi Note 13 Pro 5G', '2312DRA50G', '5G'],
    ['Xiaomi', 'Redmi Note 13 Pro+ 5G', '2312DRAABG', '5G'],
    ['Xiaomi', 'Redmi Note 12 Pro+ 5G', '22101316UG', '5G'],
    ['Xiaomi', 'Redmi Note 11 Pro 5G', '2201116SG', '5G'],
    ['Samsung', 'Galaxy A15', 'SM-A155M', '4G'],
    ['Samsung', 'Galaxy A15 5G', 'SM-A156M', '5G'],
    ['Samsung', 'Galaxy A14', 'SM-A145M', '4G'],
    ['Samsung', 'Galaxy A14 5G', 'SM-A146M', '5G'],
    ['Samsung', 'Galaxy A05', 'SM-A055M'],
    ['Samsung', 'Galaxy A05s', 'SM-A057M'],
    ['Samsung', 'Galaxy A24', 'SM-A245M'],
    ['Samsung', 'Galaxy A34 5G', 'SM-A346M', '5G'],
    ['Samsung', 'Galaxy A54 5G', 'SM-A546E', '5G'],
    ['Samsung', 'Galaxy A73 5G', 'SM-A736B', '5G'],
    ['Samsung', 'Galaxy S21 5G', 'SM-G991B', 'Linha S'],
    ['Samsung', 'Galaxy S23 Ultra', 'SM-S918B', 'Linha S'],
    ['Samsung', 'Galaxy S24', 'SM-S921B', 'Linha S'],
    ['Samsung', 'Galaxy S24 Ultra', 'SM-S928B', 'Linha S'],
    ['Motorola', 'Moto G54 5G', 'XT-2341-1', '5G'],
    ['Motorola', 'Moto G53 5G', 'XT-2313-5', '5G'],
    ['Motorola', 'Moto G84 5G', 'XT-2331-2', '5G'],
    ['Motorola', 'Moto G62 5G', 'XT-2205-1', '5G'],
    ['Motorola', 'Moto G22', 'XT-2163-4'],
    ['Realme', 'realme C55', 'RMX3710'],
    ['Realme', 'realme C35', 'RMX3630']
  ];
  /* iPhones: número do modelo (Axxxx) de cada versão regional, conforme a lista de identificação da Apple */
  const APPLE = [
    ['iPhone 17 Pro Max', 'A3257 A3525 A3527 A3526'], ['iPhone 17 Pro', 'A3256 A3522 A3524 A3523'], ['iPhone 17', 'A3258 A3519 A3521 A3520'],
    ['iPhone Air', 'A3260 A3516 A3518 A3517'], ['iPhone 16e', 'A3212 A3408 A3410 A3409'],
    ['iPhone 16 Pro Max', 'A3084 A3295 A3297 A3296'], ['iPhone 16 Pro', 'A3083 A3292 A3294 A3293'], ['iPhone 16 Plus', 'A3082 A3289 A3291 A3290'], ['iPhone 16', 'A3081 A3286 A3288 A3287'],
    ['iPhone 15 Pro Max', 'A2849 A3105 A3108 A3106'], ['iPhone 15 Pro', 'A2848 A3101 A3104 A3102'], ['iPhone 15 Plus', 'A2847 A3093 A3096 A3094'], ['iPhone 15', 'A2846 A3089 A3092 A3090'],
    ['iPhone 14 Pro Max', 'A2651 A2893 A2894 A2895 A2896'], ['iPhone 14 Pro', 'A2650 A2889 A2890 A2891 A2892'], ['iPhone 14 Plus', 'A2632 A2885 A2886 A2887 A2888'], ['iPhone 14', 'A2649 A2881 A2882 A2883 A2884'],
    ['iPhone SE (3ª geração)', 'A2595 A2782 A2783 A2784 A2785'],
    ['iPhone 13 Pro Max', 'A2484 A2641 A2643 A2644 A2645'], ['iPhone 13 Pro', 'A2483 A2636 A2638 A2639 A2640'], ['iPhone 13', 'A2482 A2631 A2633 A2634 A2635'], ['iPhone 13 mini', 'A2481 A2626 A2628 A2629 A2630'],
    ['iPhone 12 Pro Max', 'A2342 A2410 A2411 A2412'], ['iPhone 12 Pro', 'A2341 A2406 A2407 A2408'], ['iPhone 12', 'A2172 A2402 A2403 A2404'], ['iPhone 12 mini', 'A2176 A2398 A2399 A2400'],
    ['iPhone SE (2ª geração)', 'A2275 A2296 A2298'],
    ['iPhone 11 Pro Max', 'A2161 A2218 A2220'], ['iPhone 11 Pro', 'A2160 A2215 A2217'], ['iPhone 11', 'A2111 A2221 A2223'],
    ['iPhone XS Max', 'A1921 A2101 A2102 A2103 A2104'], ['iPhone XS', 'A1920 A2097 A2098 A2099 A2100'], ['iPhone XR', 'A1984 A2105 A2106 A2107 A2108'], ['iPhone X', 'A1865 A1901 A1902'],
    ['iPhone 8 Plus', 'A1864 A1897 A1898'], ['iPhone 8', 'A1863 A1905 A1906'], ['iPhone 7 Plus', 'A1661 A1784 A1785'], ['iPhone 7', 'A1660 A1778 A1779'],
    ['iPhone 6s Plus', 'A1634 A1687 A1699'], ['iPhone 6s', 'A1633 A1688 A1700'], ['iPhone 6 Plus', 'A1522 A1524 A1593'], ['iPhone 6', 'A1549 A1586 A1589'],
    ['iPhone SE (1ª geração)', 'A1662 A1723 A1724'], ['iPhone 5s', 'A1453 A1457 A1518 A1528 A1530 A1533'], ['iPhone 5c', 'A1456 A1507 A1516 A1529 A1532'], ['iPhone 5', 'A1428 A1429 A1442'],
    ['iPhone 4s', 'A1387 A1431'], ['iPhone 4', 'A1332 A1349'], ['iPhone 3GS', 'A1303 A1325'], ['iPhone 3G', 'A1241 A1324'], ['iPhone (original)', 'A1203']
  ];
  const BASE = LINHAS.map(l => ({ brand: l[0], model: l[1], codes: [l[2]], info: l[3] || '', alias: [], fonte: 'Base local' }))
    .concat(APPLE.map(a => ({ brand: 'Apple', model: a[0], codes: a[1].split(' '), info: '', alias: [], fonte: 'Apple' })));

  /* TAC = 8 primeiros dígitos do IMEI, que identificam o modelo.
     Formato: '35412812': { brand: 'Apple', model: 'iPhone 12' }
     Fica vazio de propósito: a base aprende sozinha (veja aprenderTac) conforme as OS são salvas. */
  const TAC_BASE = {};

  /* ===== 2. UTILITÁRIOS ===== */
  const CHAVE_EXTRA = 'oc_aparelhos_extra';
  const CHAVE_TAC = 'oc_aparelhos_tac';
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
  const compacto = s => norm(s).replace(/ /g, '');
  const nome = x => (x.brand ? x.brand + ' ' : '') + x.model;
  const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) || padrao; } catch (e) { return padrao; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* armazenamento indisponível */ } };
  let ONLINE = [];      // [marca, nome, [códigos]] vindo do Google Play
  let CATALOGO = null;
  let listaModal = [];
  const marcaBonita = b => { b = String(b || '').trim(); return b && b === b.toLowerCase() ? b.replace(/\b\p{L}/gu, m => m.toUpperCase()) : b; };
  const codigosCurtos = x => x.codes.slice(0, 6).join(', ') + (x.codes.length > 6 ? ' +' + (x.codes.length - 6) + ' códigos' : '');
  function todos() {
    if (CATALOGO) return CATALOGO;
    const lista = BASE.map(x => Object.assign({}, x, { codes: x.codes.slice() }))
      .concat(ler(CHAVE_EXTRA, []).map(x => Object.assign({ info: '', alias: [], fonte: 'Cadastrado por você' }, x)));
    const porNome = new Map(lista.map(x => [norm(x.brand + ' ' + x.model), x]));
    ONLINE.forEach(o => {
      const alvo = porNome.get(norm(o[0] + ' ' + o[1]));
      if (alvo) { o[2].forEach(c => { if (!alvo.codes.includes(c)) alvo.codes.push(c); }); return; }
      lista.push({ brand: o[0], model: o[1], codes: o[2], info: '', alias: [], fonte: 'Google Play' });
    });
    return (CATALOGO = lista);
  }
  const tacInfo = d => (ler(CHAVE_TAC, {}))[d.slice(0, 8)] || TAC_BASE[d.slice(0, 8)] || null;
  const luhn = d => { let s = 0; for (let i = 0; i < d.length; i++) { let n = +d[d.length - 1 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } s += n; } return s % 10 === 0; };
  const soDigitos = v => String(v || '').replace(/\D/g, '');
  const pareceImei = v => /^\d{14,15}$/.test(String(v || '').replace(/[\s-]/g, ''));
  const pareceCodigo = v => /^[A-Za-z0-9-]{5,}$/.test(v) && /\d/.test(v);
  const COR = { Xiaomi: '#fb923c', Samsung: '#60a5fa', Motorola: '#22d3ee', Apple: '#cbd5e1', Realme: '#facc15' };
  const S = '<svg class="oc3d" viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="44" rx="13" ry="2.5" fill="#000" opacity=".32"/>';
  const ICONE = {
    lupa: S + '<rect x="29" y="27" width="7" height="17" rx="3.5" transform="rotate(-45 32.5 35.5)" fill="url(#ocDark)"/><circle cx="20" cy="20" r="14" fill="url(#ocBlue)"/><circle cx="20" cy="20" r="9.5" fill="#0b1f3a"/><circle cx="20" cy="20" r="9.5" fill="url(#ocShade)"/><path d="M12.5 16a9 9 0 0 1 7-5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/></svg>',
    camera: S + '<rect x="5" y="14" width="38" height="26" rx="7" fill="url(#ocPurple)"/><path d="M17 14l3-5h8l3 5z" fill="url(#ocDark)"/><circle cx="24" cy="27" r="9" fill="url(#ocDark)"/><circle cx="24" cy="27" r="6" fill="url(#ocBlue)"/><circle cx="21.5" cy="24.5" r="2" fill="#fff" opacity=".8"/></svg>'
  };
  const iconeAparelho = marca => S + '<rect x="14" y="6" width="22" height="38" rx="6" fill="#0b1329"/><rect x="12" y="4" width="22" height="38" rx="6" fill="url(#ocDark)"/><rect x="14.2" y="6.5" width="17.6" height="29" rx="3.5" fill="currentColor" style="color:' + (COR[marca] || '#38bdf8') + '"/><rect x="14.2" y="6.5" width="17.6" height="29" rx="3.5" fill="url(#ocShade)"/><path d="M14.2 10a3.5 3.5 0 0 1 3.5-3.5H27L14.2 22z" fill="#fff" opacity=".28"/><rect x="20" y="38.4" width="6" height="1.6" rx=".8" fill="#94a3b8"/></svg>';
  const aviso = msg => { if (typeof avisar === 'function') avisar(msg); };

  /* ===== 3. BUSCA ===== */
  function prep(x) {
    if (!x._c) { x._c = x.codes.map(compacto); x._t = norm([x.brand, x.model].concat(x.alias || []).join(' ')); x._w = x._t.split(' '); x._n = x._t.replace(/ /g, ''); }
    return x;
  }
  function pontuar(x, qc, tokens) {
    prep(x);
    if (x._c.includes(qc)) return 100;
    if (qc.length >= 3 && x._c.some(c => c.startsWith(qc))) return 90;
    if (qc.length >= 4 && x._c.some(c => c.includes(qc))) return 70;
    if (tokens.length && tokens.every(t => x._w.some(p => p.startsWith(t)))) return 60;
    if (qc.length >= 3 && x._n.includes(qc)) return 40;
    return 0;
  }
  function buscar(q, limite, marca) {
    const qc = compacto(q), tokens = norm(q).split(' ').filter(Boolean);
    return todos()
      .filter(x => !marca || x.brand === marca)
      .map(x => ({ x: x, s: qc ? pontuar(x, qc, tokens) : 1 }))
      .filter(r => r.s > 0)
      .sort((a, b) => b.s - a.s || a.x.model.length - b.x.model.length)
      .slice(0, limite)
      .map(r => r.x);
  }
  function linkWeb(q) {
    const d = soDigitos(q);
    const termo = pareceImei(q) ? 'TAC ' + d.slice(0, 8) + ' celular modelo' : q + ' celular modelo codigo';
    return 'https://www.google.com/search?q=' + encodeURIComponent(termo); // só os 8 primeiros dígitos do IMEI saem do sistema
  }

  /* ===== 3b. BASE ONLINE (Android) ===== */
  const FONTES = [
    'https://cdn.jsdelivr.net/gh/androidtrackers/certified-android-devices@master/by_model.json',
    'https://raw.githubusercontent.com/androidtrackers/certified-android-devices/master/by_model.json'
  ];
  const SETE_DIAS = 7 * 24 * 3600 * 1000;
  let estadoBase = 'carregando', dataBase = 0;
  const idbAbrir = () => new Promise((ok, err) => { const r = indexedDB.open('oc-aparelhos', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => err(r.error); });
  const idbLer = async k => { const db = await idbAbrir(); return new Promise((ok, err) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => ok(q.result); q.onerror = () => err(q.error); }); };
  const idbGravar = async (k, v) => { const db = await idbAbrir(); return new Promise((ok, err) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = ok; t.onerror = () => err(t.error); }); };
  function compactar(json) {
    const canon = {};
    BASE.forEach(x => { canon[x.brand.toLowerCase()] = x.brand; });
    const grupos = new Map();
    Object.keys(json).forEach(modelo => {
      (json[modelo] || []).forEach(e => {
        const nomeMod = String(e.name || '').trim();
        const k0 = String(e.brand || '').trim().toLowerCase();
        if (!nomeMod || !k0) return;
        const brand = canon[k0] || (canon[k0] = marcaBonita(e.brand));
        const chave = brand + '|' + nomeMod.toLowerCase();
        let g = grupos.get(chave);
        if (!g) { g = [brand, nomeMod, []]; grupos.set(chave, g); }
        if (!g[2].includes(modelo)) g[2].push(modelo);
      });
    });
    return Array.from(grupos.values());
  }
  async function baixar() {
    for (const url of FONTES) {
      try { const r = await fetch(url, { cache: 'no-cache' }); if (r.ok) return await r.json(); } catch (e) { /* tenta a próxima fonte */ }
    }
    return null;
  }
  function mostrarStatus() {
    const el = $('deviceSearchStatus');
    if (!el) return;
    const d = dataBase ? new Date(dataBase).toLocaleDateString('pt-BR') : '';
    el.innerHTML = estadoBase === 'carregando' ? 'Baixando a base online de aparelhos…'
      : ONLINE.length ? 'Base online: ' + ONLINE.length.toLocaleString('pt-BR') + ' modelos Android (Google Play) + iPhones · atualizada em ' + d + ' · <a href="#" data-atualizar>Atualizar</a>'
      : 'Sem acesso à base online agora. Usando a base local. <a href="#" data-atualizar>Tentar de novo</a>';
  }
  function fimCarga(estado, data) {
    estadoBase = estado; if (data) dataBase = data; CATALOGO = null;
    mostrarStatus(); preencherMarcas();
    const m = $('deviceSearchModal');
    if (m && m.style.display === 'flex') window.pesquisarCatalogoAparelho();
  }
  async function carregarBase(forcar) {
    estadoBase = 'carregando'; mostrarStatus();
    let salvo = null;
    try { salvo = await idbLer('android'); } catch (e) { /* sem IndexedDB */ }
    if (salvo && salvo.dados && salvo.dados.length) { ONLINE = salvo.dados; dataBase = salvo.data; }
    if (!forcar && salvo && Date.now() - salvo.data < SETE_DIAS) { fimCarga('ok', salvo.data); return; }
    const json = await baixar();
    if (!json) { fimCarga('erro'); return; }
    ONLINE = compactar(json);
    const data = Date.now();
    try { await idbGravar('android', { data: data, dados: ONLINE }); } catch (e) { /* segue sem guardar */ }
    fimCarga('ok', data);
  }

  /* ===== 4. APRENDIZADO (a base cresce com o uso) ===== */
  function salvarExtra(item) {
    const lista = ler(CHAVE_EXTRA, []);
    lista.push(item);
    gravar(CHAVE_EXTRA, lista);
    CATALOGO = null;
  }
  function aprenderTac(tac, item) {
    const mapa = ler(CHAVE_TAC, {});
    mapa[tac] = { brand: item.brand || '', model: item.model };
    gravar(CHAVE_TAC, mapa);
  }
  function cadastrarCodigo(codigo, aplicar) {
    const resp = prompt('Marca e modelo do código ' + codigo + ' (ex.: Xiaomi Redmi Note 14):');
    if (!resp || !resp.trim()) return;
    const p = resp.trim().split(/\s+/);
    const item = { brand: p[0], model: p.slice(1).join(' ') || p[0], codes: [codigo.trim()], alias: [] };
    salvarExtra(item);
    aplicar(item);
    aviso(nome(item) + ' adicionado à base.');
  }

  /* ===== 5. ESTILO ===== */
  const css = document.createElement('style');
  css.textContent =
    '.dm-suggest{border:1px solid #334155;background:#0f172a;border-radius:10px;margin:-6px 0 12px;overflow:hidden}' +
    '.dm-suggest button{display:block;width:100%;text-align:left;background:transparent;color:#fff;padding:10px 12px;border-radius:0;font-size:13px;font-weight:600;border-bottom:1px solid #1e293b}' +
    '.dm-suggest button:last-child{border-bottom:0}.dm-suggest button:hover{background:#14334b}' +
    '.dm-suggest small{display:block;color:#94a3b8;font-weight:400;margin-top:2px}' +
    '.dm-note{padding:10px 12px;font-size:12px;color:#cbd5e1;line-height:1.5}.dm-note a{color:#38bdf8}' +
    '.dm-imei{display:block;margin:-6px 0 12px;font-size:12px;color:#94a3b8;min-height:0}';
  document.head.appendChild(css);
  const css3d = document.createElement('style');
  css3d.textContent =
    '.oc3d{width:44px;height:44px;flex-shrink:0;filter:drop-shadow(0 4px 5px rgba(0,0,0,.4))}' +
    '#deviceSearchModal{backdrop-filter:blur(6px)}' +
    '#deviceSearchModal .device-search-card{background:linear-gradient(165deg,#1c2d4a 0,#111c33 60%,#0d1629 100%);border-color:#3b4f72;box-shadow:0 -20px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08)}' +
    '#deviceSearchModal .device-search-head{justify-content:flex-start;gap:14px;margin-bottom:16px}' +
    '#deviceSearchModal .device-search-head .oc3d{width:54px;height:54px}' +
    '#deviceSearchModal .device-search-head h3{font-size:20px;letter-spacing:-.01em}' +
    '#deviceSearchModal .device-search-head .btn-close{margin-left:auto;width:36px;height:36px;border-radius:50%;background:#22324f;color:#cbd5e1;font-size:20px;float:none}' +
    '#deviceSearchModal .device-search-row input,#deviceSearchModal .device-search-row select{background:#0b1426;border-color:#3b4f72;border-radius:12px;padding:14px}' +
    '#deviceSearchModal .device-search-row input:focus{box-shadow:0 0 0 3px rgba(56,189,248,.25)}' +
    '#deviceSearchModal .device-result{gap:12px;padding:12px 14px;background:linear-gradient(180deg,#14223c,#0f1a2f);border-color:#2f4266;border-radius:14px;box-shadow:0 6px 14px rgba(0,0,0,.25)}' +
    '#deviceSearchModal .device-result:hover{border-color:#38bdf8}' +
    '#deviceSearchModal .device-result>div{flex:1;min-width:0}' +
    '#deviceSearchModal .device-result button{background:linear-gradient(180deg,#4ade80,#16a34a);color:#052e16;border-radius:10px;padding:11px 14px;font-size:12px;box-shadow:0 3px 0 #166534,0 6px 10px rgba(0,0,0,.3)}' +
    '#deviceSearchModal .device-result button:active{transform:translateY(2px);box-shadow:0 1px 0 #166534}' +
    '.oc-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#0b1426;border:1px solid #2f4266;border-radius:6px;padding:1px 6px;color:#7dd3fc;font-size:11.5px}' +
    '#deviceSearchModal .device-empty{padding:26px 16px}#deviceSearchModal .device-empty .oc3d{width:64px;height:64px;display:block;margin:0 auto 8px}' +
    '#deviceSearchModal .device-search-tools button,#deviceSearchModal .device-search-tools a{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:8px 14px}' +
    '#deviceSearchModal .device-search-tools .oc3d{width:22px;height:22px;filter:none}' +
    '.btn-search-action .oc3d,.side-nav .oc3d{width:22px!important;height:22px!important;filter:drop-shadow(0 2px 2px rgba(0,0,0,.4))}' +
    '.dm-suggest button{display:flex;align-items:center;gap:10px}.dm-suggest .oc3d{width:32px;height:32px}';
  document.head.appendChild(css3d);

  /* ===== 6. CAMPO "MODELO DO APARELHO" (OS) ===== */
  function iniciarCampo() {
    const campo = $('deviceModel');
    if (!campo || $('deviceModelSuggest')) return;
    const caixa = document.createElement('div');
    caixa.id = 'deviceModelSuggest';
    caixa.className = 'dm-suggest';
    caixa.hidden = true;
    campo.insertAdjacentElement('afterend', caixa);
    let atuais = [];

    function aplicar(item) {
      campo.value = nome(item);
      campo.dataset.deviceCode = item.codes && item.codes[0] ? item.codes[0] : '';
      caixa.hidden = true;
    }
    function atualizar() {
      const q = campo.value.trim();
      if (q.length < 2) { caixa.hidden = true; return; }
      let html = '';
      atuais = [];
      if (pareceImei(q)) {
        const d = soDigitos(q);
        if (d.length === 15 && !luhn(d)) {
          html += '<p class="dm-note">IMEI inválido. Confira os dígitos.</p>';
        } else {
          const t = tacInfo(d);
          if (t) { atuais.push({ brand: t.brand, model: t.model, codes: [], alias: [] }); }
          else html += '<p class="dm-note">IMEI válido, mas esse modelo ainda não está na base. Digite o modelo: ele será aprendido quando você salvar a OS. <a href="' + linkWeb(q) + '" target="_blank" rel="noopener">Pesquisar na internet</a></p>';
        }
      } else {
        atuais = buscar(q, 8);
      }
      html = atuais.map((x, i) => '<button type="button" data-i="' + i + '">' + iconeAparelho(x.brand) + '<span>' + esc(nome(x)) + (x.codes && x.codes[0] ? '<small>Código: ' + esc(x.codes[0]) + (x.info ? ' · ' + esc(x.info) : '') + (x.fonte ? ' · ' + esc(x.fonte) : '') + '</small>' : '<small>Encontrado pelo IMEI</small>') + '</span></button>').join('') + html;
      if (!atuais.length && !pareceImei(q)) {
        html += '<p class="dm-note">Nada encontrado na base. <a href="' + linkWeb(q) + '" target="_blank" rel="noopener">Pesquisar na internet</a>' +
          (pareceCodigo(q) ? ' · <a href="#" data-novo="1">Cadastrar este código na base</a>' : '') + '</p>';
      }
      caixa.innerHTML = html;
      caixa.hidden = !html;
    }
    caixa.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (b) { aplicar(atuais[+b.dataset.i]); campo.focus(); return; }
      if (e.target.closest('[data-novo]')) { e.preventDefault(); cadastrarCodigo(campo.value.trim(), aplicar); }
    });
    campo.addEventListener('input', () => { delete campo.dataset.deviceCode; atualizar(); });
    campo.addEventListener('change', () => {
      const qc = compacto(campo.value);
      const exato = qc.length >= 4 && todos().find(x => x.codes.some(c => compacto(c) === qc));
      if (exato) aplicar(exato);
    });
    document.addEventListener('click', e => { if (e.target !== campo && !caixa.contains(e.target)) caixa.hidden = true; });

    /* IMEI: valida, sugere o modelo e aprende ao salvar */
    const imei = $('deviceIMEI');
    if (imei) {
      const dica = document.createElement('small');
      dica.className = 'dm-imei';
      imei.insertAdjacentElement('afterend', dica);
      imei.addEventListener('input', () => {
        dica.textContent = '';
        if (!/^\d{15}$/.test(imei.value.replace(/[\s-]/g, ''))) return; // outros tamanhos podem ser número de série
        const d = soDigitos(imei.value);
        if (!luhn(d)) { dica.textContent = 'IMEI inválido: confira os dígitos.'; return; }
        const t = tacInfo(d);
        dica.textContent = t ? 'IMEI válido · ' + nome(t) : 'IMEI válido';
        if (t && !campo.value.trim()) campo.value = nome(t);
      });
    }
    const form = $('osForm');
    if (form) form.addEventListener('submit', () => {
      const d = imei ? soDigitos(imei.value) : '';
      const modelo = campo.value.trim();
      if (d.length !== 15 || !luhn(d) || !modelo) return;
      const item = todos().find(x => x.codes.includes(campo.dataset.deviceCode)) || { brand: '', model: modelo };
      aprenderTac(d, item);
    });
  }

  /* ===== 7. JANELA "PESQUISAR MODELO" ===== */
  function preencherMarcas() {
    const s = $('deviceSearchBrand');
    if (!s) return;
    const atual = s.value;
    while (s.options.length > 1) s.remove(1);
    const cont = {};
    todos().forEach(x => { cont[x.brand] = (cont[x.brand] || 0) + 1; });
    Object.keys(cont).filter(b => cont[b] >= 25 || BASE.some(x => x.brand === b)).sort((a, b) => a.localeCompare(b)).forEach(b => s.add(new Option(b, b)));
    s.value = atual;
  }
  window.abrirPesquisaAparelho = function () {
    preencherMarcas();
    $('deviceSearchModal').style.display = 'flex';
    $('deviceSearchQuery').focus();
    window.pesquisarCatalogoAparelho();
  };
  window.fecharPesquisaAparelho = function () { $('deviceSearchModal').style.display = 'none'; limparFoto(); };
  window.pesquisarCatalogoAparelho = function () {
    const q = $('deviceSearchQuery').value.trim();
    const lista = buscar(q, 30, $('deviceSearchBrand').value);
    listaModal = lista;
    const web = $('deviceSearchWeb');
    if (web) web.href = q ? linkWeb(q) : '#';
    $('deviceSearchResults').innerHTML = lista.length
      ? lista.map((x, i) => '<article class="device-result">' + iconeAparelho(x.brand) + '<div><strong>' + esc(nome(x)) + '</strong><small>Código técnico: <code class="oc-code">' + esc(codigosCurtos(x)) + '</code></small>' + (x.info ? '<small>Observação: ' + esc(x.info) + '</small>' : '') + '<small>Fonte: ' + esc(x.fonte || '') + '</small></div><button type="button" data-i="' + i + '">Usar na OS</button></article>').join('')
      : '<div class="device-empty">' + ICONE.lupa + 'Nenhum modelo encontrado. Use “Pesquisar na internet” para consultar outros códigos.</div>';
  };
  window.usarAparelhoNaOS = function (ref) {
    const x = typeof ref === 'object' ? ref : todos().find(i => i.codes.includes(ref));
    if (!x) return;
    if (typeof abrirModalOS === 'function') abrirModalOS();
    const campo = $('deviceModel');
    if (campo) { campo.value = nome(x); campo.dataset.deviceCode = x.codes[0]; campo.focus(); }
    window.fecharPesquisaAparelho();
    aviso(nome(x) + ' preenchido na OS.');
  };
  let urlFoto = '';
  function limparFoto() {
    if (urlFoto) { URL.revokeObjectURL(urlFoto); urlFoto = ''; }
    const box = $('deviceSearchPhoto');
    if (box) box.remove();
  }
  window.avisarPesquisaFoto = function () {
    const entrada = $('devicePhotoSearch');
    const arq = entrada.files && entrada.files[0];
    if (!arq) return;
    limparFoto();
    urlFoto = URL.createObjectURL(arq);
    const box = document.createElement('div');
    box.id = 'deviceSearchPhoto';
    box.className = 'dm-note';
    box.style.cssText = 'border:1px solid #334155;border-radius:12px;background:#0f172a;margin-bottom:10px;display:flex;gap:12px;align-items:flex-start';
    box.innerHTML = '<img alt="Foto do aparelho" src="' + urlFoto + '" style="width:84px;height:84px;object-fit:cover;border-radius:8px;flex-shrink:0">' +
      '<div><strong style="color:#fff">A foto ajuda só a comparar</strong><br>O sistema não identifica o modelo sozinho pela foto, porque várias linhas usam tampa e câmeras parecidas. ' +
      'Confirme pelo código técnico: Configurações › Sobre o telefone › Número do modelo (Android); Ajustes › Geral › Sobre (iPhone; toque em Número do modelo para ver o código Axxxx); ou na etiqueta da caixa e na bandeja do chip.</div>';
    $('deviceSearchResults').insertAdjacentElement('beforebegin', box);
    entrada.value = '';
  };

  function iniciar() {
    iniciarCampo();
    if (!$('ocSprite')) {
      const d = document.createElement('div');
      d.id = 'ocSprite';
      d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      d.innerHTML = '<svg width="0" height="0" aria-hidden="true"><defs>' +
        '<linearGradient id="ocBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#0369a1"/></linearGradient>' +
        '<linearGradient id="ocDark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#64748b"/><stop offset="1" stop-color="#1e293b"/></linearGradient>' +
        '<linearGradient id="ocPurple" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c4b5fd"/><stop offset="1" stop-color="#6d28d9"/></linearGradient>' +
        '<linearGradient id="ocShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>' +
        '</defs></svg>';
      document.body.appendChild(d);
    }
    const cab = document.querySelector('#deviceSearchModal .device-search-head');
    if (cab && !cab.querySelector('.oc3d')) cab.insertAdjacentHTML('afterbegin', ICONE.lupa);
    const fotoBtn = document.querySelector('#deviceSearchModal .device-search-tools .photo');
    if (fotoBtn) fotoBtn.innerHTML = ICONE.camera + '<span>Tentar por foto</span>';
    const res = $('deviceSearchResults');
    if (res) res.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (b) window.usarAparelhoNaOS(listaModal[+b.dataset.i]);
    });
    const linhaBusca = document.querySelector('#deviceSearchModal .device-search-row');
    if (linhaBusca && !$('deviceSearchStatus')) {
      linhaBusca.insertAdjacentHTML('afterend', '<p id="deviceSearchStatus" class="dm-note" style="padding:2px 2px 10px"></p>');
      $('deviceSearchStatus').addEventListener('click', e => { if (e.target.closest('[data-atualizar]')) { e.preventDefault(); carregarBase(true); } });
    }
    carregarBase(false);
    const titulo = document.querySelector('#deviceSearchModal h3');
    if (titulo) titulo.textContent = 'Pesquisa de aparelho';
    const menu = document.querySelector('.side-nav');
    if (menu && !$('deviceSearchNav')) {
      const n = document.createElement('button');
      n.id = 'deviceSearchNav';
      n.type = 'button';
      n.innerHTML = ICONE.lupa + ' Pesquisa de aparelho';
      n.onclick = window.abrirPesquisaAparelho;
      menu.insertBefore(n, menu.children[3] || null);
    }
    const barra = document.querySelector('.action-bar');
    if (barra && !$('deviceSearchButton')) {
      const b = document.createElement('button');
      b.id = 'deviceSearchButton';
      b.type = 'button';
      b.className = 'btn-search-action';
      b.innerHTML = ICONE.lupa + '<span>Pesquisar modelo</span>';
      b.onclick = window.abrirPesquisaAparelho;
      barra.appendChild(b);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
