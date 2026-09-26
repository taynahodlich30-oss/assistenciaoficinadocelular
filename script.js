const firebaseConfig = {
    apiKey: "AIzaSyDDLsDkCsFma4xWIpSfwE58w3zSUNuv9Bc",
    authDomain: "oficina-do-celular-eaaed.firebaseapp.com",
    projectId: "oficina-do-celular-eaaed",
    storageBucket: "oficina-do-celular-eaaed.firebasestorage.app",
    messagingSenderId: "32431619085",
    appId: "1:32431619085:web:18b3a2defb79795f832944",
    measurementId: "G-J6PHLDPD1H"
};

let db = null;
let auth = null;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
    }
} catch (e) {
    console.error("Erro Firebase:", e);
}

let ordensServico = [];
let estoquePecas = [];
let servicosAvulsos = [];
let servicosDisponiveis = false;
let fotosTemp = [];
let canvas, ctx;
let assinaturaVazia = '';
let isDrawing = false;
let statusFiltroAtual = "Todos";
const componentes = ['Tela', 'Bateria', 'Conector de carga', 'FPC', 'Memória', 'Câmera frontal', 'Câmera traseira', 'Alto-falante', 'Auricular', 'Microfone', 'Botão power', 'Botão volume', 'Flex', 'Placa de carga', 'Placa principal', 'Tampa traseira', 'Carcaça', 'Lente da câmera', 'Antena', 'Sensor biométrico', 'Motor de vibração', 'Gaveta do chip', 'Vidro traseiro'];
const variantesPeca = { Tela: ['Incell com aro', 'Incell sem aro', 'OLED com aro', 'OLED sem aro', 'Original com aro', 'Original sem aro', 'AMOLED', 'LCD', 'Primeira linha'], Bateria: ['Premium', 'Primeira linha', 'Original', 'Compatível'], 'Conector de carga': ['USB-C', 'Micro USB', 'Lightning', 'Placa de carga completa'], Memória: ['RAM', 'Armazenamento', 'Chip de memória'], FPC: ['Tela', 'Bateria', 'Carga', 'Câmera', 'Outro'] };
const tiposServico = ['Remoção de FRP', 'Remoção de vírus', 'Limpeza de software', 'Formatação', 'Atualização de sistema', 'Recuperação de dados', 'Backup', 'Transferência de dados', 'Desbloqueio de tela', 'Instalação de aplicativos', 'Limpeza química', 'Microssolda', 'Diagnóstico'];
function configurarCatalogos() {
    const criarOpcoes = (items, target, name) => document.getElementById(target).innerHTML = items.map(item => '<label class="choice-item"><input type="checkbox" name="' + name + '" value="' + item + '"> ' + item + '</label>').join('');
    criarOpcoes(componentes, 'componentChoices', 'componentChoice');
    document.getElementById('componentChoices').addEventListener('change', event => {
        if (event.target.checked && !document.getElementById('partType').value) {
            document.getElementById('partType').value = event.target.value;
            atualizarVariantesPeca();
        }
    });
    document.getElementById('partType').innerHTML += componentes.map(item => '<option value="' + item + '">' + item + '</option>').join('');
    document.getElementById('serviceKind').innerHTML = '<option value="">Selecione o serviço...</option>' + tiposServico.map(item => '<option value="' + item + '">' + item + '</option>').join('') + '<option value="Outro">Outro</option>';
}
function selecionados(name) { return Array.from(document.querySelectorAll('input[name="' + name + '"]:checked'), input => input.value); }
function marcarSelecionados(name, values) { document.querySelectorAll('input[name="' + name + '"]').forEach(input => input.checked = values.includes(input.value)); }
function mostrarAbaReparo(aba) {
    document.getElementById('partsPanel').style.display = '';
}
function atualizarVariantesPeca() {
    const tipo = document.getElementById('partType').value;
    const variante = document.getElementById('partVariant');
    variante.innerHTML = '<option value="">Selecione a opção...</option>';
    (variantesPeca[tipo] || ['Original', 'Premium', 'Primeira linha', 'Compatível']).forEach(value => variante.add(new Option(value, value)));
    preencherNomePeca();
}
function preencherNomePeca() { document.getElementById('partSummary').textContent = [document.getElementById('partType').value, document.getElementById('partVariant').value].filter(Boolean).join(' '); }

async function validarSenha() {
    const email = document.getElementById('emailInput').value.trim();
    const senha = document.getElementById('passwordInput').value;
    const botao = document.getElementById('loginButton');
    if (!auth) { document.getElementById('loginError').innerText = 'Não foi possível conectar ao Firebase. Verifique a internet.'; return; }
    botao.disabled = true;
    document.getElementById('loginError').innerText = '';
    try { await auth.signInWithEmailAndPassword(email, senha); }
    catch (e) { document.getElementById('loginError').innerText = 'Não foi possível entrar. Confira o e-mail, a senha e se o usuário foi criado no Firebase Authentication.'; }
    finally { botao.disabled = false; }
}

function checarSessao() {
    if (!auth) { document.getElementById('loginError').innerText = 'Firebase indisponível. Verifique sua conexão.'; return; }
    auth.onAuthStateChanged(user => {
        if (user) exibirApp();
        else {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('appScreen').style.display = 'none';
            ordensServico = [];
            estoquePecas = [];
        }
    });
}

async function logout() { if (auth) await auth.signOut(); }

function exibirApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    inicializarCanvas();
    carregarDadosDoBanco();
}
function avisar(mensagem, erro = false) {
    const aviso = document.getElementById('appNotice');
    aviso.textContent = mensagem;
    aviso.classList.toggle('error', erro);
    aviso.style.display = 'block';
}

async function carregarDadosDoBanco() {
    if (db) {
        try {
            const snapOS = await db.collection('ordens_servico').get();
            ordensServico = [];
            snapOS.forEach(doc => ordensServico.push({ idDoc: doc.id, ...doc.data() }));

            const snapStock = await db.collection('estoque_pecas').get();
            estoquePecas = [];
            snapStock.forEach(doc => estoquePecas.push({ idDoc: doc.id, ...doc.data() }));
        } catch (e) {
            ordensServico = [];
            estoquePecas = [];
            avisar('Não foi possível carregar as OS do Firebase. Confira a conexão e suas permissões. Nenhuma OS foi apagada.', true);
        }
    } else {
        avisar('Firebase indisponível. Confira sua conexão.', true);
    }
    atualizarPainel();
    atualizarSelectEstoque();
    await carregarServicosAvulsos();
}

function carregarLocal() {
    ordensServico = JSON.parse(localStorage.getItem('oficina_os_db')) || [];
    estoquePecas = JSON.parse(localStorage.getItem('oficina_stock_db')) || [];
}

async function salvarNoBanco(novaOS) {
    if (!db || !auth?.currentUser) throw new Error('Sessão ou Firebase indisponível');
    const { idDoc, ...dados } = novaOS;
    const refOS = idDoc ? db.collection('ordens_servico').doc(idDoc) : db.collection('ordens_servico').doc();
    const antigo = idDoc ? ordensServico.find(os => os.idDoc === idDoc) : null;
    const antigoId = antigo?.estoquePecaId || '';
    const novoId = dados.estoquePecaId || '';
    let estoqueAtualizado = {};
    await db.runTransaction(async transacao => {
        estoqueAtualizado = {};
        if (antigoId !== novoId) {
            const ids = [...new Set([antigoId, novoId].filter(Boolean))];
            const refs = ids.map(id => db.collection('estoque_pecas').doc(id));
            const snaps = await Promise.all(refs.map(ref => transacao.get(ref)));
            snaps.forEach((snap, i) => { if (!snap.exists) throw new Error('Peça não encontrada no estoque: ' + ids[i]); });
            snaps.forEach((snap, i) => {
                const id = ids[i];
                const qtd = Number(snap.data().qtd || 0) + (id === antigoId ? 1 : -1);
                if (qtd < 0) throw new Error('Peça sem unidades disponíveis: ' + (snap.data().nome || id));
                estoqueAtualizado[id] = qtd;
                transacao.update(refs[i], { qtd });
            });
        }
        transacao.set(refOS, dados);
    });
    novaOS.idDoc = refOS.id;
    Object.entries(estoqueAtualizado).forEach(([id, qtd]) => {
        const peca = estoquePecas.find(p => p.idDoc === id);
        if (peca) peca.qtd = qtd;
    });
    if (idDoc) {
        const index = ordensServico.findIndex(o => o.idDoc === idDoc);
        if (index !== -1) ordensServico[index] = novaOS;
    } else ordensServico.unshift(novaOS);
    localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));
    localStorage.setItem('oficina_stock_db', JSON.stringify(estoquePecas));
    atualizarSelectEstoque();
    atualizarPainel();
}

async function excluirOS(osId) {
    if (!confirm("Tem certeza que deseja excluir esta Ordem de Serviço?")) return;

    const index = ordensServico.findIndex(o => o.idOS === osId);
    if (index !== -1) {
        const item = ordensServico[index];
        try {
            if (!db || !item.idDoc) throw new Error('OS sem vínculo com Firebase');
            await db.collection('ordens_servico').doc(item.idDoc).delete();
        } catch(e) { avisar('Não foi possível excluir a OS no Firebase. Ela permanece na lista.', true); return; }
        ordensServico.splice(index, 1);
        localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));
        atualizarPainel();
    }
}

function editarOS(osId) {
    const os = ordensServico.find(o => o.idOS === osId);
    if (!os) return;

    document.getElementById('editDocId').value = os.idDoc || '';
    document.getElementById('editOSId').value = os.idOS || '';
    document.getElementById('clientPhone').value = os.whatsapp || '';
    document.getElementById('clientName').value = os.cliente || '';
    document.getElementById('deviceModel').value = os.modelo || '';
    document.getElementById('deviceIMEI').value = os.imei || '';
    document.getElementById('deviceDefect').value = os.defeito || '';
    document.getElementById('replacedParts').value = os.pecasTrocadas || '';
    marcarSelecionados('componentChoice', os.componentesSelecionados || []);
    if (os.componentesSelecionados?.length) document.getElementById('replacedParts').value = os.componenteExtra || '';
    document.getElementById('serviceDescription').value = os.descricaoServico || '';
    document.getElementById('deviceObs').value = os.obs || '';
    document.getElementById('partSummary').textContent = os.peca && os.peca !== 'Nenhuma' ? os.peca : '';
    document.getElementById('stockPartSelect').value = os.estoquePecaId ? String(estoquePecas.findIndex(p => p.idDoc === os.estoquePecaId)) : '';
    const tipoPeca = componentes.find(tipo => (os.peca || '').startsWith(tipo));
    if (tipoPeca) {
        document.getElementById('partType').value = tipoPeca;
        atualizarVariantesPeca();
        const variantePeca = (os.peca || '').slice(tipoPeca.length).trim();
        if (Array.from(document.getElementById('partVariant').options).some(op => op.value === variantePeca)) document.getElementById('partVariant').value = variantePeca;
        document.getElementById('partSummary').textContent = os.peca;
    }
    document.getElementById('partSupplier').value = os.fornecedorPeca || 'Não Informado';
    document.getElementById('partCost').value = os.custoPeca || '';
    document.getElementById('serviceStatus').value = os.status || 'Em análise';
    document.getElementById('paymentStatus').value = os.statusPagamento || 'Aguardando Pagamento';
    document.getElementById('amountReceived').value = os.valorRecebido ?? (os.statusPagamento === 'Pago' ? os.valor : '');
    document.getElementById('paymentDetails').value = os.detalhesPagamento || '';
    document.getElementById('servicePrice').value = os.valor || '';

    if (os.checklist) {
        document.getElementById('checkTouch').value = os.checklist.touch || 'OK';
        document.getElementById('checkCharge').value = os.checklist.charge || 'OK';
        document.getElementById('checkCameras').value = os.checklist.cameras || 'OK';
        document.getElementById('checkBio').value = os.checklist.bio || 'OK';
        document.getElementById('checkAudio').value = os.checklist.audio || 'OK';
        document.getElementById('checkSignal').value = os.checklist.signal || 'OK';
    }

    document.getElementById('modalTitle').innerText = `Editar ${os.idOS}`;
    document.getElementById('btnSaveOS').innerText = "Atualizar Ordem de Serviço";
    abrirModalOS();
}

function filtrarPorStatus(status) {
    statusFiltroAtual = status;
    document.querySelectorAll('.metric-card').forEach(card => card.classList.remove('active'));

    if (status === 'Todos') document.getElementById('cardFilterTodos').classList.add('active');
    if (status === 'Em análise') document.getElementById('cardFilterAnalise').classList.add('active');
    if (status === 'Em orçamento') document.getElementById('cardFilterOrcamento').classList.add('active');
    if (status === 'Em reparo') document.getElementById('cardFilterReparo').classList.add('active');
    if (status === 'Pronto') document.getElementById('cardFilterProntos').classList.add('active');

    document.getElementById('filterCurrentTitle').innerText = status === 'Todos' ? 'Exibindo: Todas as Ordens de Serviço' : `Exibindo: Categoria "${status}"`;
    atualizarPainel();
}

async function salvarPecaEstoque(e) {
    e.preventDefault();
    const novaPeca = {
        nome: document.getElementById('stockName').value,
        fornecedor: document.getElementById('stockFormSupplier').value,
        qtd: parseInt(document.getElementById('stockQty').value) || 0,
        custo: parseFloat(document.getElementById('stockCost').value) || 0
    };

    try {
        if (!db) throw new Error('Firebase indisponível');
        const doc = await db.collection('estoque_pecas').add(novaPeca);
        novaPeca.idDoc = doc.id;
    } catch (err) { avisar('Não foi possível salvar a peça no Firebase. Verifique sua conexão.', true); return; }
    estoquePecas.unshift(novaPeca);
    localStorage.setItem('oficina_stock_db', JSON.stringify(estoquePecas));

    document.getElementById('stockForm').reset();
    renderizarEstoque();
    atualizarSelectEstoque();
}

function renderizarEstoque() {
    const list = document.getElementById('stockList');
    list.innerHTML = '';
    estoquePecas.forEach(item => {
        const div = document.createElement('div');
        div.className = 'stock-item';
        div.innerHTML = `
            <div>
                <strong style="color:#38bdf8">${item.nome}</strong><br>
                <small style="color:#cbd5e1">Fornecedor: <b style="color:#a855f7;">${item.fornecedor || 'Não especificado'}</b> | Qtd: ${item.qtd} un | R$ ${item.custo.toFixed(2)}</small>
            </div>
            ${item.qtd <= 2 ? '<span style="color:#f87171; font-size:11px; font-weight:bold;"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#alert"></use></svg> Baixo</span>' : ''}
        `;
        list.appendChild(div);
    });
}

function atualizarSelectEstoque() {
    const select = document.getElementById('stockPartSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione uma peça...</option>';
    estoquePecas.forEach((p, idx) => {
        select.add(new Option(`${p.nome} (${p.fornecedor || 'Geral'}) — ${p.qtd} un`, String(idx)));
    });
}

function selecionarPecaEstoque() {
    const idx = document.getElementById('stockPartSelect').value;
    if (idx !== "") {
        const peca = estoquePecas[idx];
        document.getElementById('partSummary').textContent = peca.nome;
        document.getElementById('partSupplier').value = peca.fornecedor || 'Não Informado';
        document.getElementById('partCost').value = peca.custo;
    }
}

async function darBaixaEstoque(nomePeca) {
    const peca = estoquePecas.find(p => p.nome === nomePeca);
    if (peca && peca.qtd > 0) {
        try {
            if (!db || !peca.idDoc) throw new Error('Peça sem vínculo com Firebase');
            await db.collection('estoque_pecas').doc(peca.idDoc).update({ qtd: peca.qtd - 1 });
            peca.qtd -= 1;
            localStorage.setItem('oficina_stock_db', JSON.stringify(estoquePecas));
        } catch(e) { avisar('OS salva; não foi possível dar baixa na peça do estoque.', true); }
        atualizarSelectEstoque();
    }
}

function verificarHistoricoCliente() {
    const phone = document.getElementById('clientPhone').value.replace(/\D/g, '');
    if (!phone) return;
    const anteriores = ordensServico.filter(os => os.whatsapp.replace(/\D/g, '') === phone);
    const alertBox = document.getElementById('clientHistoryAlert');
    
    if (anteriores.length > 0) {
        alertBox.innerText = `Cliente antigo! ${anteriores.length} OS anterior(es) encontrada(s).`;
    } else {
        alertBox.innerText = `Novo cliente no sistema.`;
    }
}

async function alterarStatusOS(osId, novoStatus) {
    const os = ordensServico.find(item => item.idOS === osId);
    if (os) {
        try {
            if (!db || !os.idDoc) throw new Error('OS sem vínculo com Firebase');
            await db.collection('ordens_servico').doc(os.idDoc).update({ status: novoStatus });
        } catch(e) { avisar('Não foi possível salvar o novo status. Tente novamente.', true); atualizarPainel(); return; }
        os.status = novoStatus;
        localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));
        atualizarPainel();
    }
}

function previewImages(event) {
    const files = event.target.files;
    const container = document.getElementById('previewContainer');
    container.innerHTML = '';
    fotosTemp = [];

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            fotosTemp.push(e.target.result);
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-thumb';
            container.appendChild(img);
        }
        reader.readAsDataURL(file);
    });
}

async function salvarOS(event) {
    event.preventDefault();
    const botaoSalvar = document.getElementById('btnSaveOS');
    botaoSalvar.disabled = true;
    document.getElementById('saveError').textContent = '';

    const docIdExistente = document.getElementById('editDocId').value;
    const osIdExistente = document.getElementById('editOSId').value;
    const osNumber = osIdExistente || ("OS-" + Math.floor(100000 + Math.random() * 900000));
    
    const pecaUtilizada = document.getElementById('partSummary').textContent.trim() || ordensServico.find(o => o.idDoc === document.getElementById('editDocId').value)?.peca || 'Nenhuma';
    const fornecedorPeca = document.getElementById('partSupplier').value || "Não Informado";
    const custoPecaVal = parseFloat(document.getElementById('partCost').value) || 0;
    const indiceEstoque = document.getElementById('stockPartSelect').value;
    const pecaEstoque = indiceEstoque === '' ? null : estoquePecas[Number(indiceEstoque)];

    const osAnterior = ordensServico.find(os => os.idDoc === docIdExistente);
    const novaOS = {
        ...(osAnterior || {}),
        ...(docIdExistente ? { idDoc: docIdExistente } : {}),
        idOS: osNumber,
        data: osAnterior?.data || new Date().toLocaleDateString('pt-BR'),
        cliente: document.getElementById('clientName').value,
        whatsapp: document.getElementById('clientPhone').value,
        modelo: document.getElementById('deviceModel').value,
        imei: document.getElementById('deviceIMEI').value,
        defeito: document.getElementById('deviceDefect').value,
        pecasTrocadas: document.getElementById('replacedParts').value || "Nenhuma informada",
        componentesSelecionados: selecionados('componentChoice'),
        componenteExtra: document.getElementById('replacedParts').value.trim(),
        descricaoServico: document.getElementById('serviceDescription').value || "Sem descrição adicional",
        obs: document.getElementById('deviceObs').value || "Sem observações",
        checklist: {
            touch: document.getElementById('checkTouch').value,
            charge: document.getElementById('checkCharge').value,
            cameras: document.getElementById('checkCameras').value,
            bio: document.getElementById('checkBio').value,
            audio: document.getElementById('checkAudio').value,
            signal: document.getElementById('checkSignal').value
        },
        peca: pecaUtilizada,
        estoquePecaId: pecaEstoque?.idDoc || '',
        fornecedorPeca: fornecedorPeca,
        custoPeca: custoPecaVal,
        status: document.getElementById('serviceStatus').value,
        statusPagamento: document.getElementById('paymentStatus').value,
        valorRecebido: document.getElementById('paymentStatus').value === 'Pago' ? (parseFloat(document.getElementById('servicePrice').value) || 0) : document.getElementById('paymentStatus').value === 'Parcial (Entrada/Resta)' ? (parseFloat(document.getElementById('amountReceived').value) || 0) : 0,
        detalhesPagamento: document.getElementById('paymentDetails').value || "",
        valor: parseFloat(document.getElementById('servicePrice').value) || 0,
        fotos: fotosTemp.length ? fotosTemp : (osAnterior?.fotos || []),
        assinatura: canvas.toDataURL() === assinaturaVazia ? (osAnterior?.assinatura || canvas.toDataURL()) : canvas.toDataURL()
    };
    novaOS.pecasTrocadas = [...novaOS.componentesSelecionados, novaOS.componenteExtra].filter(Boolean).join(', ') || 'Nenhuma informada';
    if (novaOS.valorRecebido > novaOS.valor) {
        document.getElementById('saveError').textContent = 'O valor recebido não pode ser maior que o total cobrado.';
        botaoSalvar.disabled = false;
        return;
    }

    try {
        await salvarNoBanco(novaOS);
    } catch(e) {
        document.getElementById('saveError').textContent = e.message?.includes('Peça') ? e.message : 'Não foi possível salvar no Firebase. A OS continua no formulário; verifique a internet e tente novamente.';
        botaoSalvar.disabled = false;
        return;
    }
    botaoSalvar.disabled = false;
    avisar('OS salva no Firebase com sucesso.');

    fecharModalOS();
    document.getElementById('osForm').reset();
    document.getElementById('partVariant').innerHTML = '<option value="">Selecione a opção...</option>';
    document.getElementById('editDocId').value = '';
    document.getElementById('editOSId').value = '';
    document.getElementById('modalTitle').innerText = "Criar Ordem de Serviço";
    document.getElementById('btnSaveOS').innerText = "Salvar Ordem de Serviço";
    document.getElementById('previewContainer').innerHTML = '';
    document.getElementById('clientHistoryAlert').innerText = '';
    fotosTemp = [];
    limparAssinatura();
}

function atualizarPainel() {
    const osList = document.getElementById('osList');
    osList.innerHTML = '';

    let total = ordensServico.length;
    let analise = 0, orcamento = 0, reparo = 0, prontos = 0;
    let bruto = 0, custo = 0, recebido = 0;

    ordensServico.forEach((os) => {
        if (os.status === 'Em análise') analise++;
        if (os.status === 'Em orçamento') orcamento++;
        if (os.status === 'Em reparo') reparo++;
        if (os.status === 'Pronto') prontos++;

        bruto += (os.valor || 0);
        custo += (os.custoPeca || 0);
        recebido += valorEfetivamenteRecebido(os);
    });

    document.getElementById('countTotal').innerText = total;
    document.getElementById('countAnalise').innerText = analise;
    document.getElementById('countOrcamento').innerText = orcamento;
    document.getElementById('countReparo').innerText = reparo;
    document.getElementById('countProntos').innerText = prontos;

    document.getElementById('totalBruto').innerText = `R$ ${bruto.toFixed(2)}`;
    document.getElementById('totalRecebido').innerText = `R$ ${recebido.toFixed(2)}`;
    document.getElementById('totalCusto').innerText = `R$ ${custo.toFixed(2)}`;
    document.getElementById('totalLucro').innerText = `R$ ${(recebido - custo).toFixed(2)}`;

    const termo = document.getElementById('searchInput').value.trim().toLocaleLowerCase('pt-BR');
    const pagamento = document.getElementById('paymentFilter').value;
    const mes = document.getElementById('monthFilter').value;
    const ordensFiltradas = ordensServico.filter(os => {
        if (statusFiltroAtual !== 'Todos' && os.status !== statusFiltroAtual) return false;
        if (pagamento !== 'Todos' && os.statusPagamento !== pagamento) return false;
        if (mes) {
            const partes = (os.data || '').split('/');
            if (partes.length !== 3 || `${partes[2]}-${partes[1]}` !== mes) return false;
        }
        return !termo || [os.idOS, os.cliente, os.whatsapp, os.modelo, os.imei, os.fornecedorPeca, os.defeito].some(valor => String(valor || '').toLocaleLowerCase('pt-BR').includes(termo));
    });
    document.getElementById('resultsCount').textContent = `${ordensFiltradas.length} de ${ordensServico.length} OS exibidas`;
    if (!ordensFiltradas.length) osList.innerHTML = '<div class="empty-state">Nenhuma OS encontrada para esses filtros.</div>';

    ordensFiltradas.forEach((os) => {
        let fotosHTML = '';
        if (os.fotos && os.fotos.length > 0) {
            fotosHTML = '<div class="preview-container">';
            os.fotos.forEach(f => { fotosHTML += `<img src="${f}" class="preview-thumb">`; });
            fotosHTML += '</div>';
        }

        let corPagamento = "#eab308";
        if (os.statusPagamento === "Pago") corPagamento = "#4ade80";
        if (os.statusPagamento === "Parcial (Entrada/Resta)") corPagamento = "#38bdf8";

        const card = document.createElement('div');
        card.className = 'os-card';
        card.innerHTML = `
            <div class="os-card-header">
                <strong>${os.idOS} - ${os.cliente}</strong>
                <select class="status-select" onchange="alterarStatusOS('${os.idOS}', this.value)">
                    <option value="Em análise" ${os.status === 'Em análise' ? 'selected' : ''}>Em análise</option>
                    <option value="Em orçamento" ${os.status === 'Em orçamento' ? 'selected' : ''}>Em orçamento</option>
                    <option value="Em reparo" ${os.status === 'Em reparo' ? 'selected' : ''}>Em reparo</option>
                    <option value="Pronto" ${os.status === 'Pronto' ? 'selected' : ''}>Pronto</option>
                </select>
            </div>
            <p><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#phone"></use></svg> <strong>Aparelho:</strong> ${os.modelo} (IMEI: ${os.imei})</p>
            <p><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#tool"></use></svg> <strong>Defeito Relatado:</strong> ${os.defeito}</p>
            <p style="color: #4ade80;"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#tool"></use></svg> <strong>Componentes Trocados:</strong> ${os.pecasTrocadas || 'Nenhum registrado'}</p>
            <p style="color: #cbd5e1; font-size: 12px;"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#clipboard"></use></svg> <strong>Descrição:</strong> ${os.descricaoServico || 'Sem detalhes'}</p>
            <p><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#tag"></use></svg> <strong>Fornecedor Peça:</strong> <strong style="color: #a855f7;">${os.fornecedorPeca || 'Não Informado'}</strong></p>
            <p><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#wallet"></use></svg> <strong>Pagamento:</strong> <span style="color:${corPagamento}; font-weight:bold;">${os.statusPagamento || 'Aguardando'}</span> — recebido R$ ${valorEfetivamenteRecebido(os).toFixed(2)} ${os.detalhesPagamento ? `(${os.detalhesPagamento})` : ''}</p>
            <p><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#wallet"></use></svg> <strong>Valor Total:</strong> R$ ${os.valor.toFixed(2)} | <strong>Custo Peça:</strong> R$ ${(os.custoPeca || 0).toFixed(2)}</p>
            ${fotosHTML}
            <div class="os-card-actions">
                <button class="btn-sm btn-wa-orcamento" onclick="abrirModalOrcamentoOpcoes('${os.idOS}', '${os.whatsapp}', '${os.modelo}')"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#clock"></use></svg> Orçamento</button>
                <button class="btn-sm btn-wa-aprovado" onclick="waNotificarAprovado('${os.idOS}')"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#check"></use></svg> Aprovado</button>
                <button class="btn-sm btn-wa-pronto" onclick="waPronto('${os.whatsapp}', '${os.idOS}', '${os.modelo}', '${os.valor}')"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#check"></use></svg> Pronto</button>
                <button class="btn-sm btn-wa-comprovante" onclick="waEnviarComprovante('${os.idOS}')"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#send"></use></svg> Via Zap</button>
            </div>
            <div class="os-card-subactions">
                <button class="btn-sm" onclick="imprimirCupom('${os.idOS}')"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#print"></use></svg> OS Papel</button>
                <button class="btn-sm" style="background:#a855f7;" onclick="imprimirEtiqueta('${os.idOS}')"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#tag"></use></svg> Etiqueta</button>
                <button class="btn-sm btn-edit" onclick="editarOS('${os.idOS}')"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#edit"></use></svg> Editar</button>
                <button class="btn-sm btn-delete" onclick="excluirOS('${os.idOS}')"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#trash"></use></svg> Excluir</button>
            </div>
        `;
        osList.appendChild(card);
    });
}

function abrirModalOrcamentoOpcoes(osId, whatsapp, modelo) {
    document.getElementById('orcamentoOSId').value = osId;
    document.getElementById('orcamentoPhone').value = whatsapp;
    document.getElementById('orcamentoModelo').value = modelo;
    document.getElementById('orcamentoModal').style.display = 'flex';
}

function fecharModalOrcamento() {
    document.getElementById('orcamentoModal').style.display = 'none';
}

function enviarWaOrcamentoOpcoes() {
    const osId = document.getElementById('orcamentoOSId').value;
    const whatsapp = document.getElementById('orcamentoPhone').value;
    const modelo = document.getElementById('orcamentoModelo').value;
    const serviceType = document.getElementById('orcamentoServiceType').value || "Reparo do Aparelho";
    const num = whatsapp.replace(/\D/g, '');

    const opt1 = document.getElementById('screenOpt1').value;
    const opt2 = document.getElementById('screenOpt2').value;
    const opt3 = document.getElementById('screenOpt3').value;

    let texto = `*📱 OFICINA DO CELULAR - ORÇAMENTO DE SERVIÇO*\n\n`;
    texto += `Olá! Segue o orçamento para o seu *${modelo}* (${osId}):\n\n`;
    texto += `🔧 *Serviço Avaliado:* ${serviceType}\n\n`;
    if (opt1) texto += `🔹 *Opção 1:* ${opt1}\n`;
    if (opt2) texto += `🔹 *Opção 2:* ${opt2}\n`;
    if (opt3) texto += `🔹 *Opção 3:* ${opt3}\n`;
    texto += `\nQual das opções podemos aprovar para darmos início ao serviço?`;

    alterarStatusOS(osId, 'Em orçamento');

    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(texto)}`, '_blank');
    fecharModalOrcamento();
}

function waNotificarAprovado(osId) {
    const os = ordensServico.find(item => item.idOS === osId);
    if (!os) return;

    const num = os.whatsapp.replace(/\D/g, '');
    alterarStatusOS(osId, 'Em reparo');

    let texto = `*📱 OFICINA DO CELULAR - SERVIÇO APROVADO*\n\n`;
    texto += `Prezado(a) *${os.cliente}*,\n`;
    texto += `Confirmamos a aprovação do orçamento para o seu aparelho *${os.modelo}* (${os.idOS}).\n\n`;
    texto += `⚙️ Nossos técnicos já iniciaram a manutenção do seu dispositivo. Assim que o serviço for concluído e passar nos testes de qualidade, entraremos em contato para a retirada.\n\n`;
    texto += `Agradecemos a confiança!`;

    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(texto)}`, '_blank');
}

async function waEnviarComprovante(osId) {
    const os = ordensServico.find(item => item.idOS === osId);
    if (!os) return;
    const pagamentoConfirmado = os.statusPagamento === 'Pago' || confirm('O pagamento desta OS já foi recebido?\n\nOK: marcar como Pago e enviar a garantia.\nCancelar: enviar a garantia sem alterar o pagamento.');
    const janela = window.open('about:blank', '_blank');
    if (!janela) { alert('Permita abrir a janela do WhatsApp para enviar a garantia.'); return; }
    try {
        if (!db || !os.idDoc || !crypto?.getRandomValues) throw new Error('Firebase ou gerador de código indisponível');
        const token = os.garantiaToken || Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
        const inicio = os.garantiaInicio || new Date().toISOString().slice(0, 10);
        const validade = new Date(inicio + 'T12:00:00Z');
        validade.setUTCDate(validade.getUTCDate() + 90);
        const lote = db.batch();
        lote.set(db.collection('garantias_publicas').doc(token), {
            idOS: String(os.idOS || ''), modelo: String(os.modelo || ''),
            componentes: String(os.pecasTrocadas || 'Serviço realizado'),
            inicio, validade: validade.toISOString().slice(0, 10)
        });
        lote.update(db.collection('ordens_servico').doc(os.idDoc), {
            garantiaToken: token, garantiaInicio: inicio,
            ...(pagamentoConfirmado ? { statusPagamento: 'Pago', valorRecebido: Number(os.valor || 0) } : {})
        });
        await lote.commit();
        os.garantiaToken = token;
        os.garantiaInicio = inicio;
        if (pagamentoConfirmado) {
            os.statusPagamento = 'Pago';
            os.valorRecebido = Number(os.valor || 0);
        }
        localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));
        atualizarPainel();
    } catch(error) {
        janela.close();
        avisar('Não foi possível preparar a garantia no Firebase. Nenhum pagamento foi alterado. Confira as regras e tente novamente.', true);
        return;
    }

    const num = os.whatsapp.replace(/\D/g, '');
    const linkGarantia = new URL('garantia.html', location.href);
    linkGarantia.searchParams.set('codigo', os.garantiaToken);
    const qrCodeGarantia = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(linkGarantia.href)}`;

    let statusPagamentoTexto = "🟡 AGUARDANDO PAGAMENTO";
    if (os.statusPagamento === "Pago") {
        statusPagamentoTexto = `🟢 PAGO (R$ ${os.valor.toFixed(2)})`;
    } else if (os.statusPagamento === "Parcial (Entrada/Resta)") {
        statusPagamentoTexto = `🔵 PARCIAL ${os.detalhesPagamento ? `(${os.detalhesPagamento})` : ''}`;
    }

    let texto = `*📱 OFICINA DO CELULAR - COMPROVANTE DE ENTREGA & GARANTIA*\n\n`;
    texto += `Prezado(a) *${os.cliente}*,\n`;
    texto += `Seu aparelho foi entregue com sucesso! Seguem os detalhes do serviço realizado:\n\n`;
    texto += `📄 *Ordem de Serviço:* ${os.idOS}\n`;
    texto += `📱 *Aparelho:* ${os.modelo}\n`;
    texto += `🔧 *Defeito Relatado:* ${os.defeito}\n`;
    texto += `⚙️ *Componente(s) Trocado(s):* ${os.pecasTrocadas || 'Reparo Efetuado'}\n`;
    texto += `💰 *Valor Total:* R$ ${os.valor.toFixed(2)}\n`;
    texto += `💳 *Status do Pagamento:* ${statusPagamentoTexto}\n\n`;
    texto += `------------------------------------\n`;
    texto += `🛡️ *TERMO DE GARANTIA DIGITAL (90 DIAS)*\n`;
    texto += `Este comprovante assegura garantia de 90 dias a contar desta data para os componentes substituídos.\n`;
    texto += `⚠️ *A garantia não cobre:* Quedas, quebras, marcas de impacto, selos rompidos ou contato com líquidos.\n\n`;
    texto += `🔎 *Consulte a validade da garantia:* ${linkGarantia.href}\n`;
    texto += `📲 *QR Code da garantia:* ${qrCodeGarantia}\n\n`;
    texto += `Agradecemos a preferência! Caso precise, estamos à disposição.`;

    janela.location.href = `https://wa.me/55${num}?text=${encodeURIComponent(texto)}`;
}

function waPronto(telefone, osId, modelo, valor) {
    const num = telefone.replace(/\D/g, '');
    const linkAvaliacao = "https://share.google/fCGo2AkH2HVhHMzSP";
    
    const msg = encodeURIComponent(
        `Olá! Excelente notícia 🎉! O seu *${modelo}* (${osId}) já está pronto para retirada. Valor: *R$ ${parseFloat(valor).toFixed(2)}*. Aguardamos você!\n\n` +
        `Se puder dedicar 1 minutinho para avaliar o nosso atendimento no Google, nos ajuda muito: ${linkAvaliacao}`
    );
    
    window.open(`https://wa.me/55${num}?text=${msg}`, '_blank');
}

function abrirModalOS() { 
    document.getElementById('osModal').style.display = 'flex'; 
}

function fecharModalOS() { 
    document.getElementById('osModal').style.display = 'none'; 
    document.getElementById('osForm').reset();
    document.getElementById('partSummary').textContent = '';
    mostrarAbaReparo('pecas');
    document.getElementById('editDocId').value = '';
    document.getElementById('editOSId').value = '';
    document.getElementById('modalTitle').innerText = "Criar Ordem de Serviço";
    document.getElementById('btnSaveOS').innerText = "Salvar Ordem de Serviço";
}

function valorEfetivamenteRecebido(os) {
    if (os.statusPagamento === 'Pago') return Number(os.valor || 0);
    if (os.statusPagamento === 'Parcial (Entrada/Resta)') return Math.max(0, Math.min(Number(os.valor || 0), Number(os.valorRecebido || 0)));
    return 0;
}

async function carregarServicosAvulsos() {
    try {
        if (!db || !auth?.currentUser) throw new Error('Firebase indisponível');
        const snap = await db.collection('servicos_avulsos').get({source:'server'});
        servicosAvulsos = snap.docs.map(doc => ({idDoc:doc.id, ...doc.data()}));
        servicosDisponiveis = true;
        document.getElementById('serviceError').textContent = '';
    } catch(e) {
        servicosDisponiveis = false;
        document.getElementById('serviceError').textContent = 'Esta área será ativada quando publicarmos as novas regras do Firebase. As OS continuam disponíveis.';
    }
    renderizarServicosAvulsos();
}
function abrirModalServicos() {
    document.getElementById('servicesModal').style.display = 'flex';
    document.getElementById('serviceDate').value ||= new Date().toLocaleDateString('en-CA');
    carregarServicosAvulsos();
}
function fecharModalServicos() {
    document.getElementById('servicesModal').style.display = 'none';
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceEditId').value = '';
    document.getElementById('serviceSaveButton').textContent = 'Salvar serviço';
}
function renderizarServicosAvulsos() {
    const dinheiro = valor => Number(valor || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    document.getElementById('serviceCount').textContent = servicosAvulsos.length;
    document.getElementById('serviceTotal').textContent = dinheiro(servicosAvulsos.reduce((s,x)=>s+Number(x.valor || 0),0));
    document.getElementById('serviceReceived').textContent = dinheiro(servicosAvulsos.reduce((s,x)=>s+Number(x.valorRecebido || 0),0));
    const resumo = new Map();
    servicosAvulsos.forEach(s => { const item = resumo.get(s.tipo) || {qtd:0,valor:0}; item.qtd++;item.valor+=Number(s.valor || 0);resumo.set(s.tipo,item); });
    const resumoEl = document.getElementById('serviceSummary'); resumoEl.replaceChildren();
    [...resumo].sort((a,b)=>b[1].qtd-a[1].qtd).forEach(([tipo, r])=>{
        const p=document.createElement('p');p.className='service-row';p.textContent=`${tipo}: ${r.qtd} realizado(s) · ${dinheiro(r.valor)} cobrado`;resumoEl.appendChild(p);
    });
    if (!resumo.size) resumoEl.textContent = 'Nenhum serviço registrado ainda.';
    const lista=document.getElementById('serviceList');lista.replaceChildren();
    [...servicosAvulsos].sort((a,b)=>String(b.data).localeCompare(String(a.data))).forEach(s=>{
        const linha=document.createElement('div');linha.className='service-row';
        const descricao=document.createElement('span');descricao.textContent=`${s.data} · ${s.tipo} · ${dinheiro(s.valor)} · ${s.pagamento}`;
        const editar=document.createElement('button');editar.type='button';editar.textContent='Editar';editar.addEventListener('click',()=>editarServicoAvulso(s.idDoc));
        const apagar=document.createElement('button');apagar.type='button';apagar.textContent='Excluir';apagar.addEventListener('click',()=>excluirServicoAvulso(s.idDoc));
        linha.append(descricao,editar,apagar);lista.appendChild(linha);
    });
}
async function salvarServicoAvulso(e) {
    e.preventDefault();
    const erro=document.getElementById('serviceError');
    if (!servicosDisponiveis) { erro.textContent='Configure primeiro as novas regras do Firebase.';return; }
    const tipoSelecionado=document.getElementById('serviceKind').value;
    const tipo=tipoSelecionado==='Outro' ? document.getElementById('serviceOther').value.trim() : tipoSelecionado;
    if (!tipo) { erro.textContent='Informe o tipo de serviço.';return; }
    const valor=Number(document.getElementById('serviceValue').value);
    if (!Number.isFinite(valor) || valor<0) { erro.textContent='Informe um valor válido.';return; }
    const pagamento=document.getElementById('servicePayment').value;
    const registro={tipo,data:document.getElementById('serviceDate').value,valor,pagamento,valorRecebido:pagamento==='Pago'?valor:0,observacao:document.getElementById('serviceNote').value.trim()};
    const id=document.getElementById('serviceEditId').value;
    const botao=document.getElementById('serviceSaveButton');botao.disabled=true;erro.textContent='';
    try {
        const ref=id?db.collection('servicos_avulsos').doc(id):db.collection('servicos_avulsos').doc();
        await ref.set(registro);
        const i=servicosAvulsos.findIndex(s=>s.idDoc===ref.id);
        if(i<0)servicosAvulsos.unshift({idDoc:ref.id,...registro});else servicosAvulsos[i]={idDoc:ref.id,...registro};
        document.getElementById('serviceForm').reset();document.getElementById('serviceEditId').value='';
        document.getElementById('serviceDate').value=new Date().toLocaleDateString('en-CA');
        botao.textContent='Salvar serviço';renderizarServicosAvulsos();
    } catch(err) { erro.textContent='Não foi possível salvar no Firebase. Os campos continuam preenchidos.'; }
    finally { botao.disabled=false; }
}
function editarServicoAvulso(id) {
    const s=servicosAvulsos.find(item=>item.idDoc===id);if(!s)return;
    document.getElementById('serviceEditId').value=id;
    document.getElementById('serviceKind').value=tiposServico.includes(s.tipo)?s.tipo:'Outro';
    document.getElementById('serviceOther').value=tiposServico.includes(s.tipo)?'':s.tipo;
    document.getElementById('serviceDate').value=s.data;
    document.getElementById('serviceValue').value=s.valor;
    document.getElementById('servicePayment').value=s.pagamento;
    document.getElementById('serviceNote').value=s.observacao||'';
    document.getElementById('serviceSaveButton').textContent='Atualizar serviço';
    document.getElementById('serviceForm').scrollIntoView({behavior:'smooth'});
}
async function excluirServicoAvulso(id) {
    if(!confirm('Excluir este registro de serviço?'))return;
    try {
        await db.collection('servicos_avulsos').doc(id).delete();
        servicosAvulsos=servicosAvulsos.filter(s=>s.idDoc!==id);renderizarServicosAvulsos();
    } catch(err) { document.getElementById('serviceError').textContent='Não foi possível excluir no Firebase. O registro foi mantido.'; }
}

function abrirModalEstoque() { document.getElementById('stockModal').style.display = 'flex'; renderizarEstoque(); }
function fecharModalEstoque() { document.getElementById('stockModal').style.display = 'none'; }

function abrirModalRelatorio() {
    document.getElementById('reportModal').style.display = 'flex';
    
    let lucroTotal = 0;
    let contagemModelos = {};
    
    ordensServico.forEach(os => {
        lucroTotal += (valorEfetivamenteRecebido(os) - (os.custoPeca || 0));
        if (os.modelo) {
            contagemModelos[os.modelo] = (contagemModelos[os.modelo] || 0) + 1;
        }
    });

    let modeloMaisAtendido = "-";
    let maxQt = 0;
    for (let mod in contagemModelos) {
        if (contagemModelos[mod] > maxQt) {
            maxQt = contagemModelos[mod];
            modeloMaisAtendido = `${mod} (${maxQt}x)`;
        }
    }

    let avg = ordensServico.length > 0 ? (ordensServico.reduce((total, os) => total + Number(os.valor || 0), 0) / ordensServico.length) : 0;

    document.getElementById('reportMonthLucro').innerText = `R$ ${lucroTotal.toFixed(2)}`;
    document.getElementById('reportTopModel').innerText = modeloMaisAtendido;
    document.getElementById('reportTicketAvg').innerText = `R$ ${avg.toFixed(2)}`;
}

function fecharModalRelatorio() { document.getElementById('reportModal').style.display = 'none'; }

function abrirModalBackup() { document.getElementById('backupModal').style.display = 'flex'; }
function fecharModalBackup() { document.getElementById('backupModal').style.display = 'none'; }
async function exportarBackup() {
    const mensagem = document.getElementById('backupResult');
    mensagem.textContent = 'Preparando backup diretamente do Firebase...';
    try {
        if (!db || !auth?.currentUser) throw new Error('Entre no sistema antes de fazer o backup.');
        const [ordens, estoque, servicos] = await Promise.all([db.collection('ordens_servico').get({source:'server'}), db.collection('estoque_pecas').get({source:'server'}), db.collection('servicos_avulsos').get({source:'server'})]);
        const arquivo = {
            formato: 'oficina-do-celular-backup', versao: 1, projeto: firebaseConfig.projectId,
            criadoEm: new Date().toISOString(),
            ordens: ordens.docs.map(doc => ({ idDoc:doc.id, ...doc.data() })),
            estoque: estoque.docs.map(doc => ({ idDoc:doc.id, ...doc.data() })),
            servicos: servicos.docs.map(doc => ({ idDoc:doc.id, ...doc.data() }))
        };
        const url = URL.createObjectURL(new Blob([JSON.stringify(arquivo, null, 2)], {type:'application/json'}));
        const link = document.createElement('a'); link.href = url;
        link.download = `backup-oficina-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        mensagem.textContent = `Backup gerado: ${arquivo.ordens.length} OS, ${arquivo.estoque.length} peças e ${arquivo.servicos.length} serviços. Guarde o arquivo em local privado.`;
    } catch(e) { mensagem.textContent = 'Não foi possível baixar os dados diretamente do Firebase. Verifique a conexão e tente novamente.'; }
}
async function restaurarBackup() {
    const mensagem = document.getElementById('backupResult');
    const arquivo = document.getElementById('backupFile').files[0];
    if (!arquivo) { mensagem.textContent = 'Escolha um arquivo de backup JSON.'; return; }
    try {
        if (!db || !auth?.currentUser) throw new Error('Entre no sistema antes de restaurar.');
        if (arquivo.size > 100 * 1024 * 1024) throw new Error('Arquivo acima de 100 MB.');
        const dados = JSON.parse(await arquivo.text());
        if (dados.formato !== 'oficina-do-celular-backup' || dados.versao !== 1 || dados.projeto !== firebaseConfig.projectId || !Array.isArray(dados.ordens) || !Array.isArray(dados.estoque)) throw new Error('Arquivo inválido ou de outro projeto Firebase.');
        if (dados.ordens.some(o => !o || typeof o.idOS !== 'string') || dados.estoque.some(p => !p || typeof p.nome !== 'string') || (dados.servicos && (!Array.isArray(dados.servicos) || dados.servicos.some(s => !s || typeof s.tipo !== 'string')))) throw new Error('Registros inválidos no backup.');
        const digitado = prompt(`Backup de ${dados.ordens.length} OS, ${dados.estoque.length} peças e ${(dados.servicos || []).length} serviços. Apenas registros ausentes serão adicionados; existentes não serão substituídos. Digite RESTAURAR para continuar:`);
        if (digitado !== 'RESTAURAR') { mensagem.textContent = 'Restauração cancelada.'; return; }
        const [snapOS, snapEstoque, snapServicos] = await Promise.all([db.collection('ordens_servico').get({source:'server'}), db.collection('estoque_pecas').get({source:'server'}), db.collection('servicos_avulsos').get({source:'server'})]);
        const idsOS = new Set(snapOS.docs.map(d => d.id));
        const numerosOS = new Set(snapOS.docs.map(d => d.data().idOS));
        const idsEstoque = new Set(snapEstoque.docs.map(d => d.id));
        const nomesEstoque = new Set(snapEstoque.docs.map(d => `${d.data().nome}|${d.data().fornecedor || ''}`));
        const estoquePorNome = new Map(snapEstoque.docs.map(d => [`${d.data().nome}|${d.data().fornecedor || ''}`, d.id]));
        const mapeamentoEstoque = new Map();
        const idsServicos = new Set(snapServicos.docs.map(d => d.id));
        const chavesServicos = new Set(snapServicos.docs.map(d => `${d.data().tipo}|${d.data().data}|${d.data().valor}|${d.data().observacao || ''}`));
        let total = 0;
        mensagem.textContent = 'Restaurando registros ausentes...';
        for (const [colecao, itens, ids, chaves, chave] of [
            ['estoque_pecas',dados.estoque,idsEstoque,nomesEstoque,p => `${p.nome}|${p.fornecedor || ''}`],
            ['ordens_servico',dados.ordens,idsOS,numerosOS,o => o.idOS],
            ['servicos_avulsos',dados.servicos || [],idsServicos,chavesServicos,s => `${s.tipo}|${s.data}|${s.valor}|${s.observacao || ''}`]
        ]) {
            for (const item of itens) {
                const key = chave(item);
                if ((item.idDoc && ids.has(item.idDoc)) || (colecao !== 'servicos_avulsos' && chaves.has(key))) {
                    if (colecao === 'estoque_pecas' && item.idDoc) mapeamentoEstoque.set(item.idDoc, ids.has(item.idDoc) ? item.idDoc : estoquePorNome.get(key));
                    continue;
                }
                const {idDoc, ...conteudo} = item;
                if (colecao === 'ordens_servico' && conteudo.estoquePecaId && mapeamentoEstoque.has(conteudo.estoquePecaId)) conteudo.estoquePecaId = mapeamentoEstoque.get(conteudo.estoquePecaId);
                const ref = idDoc ? db.collection(colecao).doc(idDoc) : db.collection(colecao).doc();
                const inseriu = await db.runTransaction(async t => {
                    if ((await t.get(ref)).exists) return false;
                    t.set(ref, conteudo); return true;
                });
                if (inseriu) {
                    total++; ids.add(ref.id); chaves.add(key);
                    if (colecao === 'estoque_pecas') mapeamentoEstoque.set(item.idDoc, ref.id);
                }
            }
        }
        await carregarDadosDoBanco();
        mensagem.textContent = `Concluído: ${total} registros ausentes restaurados. Os registros existentes foram preservados.`;
    } catch(e) { mensagem.textContent = `Restauração interrompida: ${e.message}. Confira a lista antes de tentar novamente; registros já incluídos não serão duplicados.`; }
}

function inicializarCanvas() {
    canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 300;
    canvas.height = canvas.offsetHeight || 120;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    assinaturaVazia = canvas.toDataURL();

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);

    canvas.addEventListener('touchstart', startDrawingTouch, { passive: false });
    canvas.addEventListener('touchmove', drawTouch, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) { isDrawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); }
function draw(e) { if (!isDrawing) return; ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); }
function stopDrawing() { isDrawing = false; }

function startDrawingTouch(e) {
    e.preventDefault();
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
}

function drawTouch(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    ctx.stroke();
}

function limparAssinatura() { if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); }

function buscarOS() {
    atualizarPainel();
}
function limparFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('paymentFilter').value = 'Todos';
    document.getElementById('monthFilter').value = '';
    filtrarPorStatus('Todos');
}

function imprimirCupom(osId) {
    const os = ordensServico.find(item => item.idOS === osId);
    if (!os) return;

    const chk = os.checklist || { touch:'-', charge:'-', cameras:'-', bio:'-', audio:'-', signal:'-' };

    const printSection = document.getElementById('printSection');
    printSection.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 300px; margin: 0 auto; color: #000;">
            <h2 style="text-align: center; margin: 0; font-size: 16px;"><svg class="ui-icon" aria-hidden="true"><use href="icons.svg#phone"></use></svg> OFICINA DO CELULAR</h2>
            <p style="text-align: center; margin: 2px 0; font-size: 12px;">ORDEM DE SERVIÇO</p>
            <p style="text-align: center; font-size: 11px; margin-bottom: 5px;">Data: ${os.data}</p>
            <hr style="border-top: 1px dashed #000; margin: 5px 0;">
            
            <p style="font-size: 12px; margin: 2px 0;"><strong>Nº OS:</strong> ${os.idOS}</p>
            <p style="font-size: 12px; margin: 2px 0;"><strong>Cliente:</strong> ${os.cliente}</p>
            <p style="font-size: 12px; margin: 2px 0;"><strong>Tel:</strong> ${os.whatsapp}</p>
            <p style="font-size: 12px; margin: 2px 0;"><strong>Aparelho:</strong> ${os.modelo}</p>
            <p style="font-size: 12px; margin: 2px 0;"><strong>IMEI:</strong> ${os.imei}</p>
            
            <hr style="border-top: 1px dashed #000; margin: 5px 0;">
            <p style="font-size: 11px; margin: 2px 0;"><strong>CHECK-LIST DE ENTRADA:</strong></p>
            <p style="font-size: 10px; margin: 1px 0;">Touch: ${chk.touch} | Carga: ${chk.charge} | Câmeras: ${chk.cameras}</p>
            <p style="font-size: 10px; margin: 1px 0;">FaceID: ${chk.bio} | Áudio: ${chk.audio} | Sinal: ${chk.signal}</p>
            <hr style="border-top: 1px dashed #000; margin: 5px 0;">

            <p style="font-size: 12px; margin: 2px 0;"><strong>Defeito:</strong> ${os.defeito}</p>
            <p style="font-size: 12px; margin: 2px 0;"><strong>Peças Trocadas:</strong> ${os.pecasTrocadas || 'N/A'}</p>
            <p style="font-size: 12px; margin: 2px 0;"><strong>Fornecedor:</strong> ${os.fornecedorPeca || 'N/A'}</p>
            <p style="font-size: 12px; margin: 2px 0;"><strong>Pagamento:</strong> ${os.statusPagamento || 'Aguardando'} ${os.detalhesPagamento ? `(${os.detalhesPagamento})` : ''}</p>
            <p style="font-size: 12px; margin: 2px 0;"><strong>Obs/Riscos:</strong> ${os.obs}</p>
            <p style="font-size: 13px; margin: 5px 0;"><strong>Valor Total:</strong> R$ ${os.valor.toFixed(2)}</p>
            
            <hr style="border-top: 1px dashed #000; margin: 8px 0;">
            
            <div style="font-size: 9px; text-align: justify; line-height: 1.2;">
                <strong>TERMO DE GARANTIA:</strong> Garantia de 90 dias para os serviços prestados e peças trocadas. Não cobre mau uso, quedas ou contato com líquidos. Prazo máximo para retirada: 90 dias.
            </div>
            
            <div style="text-align: center; margin-top: 15px;">
                <img src="${os.assinatura}" style="width: 180px; height: 50px; border-bottom: 1px solid #000;"><br>
                <small style="font-size: 10px;">Assinatura do Cliente</small>
            </div>
        </div>
    `;

    setTimeout(() => { window.print(); }, 200);
}

function imprimirEtiqueta(osId) {
    const os = ordensServico.find(item => item.idOS === osId);
    if (!os) return;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${os.idOS}`;

    const printSection = document.getElementById('printSection');
    printSection.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 200px; padding: 5px; text-align: center; color: #000; border: 1px solid #000; border-radius: 5px;">
            <strong style="font-size: 14px; display: block;">${os.idOS}</strong>
            <span style="font-size: 11px; display: block;">${os.cliente}</span>
            <span style="font-size: 11px; font-weight: bold; display: block;">${os.modelo}</span>
            <img src="${qrUrl}" style="width: 70px; height: 70px; margin: 5px 0;">
            <span style="font-size: 9px; display: block;">Oficina do Celular</span>
        </div>
    `;

    setTimeout(() => { window.print(); }, 300);
}

window.onload = function() { configurarCatalogos(); checarSessao(); };
