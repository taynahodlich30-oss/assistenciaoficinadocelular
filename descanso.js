/* Tela de descanso - Oficina do Celular
   Mostra o vídeo dos serviços (descanso.mp4) em tela cheia quando o painel fica parado
   por alguns minutos, ou na hora pelo menu "Tela de descanso". Qualquer toque, clique
   ou tecla volta para o painel exatamente onde estava. */
(function () {
  'use strict';
  const MINUTOS = 3;                       // tempo parado até a tela de descanso aparecer
  const VIDEO = 'descanso.mp4?v=1';
  let timer = null, ativo = false, tela = null, video = null, liberadoEm = 0;

  const css = document.createElement('style');
  css.textContent =
    '#descanso{position:fixed;inset:0;z-index:5000;background:#0b1210;display:none;cursor:none;touch-action:none}' +
    '#descanso.on{display:block;animation:descIn .6s ease}' +
    '#descanso video{width:100%;height:100%;object-fit:cover;display:block}' +
    '#descanso .desc-dica{position:absolute;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translateX(-50%);padding:8px 16px;border-radius:999px;background:#0b1210b3;color:#b9cbc1;font:600 13px/1.2 "Plus Jakarta Sans",system-ui,sans-serif;opacity:0;transition:opacity .4s;pointer-events:none}' +
    '#descanso.dica .desc-dica{opacity:1}' +
    '@keyframes descIn{from{opacity:0}}';
  document.head.appendChild(css);

  function criar() {
    if (tela) return;
    tela = document.createElement('div');
    tela.id = 'descanso';
    tela.setAttribute('aria-hidden', 'true');
    tela.innerHTML = '<video muted loop playsinline preload="none"></video><span class="desc-dica">Toque para voltar ao painel</span>';
    document.body.appendChild(tela);
    video = tela.querySelector('video');
    // O primeiro toque só fecha a tela de descanso; não clica no que está por baixo
    ['pointerdown', 'touchstart', 'mousedown', 'click', 'wheel'].forEach(ev =>
      tela.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); sair(); }, { passive: false }));
  }

  function painelAberto() {
    const app = document.getElementById('appScreen');
    return !!app && app.style.display !== 'none' && getComputedStyle(app).display !== 'none';
  }

  function entrar(telaCheia) {
    if (ativo || !painelAberto()) return;
    criar();
    if (!video.src) video.src = VIDEO;
    ativo = true;
    tela.classList.add('on');
    video.currentTime = 0;
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
    if (telaCheia && document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  function sair() {
    if (!ativo) return;
    ativo = false;
    liberadoEm = Date.now();
    // Evita que o clique que fechou a tela de descanso caia num botão do painel
    const bloquear = e => { e.preventDefault(); e.stopPropagation(); };
    document.addEventListener('click', bloquear, true);
    setTimeout(() => document.removeEventListener('click', bloquear, true), 450);
    tela.classList.remove('on', 'dica');
    video.pause();
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    reiniciar();
  }

  function reiniciar() {
    clearTimeout(timer);
    timer = setTimeout(() => entrar(false), MINUTOS * 60 * 1000);
  }

  function mexeu() {
    if (ativo) {
      // Mouse se mexendo de leve só mostra a dica; clique, toque ou tecla fecham
      tela.classList.add('dica');
      clearTimeout(mexeu.t);
      mexeu.t = setTimeout(() => tela && tela.classList.remove('dica'), 2500);
      return;
    }
    if (Date.now() - liberadoEm < 300) return;
    reiniciar();
  }
  ['mousemove', 'pointerdown', 'keydown', 'scroll', 'touchstart', 'input'].forEach(ev =>
    document.addEventListener(ev, mexeu, { passive: true, capture: true }));
  document.addEventListener('keydown', () => { if (ativo) sair(); }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden && ativo) sair(); });

  window.abrirTelaDescanso = function () {
    if (typeof fecharMenuMais === 'function') fecharMenuMais();
    setTimeout(() => entrar(true), 50);
  };

  /* Botões no menu lateral (computador) e no menu "Mais" (celular) */
  function icone() {
    return '<svg class="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m10 8 4 2.5-4 2.5z"/></svg>';
  }
  function botoes() {
    const nav = document.querySelector('.side-nav');
    if (nav && !document.getElementById('descansoNav')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'descansoNav';
      b.innerHTML = icone() + ' Tela de descanso';
      b.addEventListener('click', window.abrirTelaDescanso);
      nav.appendChild(b);
    }
    const lista = document.querySelector('#moreModal .menu-list');
    if (lista && !document.getElementById('descansoMais')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'descansoMais';
      b.innerHTML = '<span class="menu-icon">' + icone() + '</span>Tela de descanso<svg class="ui-icon chev" aria-hidden="true"><use href="icons.svg?v=6#chevron-right"></use></svg>';
      b.addEventListener('click', window.abrirTelaDescanso);
      lista.insertBefore(b, lista.querySelector('.danger'));
    }
  }

  function iniciar() { botoes(); reiniciar(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
