/* Aparelhos esquecidos - Oficina do Celular
   Mostra na tela inicial as OS prontas há muitos dias que ainda não foram retiradas
   (sem garantia enviada) e permite lembrar o cliente pelo WhatsApp com um clique.
   O lembrete fica registrado na OS (lembreteRetiradaEm / lembretesRetirada). */
(function () {
  'use strict';
  const CHAVE_DIAS = 'oc_dias_esquecido';
  const diasLimite = () => { const n = Number(localStorage.getItem(CHAVE_DIAS)); return n >= 1 && n <= 365 ? n : 30; };
  const DIA = 86400000;

  const css = document.createElement('style');
  css.textContent =
    '.forgot-list{display:flex;flex-direction:column;background:var(--surface);border:1px solid #fbbf2440;border-radius:var(--r-lg);overflow:hidden}' +
    '.forgot-row{display:flex;align-items:center;gap:14px;padding:13px 16px;border-bottom:1px solid var(--line)}' +
    '.forgot-row:last-child{border-bottom:0}' +
    '.forgot-days{display:grid;place-items:center;flex:none;width:58px;height:58px;border-radius:14px;background:#fbbf241a;border:1px solid #fbbf2440;color:var(--warn);font-size:11px;font-weight:700;line-height:1.1;text-transform:uppercase}' +
    '.forgot-days b{font-size:20px;font-variant-numeric:tabular-nums}' +
    '.forgot-row.is-late .forgot-days{background:#ef44441a;border-color:#ef444440;color:var(--danger)}' +
    '.forgot-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}' +
    '.forgot-main b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.forgot-main small{font-size:12.5px;color:var(--muted)}' +
    '.forgot-main .forgot-last{color:var(--text-2)}' +
    '.forgot-btn{flex:none;display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:0 14px;border-radius:var(--r-sm);border:1px solid #1f6b44;background:#123424;color:#b7f7cf;font-size:13px;font-weight:700}' +
    '.forgot-btn:hover{background:#164430}.forgot-btn .ui-icon{width:16px;height:16px}' +
    '.forgot-nophone{font-size:12px;color:var(--muted)}' +
    '.forgot-prazo{color:var(--accent);font-size:12.5px;font-weight:600;text-decoration:underline;margin-left:8px}' +
    '@media(max-width:760px){.forgot-row{flex-wrap:wrap}.forgot-btn{width:100%;justify-content:center}#esquecidosSection .section-head .section-note{display:inline}}';
  document.head.appendChild(css);

  const esc = s => (typeof escaparHtml === 'function' ? escaparHtml(s) : String(s ?? ''));
  const brl = v => (typeof formatarBRL === 'function' ? formatarBRL(v) : 'R$ ' + Number(v || 0).toFixed(2));
  const icone = id => '<svg class="ui-icon" aria-hidden="true"><use href="icons.svg?v=7#' + id + '"></use></svg>';

  function prontoDesde(os) {
    const d = typeof dataDaEtapa === 'function' ? dataDaEtapa(os, 'Pronto') : null;
    return d && !isNaN(d) ? d : null;
  }
  function diasParado(os) {
    const d = prontoDesde(os);
    if (!d) return 0;
    return typeof diasDesdeData === 'function' ? diasDesdeData(d) : Math.floor((Date.now() - d) / DIA);
  }
  function telefone(os) {
    let n = String(os.whatsapp || '').replace(/\D/g, '');
    if (n.length === 10 || n.length === 11) n = '55' + n;
    return n.length >= 12 && n.length <= 15 ? n : '';
  }
  function mensagem(os, dias) {
    const nome = String(os.cliente || '').trim().split(/\s+/)[0];
    return 'Olá' + (nome ? ', ' + nome : '') + '! Seu ' + (os.modelo || 'aparelho') + ' (OS ' + os.idOS + ') está pronto e aguardando retirada há ' + dias + ' dias. ' +
      'Pode passar na Oficina do Celular, Rua Tiradentes, 948, de segunda a sexta das 8h às 18h ou sábado das 9h às 13h. Qualquer dúvida, é só chamar aqui!';
  }
  function quando(os) {
    if (!os.lembreteRetiradaEm) return 'Ainda não foi lembrado';
    const d = Math.floor((Date.now() - new Date(os.lembreteRetiradaEm).getTime()) / DIA);
    const n = Number(os.lembretesRetirada) || 1;
    return 'Lembrado ' + (d <= 0 ? 'hoje' : d === 1 ? 'ontem' : 'há ' + d + ' dias') + (n > 1 ? ' · ' + n + ' lembretes' : '');
  }

  function desenhar() {
    const visao = document.getElementById('overviewSection');
    if (!visao || typeof ordensServico === 'undefined') return;
    let sec = document.getElementById('esquecidosSection');
    const limite = diasLimite();
    const lista = ordensServico
      .filter(os => os.status === 'Pronto' && !os.garantiaToken && diasParado(os) >= limite)
      .sort((a, b) => diasParado(b) - diasParado(a));
    if (!lista.length) { if (sec) sec.remove(); return; }
    if (!sec) {
      sec = document.createElement('section');
      sec.id = 'esquecidosSection';
      sec.className = 'section';
      visao.insertAdjacentElement('afterend', sec);
      sec.addEventListener('click', clique);
    }
    sec.innerHTML = '<div class="section-head"><h2>Aparelhos esquecidos</h2><span class="section-note">Prontos há ' + limite + ' dias ou mais<button type="button" class="forgot-prazo" data-prazo>alterar prazo</button></span></div>' +
      '<div class="forgot-list">' + lista.map(os => {
        const d = diasParado(os), desde = prontoDesde(os);
        return '<div class="forgot-row' + (d >= limite * 2 ? ' is-late' : '') + '"><span class="forgot-days"><b>' + d + '</b>dias</span>' +
          '<div class="forgot-main"><b>' + esc(os.cliente || 'Cliente') + ' · ' + esc(os.modelo || 'Aparelho') + '</b>' +
          '<small>' + esc(os.idOS) + (desde ? ' · pronto desde ' + desde.toLocaleDateString('pt-BR') : '') + ' · ' + brl(os.valor) + '</small>' +
          '<small class="forgot-last">' + quando(os) + '</small></div>' +
          (telefone(os) ? '<button type="button" class="forgot-btn" data-lembrar="' + esc(os.idDoc) + '">' + icone('whatsapp') + ' Lembrar cliente</button>'
                        : '<span class="forgot-nophone">Sem WhatsApp na OS</span>') + '</div>';
      }).join('') + '</div>';
  }

  async function clique(e) {
    if (e.target.closest('[data-prazo]')) {
      const r = prompt('Depois de quantos dias pronto o aparelho conta como esquecido?', String(diasLimite()));
      if (r === null) return;
      const n = Math.round(Number(r));
      if (!(n >= 1 && n <= 365)) { alert('Digite um número de 1 a 365.'); return; }
      localStorage.setItem(CHAVE_DIAS, String(n));
      desenhar();
      return;
    }
    const b = e.target.closest('[data-lembrar]');
    if (!b) return;
    const os = ordensServico.find(o => o.idDoc === b.dataset.lembrar);
    if (!os) return;
    const num = telefone(os), dias = diasParado(os);
    if (!num) return;
    // Abre o WhatsApp primeiro (dentro do clique) para o navegador não bloquear a janela
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(mensagem(os, dias)), '_blank');
    const dados = { lembreteRetiradaEm: new Date().toISOString(), lembretesRetirada: (Number(os.lembretesRetirada) || 0) + 1 };
    Object.assign(os, dados);
    desenhar();
    try {
      if (typeof db !== 'undefined' && db && os.idDoc) await db.collection('ordens_servico').doc(os.idDoc).update(dados);
    } catch (err) {
      if (typeof avisar === 'function') avisar('O WhatsApp abriu, mas não consegui registrar o lembrete. Confira a internet.', true);
    }
  }

  if (typeof atualizarAtencao === 'function') {
    const original = atualizarAtencao;
    atualizarAtencao = function () {
      const r = original.apply(this, arguments);
      try { desenhar(); } catch (e) { /* não atrapalha o painel */ }
      return r;
    };
  }
  try { desenhar(); } catch (e) { /* ainda sem dados */ }
})();
