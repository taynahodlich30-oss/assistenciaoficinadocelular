/* =========================================================
   Oficina do Celular · Recursos do painel
   1. Fotos (compressão)            4. Link de acompanhamento
   2. Numeração sequencial da OS    5. Clientes
   3. Histórico de etapas           6. Relatórios por mês
   Carregado depois de script.js.
   ========================================================= */

/* ---------- 1. Fotos ---------- */
const FOTO_LADO_MAX = 1280;
const FOTO_QUALIDADE = 0.72;
const FOTOS_MAX = 6;
const LIMITE_OS_BYTES = 1000000; // o Firebase aceita até 1 MB por OS
let processandoFotos = false;

function comprimirImagem(arquivo) {
    return new Promise(function (resolve, reject) {
        const url = URL.createObjectURL(arquivo);
        const img = new Image();
        img.onload = function () {
            const escala = Math.min(1, FOTO_LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
            const largura = Math.max(1, Math.round(img.naturalWidth * escala));
            const altura = Math.max(1, Math.round(img.naturalHeight * escala));
            const tela = document.createElement('canvas');
            tela.width = largura;
            tela.height = altura;
            const contexto = tela.getContext('2d');
            contexto.fillStyle = '#fff';
            contexto.fillRect(0, 0, largura, altura);
            contexto.drawImage(img, 0, 0, largura, altura);
            URL.revokeObjectURL(url);
            resolve(tela.toDataURL('image/jpeg', FOTO_QUALIDADE));
        };
        img.onerror = function () {
            URL.revokeObjectURL(url);
            reject(new Error('Formato de imagem não suportado'));
        };
        img.src = url;
    });
}

function tamanhoEmBytes(objeto) {
    return new Blob([JSON.stringify(objeto)]).size;
}

function formatarMB(bytes) {
    return (bytes / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' MB';
}

/* ---------- 2. Numeração sequencial ---------- */
function proximoNumeroOS(salto) {
    let maior = 0;
    ordensServico.forEach(function (os) {
        const m = /^OS-(\d{4,5})$/.exec(String(os.idOS || ''));
        if (m) maior = Math.max(maior, Number(m[1]));
    });
    const numero = Math.max(maior, ordensServico.length) + 1 + (salto || 0);
    return 'OS-' + String(numero).padStart(4, '0');
}

/* ---------- 3. Histórico de etapas ---------- */
const ETAPAS = ['Em análise', 'Em orçamento', 'Em reparo', 'Pronto'];

function entradaHistorico(status) {
    return { status: status, data: new Date().toISOString() };
}

function dataDaEtapa(os, status) {
    const lista = Array.isArray(os.historico) ? os.historico : [];
    for (let i = lista.length - 1; i >= 0; i--) {
        if (lista[i].status === status && lista[i].data) return new Date(lista[i].data);
    }
    return os.status === status ? dataDaOS(os) : null;
}

function diasDesdeData(data) {
    if (!data || isNaN(data)) return 0;
    const inicio = new Date(data); inicio.setHours(0, 0, 0, 0);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((hoje - inicio) / 86400000));
}

function formatarDataHora(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function linhaDoTempoHTML(os) {
    const lista = Array.isArray(os.historico) ? os.historico : [];
    const itens = ['<li class="tl-item done"><span class="tl-dot"></span><b>Entrada</b><small>' + escaparHtml(os.criadoEm ? formatarDataHora(os.criadoEm) : (os.data || '-')) + '</small></li>'];
    lista.forEach(function (h, i) {
        if (i === 0 && os.criadoEm && h.data === os.criadoEm && h.status === 'Em análise') return;
        itens.push('<li class="tl-item done" data-s="' + escaparHtml(h.status) + '"><span class="tl-dot"></span><b>' + escaparHtml(h.status) + '</b><small>' + escaparHtml(formatarDataHora(h.data)) + '</small></li>');
    });
    if (!lista.length) itens.push('<li class="tl-item" data-s="' + escaparHtml(os.status || '') + '"><span class="tl-dot"></span><b>' + escaparHtml(os.status || 'Sem etapa') + '</b><small>Etapa atual</small></li>');
    return '<ol class="timeline">' + itens.join('') + '</ol>' + (lista.length ? '' : '<p class="form-hint">As datas de cada etapa passam a ser registradas nas próximas mudanças desta OS.</p>');
}

/* ---------- 4. Link de acompanhamento ---------- */
// Os dados públicos ficam em garantias_publicas (a única coleção com leitura pública
// pelas regras atuais do Firebase), marcados com tipo "acompanhamento".
function novoTokenPublico() {
    return Array.from(crypto.getRandomValues(new Uint8Array(24)), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

function primeiroNome(nome) {
    return String(nome || '').trim().split(/\s+/)[0] || '';
}

function dadosPublicosAcompanhamento(os) {
    return {
        tipo: 'acompanhamento',
        idOS: String(os.idOS || ''),
        modelo: String(os.modelo || ''),
        defeito: String(os.defeito || ''),
        cliente: primeiroNome(os.cliente),
        status: String(os.status || ''),
        entrada: String(os.data || ''),
        etapas: (Array.isArray(os.historico) ? os.historico : []).map(function (h) { return { status: String(h.status || ''), data: String(h.data || '') }; }),
        valor: Number(os.valor || 0),
        restante: saldoAReceber(os),
        atualizadoEm: new Date().toISOString()
    };
}

function sincronizarAcompanhamento(os) {
    if (!os || !os.acompanhamentoToken || !db) return;
    db.collection('garantias_publicas').doc(os.acompanhamentoToken).set(dadosPublicosAcompanhamento(os)).catch(function () {});
}

function removerAcompanhamento(os) {
    if (!os || !os.acompanhamentoToken || !db) return;
    db.collection('garantias_publicas').doc(os.acompanhamentoToken).delete().catch(function () {});
}

function linkAcompanhamento(os) {
    if (!os || !os.acompanhamentoToken) return '';
    const pagina = new URL('acompanhe.html', location.href);
    pagina.searchParams.set('c', codigoCurtoGarantia(os.acompanhamentoToken));
    return pagina.href;
}

async function enviarAcompanhamento(osId) {
    const os = ordensServico.find(function (item) { return item.idOS === osId; });
    if (!os) return;
    let numero;
    try { numero = telefoneGarantiaWhatsApp(os.whatsapp); }
    catch (e) { avisar(e.message, true); return; }
    const janela = window.open('about:blank', '_blank');
    if (!janela) { avisar('Permita abrir janelas neste site para enviar pelo WhatsApp.', true); return; }
    try {
        if (!db || !os.idDoc) throw new Error('Esta OS ainda não está salva no Firebase.');
        const token = os.acompanhamentoToken || novoTokenPublico();
        const lote = db.batch();
        lote.set(db.collection('garantias_publicas').doc(token), dadosPublicosAcompanhamento(os));
        if (!os.acompanhamentoToken) lote.update(db.collection('ordens_servico').doc(os.idDoc), { acompanhamentoToken: token });
        await lote.commit();
        os.acompanhamentoToken = token;
        localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));
        const nome = primeiroNome(os.cliente);
        const texto = '*OFICINA DO CELULAR*\n\nOlá' + (nome ? ', ' + nome : '') + '! Acompanhe o reparo do seu *' + os.modelo + '* (' + os.idOS + ') por este link. Ele é atualizado sempre que o serviço muda de etapa:\n\n' + linkAcompanhamento(os);
        janela.location.href = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
        atualizarPainel();
    } catch (e) {
        janela.close();
        avisar('Não foi possível criar o link de acompanhamento. ' + (e && e.message ? e.message : 'Verifique sua conexão.'), true);
    }
}

async function copiarLinkAcompanhamento(osId) {
    const os = ordensServico.find(function (item) { return item.idOS === osId; });
    const link = linkAcompanhamento(os);
    if (!link) return;
    try { await navigator.clipboard.writeText(link); avisar('Link de acompanhamento copiado.'); }
    catch (e) { prompt('Copie o link de acompanhamento:', link); }
}

/* ---------- 5. Clientes ---------- */
function normalizarTelefone(telefone) {
    let digitos = String(telefone || '').replace(/\D/g, '');
    if (digitos.length > 11 && digitos.indexOf('55') === 0) digitos = digitos.slice(2);
    return digitos;
}

function formatarTelefone(telefone) {
    const d = normalizarTelefone(telefone);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return String(telefone || '');
}

function agruparClientes() {
    const mapa = new Map();
    ordensServico.forEach(function (os) {
        const tel = normalizarTelefone(os.whatsapp);
        const chave = tel || ('sem-telefone-' + String(os.cliente || '').toLowerCase().trim());
        let cliente = mapa.get(chave);
        if (!cliente) {
            cliente = { chave: chave, telefone: os.whatsapp || '', nome: os.cliente || 'Sem nome', ordens: [], total: 0, aReceber: 0, ultima: null };
            mapa.set(chave, cliente);
        }
        cliente.ordens.push(os);
        cliente.total += Number(os.valor || 0);
        cliente.aReceber += saldoAReceber(os);
        const d = dataDaOS(os);
        if (d && (!cliente.ultima || d >= cliente.ultima)) {
            cliente.ultima = d;
            if (os.cliente) cliente.nome = os.cliente;
            if (os.whatsapp) cliente.telefone = os.whatsapp;
        }
    });
    const lista = Array.from(mapa.values());
    lista.forEach(function (c) { c.ordens.sort(function (a, b) { return (dataDaOS(b) || 0) - (dataDaOS(a) || 0); }); });
    return lista.sort(function (a, b) { return (b.ultima || 0) - (a.ultima || 0); });
}

function iniciais(nome) {
    const partes = String(nome || '?').trim().split(/\s+/);
    return ((partes[0] || '?').charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : '')).toUpperCase();
}

let clientesCache = [];

function abrirModalClientes() {
    clientesCache = agruparClientes();
    document.getElementById('clientSearch').value = '';
    renderizarClientes();
    document.getElementById('clientsModal').style.display = 'flex';
}
function fecharModalClientes() { document.getElementById('clientsModal').style.display = 'none'; }

function renderizarClientes() {
    const termo = document.getElementById('clientSearch').value.trim().toLocaleLowerCase('pt-BR');
    const termoTel = termo.replace(/\D/g, '');
    const lista = clientesCache.filter(function (c) {
        if (!termo) return true;
        return c.nome.toLocaleLowerCase('pt-BR').indexOf(termo) !== -1 || (termoTel && normalizarTelefone(c.telefone).indexOf(termoTel) !== -1);
    });
    document.getElementById('clientsCount').textContent = clientesCache.length + (clientesCache.length === 1 ? ' cliente' : ' clientes') + (termo ? ' · ' + lista.length + ' encontrado' + (lista.length === 1 ? '' : 's') : '');
    const alvo = document.getElementById('clientList');
    if (!lista.length) {
        alvo.innerHTML = '<div class="empty-state"><span class="empty-icon">' + ICO('users') + '</span><h3>' + (clientesCache.length ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda') + '</h3><p>' + (clientesCache.length ? 'Tente outro nome ou telefone.' : 'Os clientes aparecem aqui assim que você cadastra a primeira OS.') + '</p></div>';
        return;
    }
    alvo.innerHTML = lista.map(function (c, i) {
        const ordens = c.ordens.map(function (os) {
            return '<li class="client-os" data-status="' + escaparHtml(os.status || '') + '"><span class="os-code">' + escaparHtml(os.idOS) + '</span><span class="client-os-main">' + escaparHtml(os.modelo || '-') + '<small>' + escaparHtml(os.data || '') + ' · ' + escaparHtml(os.defeito || '') + '</small></span><span class="status-chip">' + escaparHtml(os.status || '-') + '</span><span class="os-value">' + formatarBRL(os.valor) + '</span></li>';
        }).join('');
        return '<details class="client-row"><summary class="client-summary">' +
            '<span class="avatar">' + escaparHtml(iniciais(c.nome)) + '</span>' +
            '<span class="client-main"><b>' + escaparHtml(c.nome) + '</b><small>' + escaparHtml(formatarTelefone(c.telefone) || 'Sem telefone') + ' · ' + c.ordens.length + (c.ordens.length === 1 ? ' OS' : ' OS') + '</small></span>' +
            '<span class="client-side"><b>' + formatarBRL(c.total) + '</b><small>' + (c.aReceber > 0 ? 'Falta receber ' + formatarBRL(c.aReceber) : (c.ultima ? 'Última visita ' + c.ultima.toLocaleDateString('pt-BR') : '')) + '</small></span>' +
            '</summary><div class="client-body"><ol class="client-os-list">' + ordens + '</ol>' +
            '<div class="os-actions"><button type="button" class="btn btn-primary" data-cli="nova" data-i="' + i + '">' + ICO('plus') + ' Nova OS para este cliente</button>' +
            (normalizarTelefone(c.telefone) ? '<button type="button" class="btn btn-wa" data-cli="whats" data-i="' + i + '">' + ICO('send') + ' Conversar no WhatsApp</button>' : '') +
            '<button type="button" class="btn btn-ghost" data-cli="ordens" data-i="' + i + '">' + ICO('clipboard') + ' Ver na lista de ordens</button></div></div></details>';
    }).join('');
    alvo.querySelectorAll('[data-cli]').forEach(function (botao) {
        botao.addEventListener('click', function () {
            const c = lista[Number(botao.dataset.i)];
            if (botao.dataset.cli === 'nova') novaOSParaCliente(c);
            if (botao.dataset.cli === 'whats') window.open('https://wa.me/55' + normalizarTelefone(c.telefone), '_blank');
            if (botao.dataset.cli === 'ordens') {
                fecharModalClientes();
                document.getElementById('searchInput').value = normalizarTelefone(c.telefone) || c.nome;
                document.getElementById('paymentFilter').value = 'Todos';
                filtrarPorStatus('Todos');
            }
        });
    });
}

function novaOSParaCliente(cliente) {
    fecharModalClientes();
    document.getElementById('clientPhone').value = cliente.telefone || '';
    document.getElementById('clientName').value = cliente.nome || '';
    abrirModalOS();
    verificarHistoricoCliente();
    irEtapaOS(1);
}

/* ---------- 6. Relatórios por mês ---------- */
const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function chaveMes(data) {
    return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0');
}
function mesDeslocado(chave, delta) {
    const partes = chave.split('-').map(Number);
    return chaveMes(new Date(partes[0], partes[1] - 1 + delta, 1));
}
function rotuloMes(chave, longo) {
    const partes = chave.split('-').map(Number);
    const d = new Date(partes[0], partes[1] - 1, 1);
    if (longo) {
        const texto = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }
    return NOMES_MES[d.getMonth()];
}

function resumoDoMes(chave) {
    const ordens = ordensServico.filter(function (os) { const d = dataDaOS(os); return d && chaveMes(d) === chave; });
    const avulsos = servicosAvulsos.filter(function (s) { return String(s.data || '').slice(0, 7) === chave; });
    const faturado = ordens.reduce(function (s, os) { return s + Number(os.valor || 0); }, 0);
    const recebido = ordens.reduce(function (s, os) { return s + valorEfetivamenteRecebido(os); }, 0);
    const custo = ordens.reduce(function (s, os) { return s + Number(os.custoPeca || 0); }, 0);
    return {
        ordens: ordens,
        quantidade: ordens.length,
        faturado: faturado,
        recebido: recebido,
        custo: custo,
        lucro: recebido - custo,
        ticket: ordens.length ? faturado / ordens.length : 0,
        avulsos: avulsos.reduce(function (s, x) { return s + Number(x.valor || 0); }, 0)
    };
}

function variacaoHTML(atual, anterior, inverter) {
    if (!anterior && !atual) return '<span class="delta">Sem movimento</span>';
    if (!anterior) return '<span class="delta">Sem dados no mês anterior</span>';
    const pct = Math.round(((atual - anterior) / Math.abs(anterior)) * 100);
    if (pct === 0) return '<span class="delta">Igual ao mês anterior</span>';
    const subiu = pct > 0;
    const bom = inverter ? !subiu : subiu;
    return '<span class="delta"><i class="' + (bom ? 'up' : 'down') + '">' + (subiu ? '▲' : '▼') + ' ' + Math.abs(pct) + '%</i> vs. mês anterior</span>';
}

function ranking(itens, limite) {
    const mapa = new Map();
    itens.forEach(function (item) { const nome = String(item || '').trim(); if (nome) mapa.set(nome, (mapa.get(nome) || 0) + 1); });
    return Array.from(mapa.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, limite || 5);
}

function rankingHTML(lista, vazio) {
    if (!lista.length) return '<li class="rank-empty">' + vazio + '</li>';
    const maior = lista[0][1];
    return lista.map(function (par) {
        return '<li><span class="rank-name">' + escaparHtml(par[0]) + '</span><span class="rank-bar"><i style="width:' + Math.max(6, Math.round(par[1] / maior * 100)) + '%"></i></span><b>' + par[1] + '</b></li>';
    }).join('');
}

function abrirModalRelatorio() {
    const campo = document.getElementById('reportMonth');
    if (!campo.value) campo.value = chaveMes(new Date());
    renderizarRelatorio();
    document.getElementById('reportModal').style.display = 'flex';
}
function fecharModalRelatorio() { document.getElementById('reportModal').style.display = 'none'; }
function mudarMesRelatorio(delta) {
    const campo = document.getElementById('reportMonth');
    campo.value = mesDeslocado(campo.value || chaveMes(new Date()), delta);
    renderizarRelatorio();
}

function renderizarRelatorio() {
    const chave = document.getElementById('reportMonth').value || chaveMes(new Date());
    const atual = resumoDoMes(chave);
    const anterior = resumoDoMes(mesDeslocado(chave, -1));
    document.getElementById('reportTitle').textContent = rotuloMes(chave, true);

    const cartoes = [
        ['Faturamento', formatarBRL(atual.faturado), 'info', variacaoHTML(atual.faturado, anterior.faturado)],
        ['Recebido', formatarBRL(atual.recebido), 'ok', variacaoHTML(atual.recebido, anterior.recebido)],
        ['Custo de peças', formatarBRL(atual.custo), 'danger', variacaoHTML(atual.custo, anterior.custo, true)],
        ['Recebido menos peças', formatarBRL(atual.lucro), 'ok', variacaoHTML(atual.lucro, anterior.lucro)],
        ['Ordens de serviço', String(atual.quantidade), '', variacaoHTML(atual.quantidade, anterior.quantidade)],
        ['Ticket médio', formatarBRL(atual.ticket), 'warn', variacaoHTML(atual.ticket, anterior.ticket)],
        ['Serviços avulsos', formatarBRL(atual.avulsos), '', variacaoHTML(atual.avulsos, anterior.avulsos)]
    ];
    document.getElementById('reportStats').innerHTML = cartoes.map(function (c) {
        return '<div class="stat-card"><span class="stat-label">' + c[0] + '</span><span class="stat-value"' + (c[2] ? ' data-tone="' + c[2] + '"' : '') + '>' + c[1] + '</span>' + c[3] + '</div>';
    }).join('');

    // Gráfico: faturamento dos 6 meses até o mês escolhido
    const meses = [];
    for (let i = 5; i >= 0; i--) meses.push(mesDeslocado(chave, -i));
    const valores = meses.map(function (m) { return resumoDoMes(m).faturado; });
    const maior = Math.max.apply(null, valores.concat([1]));
    const grafico = document.getElementById('reportChart');
    grafico.innerHTML = '<div class="bars">' + meses.map(function (m, i) {
        const altura = valores[i] ? Math.max(2, Math.round(valores[i] / maior * 100)) : 0;
        const selecionado = m === chave;
        return '<button type="button" class="bar-col' + (selecionado ? ' is-selected' : '') + '" data-mes="' + m + '" aria-label="' + rotuloMes(m, true) + ': ' + formatarBRL(valores[i]) + '">' +
            (selecionado ? '<span class="bar-value">' + formatarBRL(valores[i]) + '</span>' : '') +
            '<span class="bar-track"><span class="bar" style="height:' + altura + '%"></span></span>' +
            '<span class="bar-label">' + rotuloMes(m) + '</span>' +
            '<span class="bar-tip">' + rotuloMes(m, true) + '<b>' + formatarBRL(valores[i]) + '</b></span></button>';
    }).join('') + '</div>';
    grafico.querySelectorAll('.bar-col').forEach(function (b) {
        b.addEventListener('click', function () { document.getElementById('reportMonth').value = b.dataset.mes; renderizarRelatorio(); });
    });

    const componentes = [];
    atual.ordens.forEach(function (os) {
        (os.componentesSelecionados && os.componentesSelecionados.length ? os.componentesSelecionados : []).forEach(function (c) { componentes.push(c); });
        if (os.componenteExtra) componentes.push(os.componenteExtra);
    });
    document.getElementById('reportTopModels').innerHTML = rankingHTML(ranking(atual.ordens.map(function (os) { return os.modelo; })), 'Nenhuma OS neste mês.');
    document.getElementById('reportTopParts').innerHTML = rankingHTML(ranking(componentes), 'Nenhum componente registrado neste mês.');
}
