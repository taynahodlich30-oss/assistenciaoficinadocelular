const SENHA_ACESSO = "123456"; 

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
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        // Impede que campos opcionais vazios façam o Firestore rejeitar o documento.
        db.settings({ ignoreUndefinedProperties: true });
    }
} catch (e) {
    console.error("Erro Firebase:", e);
}

let ordensServico = [];
let estoquePecas = [];
let fotosTemp = [];
let canvas, ctx;
let isDrawing = false;
let statusFiltroAtual = "Todos";

function mostrarAviso(mensagem, tipo = 'sucesso') {
    let aviso = document.getElementById('appNotice');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'appNotice';
        aviso.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:99999;max-width:360px;padding:14px 18px;border-radius:12px;color:#fff;font-weight:700;font-size:14px;box-shadow:0 12px 35px rgba(0,0,0,.35);transition:.25s;';
        document.body.appendChild(aviso);
    }
    aviso.style.background = tipo === 'erro' ? '#dc2626' : tipo === 'aviso' ? '#d97706' : '#16a34a';
    aviso.textContent = mensagem;
    aviso.style.display = 'block';
    clearTimeout(mostrarAviso.timer);
    mostrarAviso.timer = setTimeout(() => { aviso.style.display = 'none'; }, 5000);
}

function textoErroFirebase(erro) {
    const codigo = erro && erro.code ? ` (${erro.code})` : '';
    return `Não foi possível salvar no Firebase${codigo}. Verifique as regras do Firestore e a internet.`;
}

function validarSenha() {
    const input = document.getElementById('passwordInput').value;
    if (input === SENHA_ACESSO) {
        sessionStorage.setItem('oficina_logado', 'true');
        exibirApp();
    } else {
        document.getElementById('loginError').innerText = "Senha incorreta!";
    }
}

function checarSessao() {
    if (sessionStorage.getItem('oficina_logado') === 'true') {
        exibirApp();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appScreen').style.display = 'none';
    }
}

function logout() {
    sessionStorage.removeItem('oficina_logado');
    location.reload();
}

function exibirApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    inicializarCanvas();
    carregarDadosDoBanco();
}

async function carregarDadosDoBanco() {
    if (db) {
        try {
            let snapOS = await db.collection('ordens_servico').get();
            const ordensLocais = JSON.parse(localStorage.getItem('oficina_os_db')) || [];
            if (snapOS.empty && ordensLocais.length > 0) {
                for (const ordemLocal of ordensLocais) {
                    const dados = { ...ordemLocal };
                    delete dados.idDoc;
                    await db.collection('ordens_servico').add(dados);
                }
                snapOS = await db.collection('ordens_servico').get();
                mostrarAviso(`${ordensLocais.length} ordem(ns) antiga(s) enviada(s) ao Firebase.`);
            }
            ordensServico = [];
            snapOS.forEach(doc => ordensServico.push({ idDoc: doc.id, ...doc.data() }));

            let snapStock = await db.collection('estoque_pecas').get();
            const estoqueLocal = JSON.parse(localStorage.getItem('oficina_stock_db')) || [];
            if (snapStock.empty && estoqueLocal.length > 0) {
                for (const pecaLocal of estoqueLocal) {
                    const dados = { ...pecaLocal };
                    delete dados.idDoc;
                    await db.collection('estoque_pecas').add(dados);
                }
                snapStock = await db.collection('estoque_pecas').get();
            }
            estoquePecas = [];
            snapStock.forEach(doc => estoquePecas.push({ idDoc: doc.id, ...doc.data() }));
            localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));
            localStorage.setItem('oficina_stock_db', JSON.stringify(estoquePecas));
        } catch (e) {
            console.error('Erro ao carregar Firebase:', e);
            carregarLocal();
            mostrarAviso('Sem conexão com o Firebase. Exibindo a cópia salva neste aparelho.', 'aviso');
        }
    } else {
        carregarLocal();
    }
    atualizarPainel();
    atualizarSelectEstoque();
}

function carregarLocal() {
    ordensServico = JSON.parse(localStorage.getItem('oficina_os_db')) || [];
    estoquePecas = JSON.parse(localStorage.getItem('oficina_stock_db')) || [];
}

async function salvarNoBanco(novaOS) {
    if (novaOS.idDoc) {
        if (!db) throw new Error('Firebase não inicializado');
        await db.collection('ordens_servico').doc(novaOS.idDoc).set(novaOS);
        const index = ordensServico.findIndex(o => o.idDoc === novaOS.idDoc || o.idOS === novaOS.idOS);
        if (index !== -1) {
            ordensServico[index] = novaOS;
        } else {
            ordensServico.unshift(novaOS);
        }
    } else {
        if (!db) throw new Error('Firebase não inicializado');
        const dadosFirebase = { ...novaOS };
        delete dadosFirebase.idDoc;
        const docRef = await db.collection('ordens_servico').add(dadosFirebase);
        novaOS.idDoc = docRef.id;
        ordensServico.unshift(novaOS);
    }
    localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));
    atualizarPainel();
    return novaOS;
}

async function excluirOS(osId) {
    if (!confirm("Tem certeza que deseja excluir esta Ordem de Serviço?")) return;

    const index = ordensServico.findIndex(o => o.idOS === osId);
    if (index !== -1) {
        const item = ordensServico[index];
        ordensServico.splice(index, 1);
        localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));

        if (db && item.idDoc) {
            try { await db.collection('ordens_servico').doc(item.idDoc).delete(); } catch(e){ console.error(e); }
        }
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
    document.getElementById('serviceDescription').value = os.descricaoServico || '';
    document.getElementById('deviceObs').value = os.obs || '';
    document.getElementById('usedPart').value = os.peca || '';
    document.getElementById('partSupplier').value = os.fornecedorPeca || 'Não Informado';
    document.getElementById('partCost').value = os.custoPeca || '';
    document.getElementById('serviceStatus').value = os.status || 'Em análise';
    document.getElementById('paymentStatus').value = os.statusPagamento || 'Aguardando Pagamento';
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
        if (!db) throw new Error('Firebase não inicializado');
        const doc = await db.collection('estoque_pecas').add(novaPeca);
        novaPeca.idDoc = doc.id;
        estoquePecas.unshift(novaPeca);
        localStorage.setItem('oficina_stock_db', JSON.stringify(estoquePecas));
        document.getElementById('stockForm').reset();
        renderizarEstoque();
        atualizarSelectEstoque();
        mostrarAviso('Peça salva no Firebase com sucesso!');
    } catch (err) {
        console.error('Erro ao salvar peça:', err);
        mostrarAviso(textoErroFirebase(err), 'erro');
    }
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
            ${item.qtd <= 2 ? '<span style="color:#f87171; font-size:11px; font-weight:bold;">⚠️ Baixo</span>' : ''}
        `;
        list.appendChild(div);
    });
}

function atualizarSelectEstoque() {
    const select = document.getElementById('stockPartSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione uma peça...</option>';
    estoquePecas.forEach((p, idx) => {
        if (p.qtd > 0) {
            select.innerHTML += `<option value="${idx}">${p.nome} (${p.fornecedor || 'Geral'}) - R$ ${p.custo.toFixed(2)}</option>`;
        }
    });
}

function selecionarPecaEstoque() {
    const idx = document.getElementById('stockPartSelect').value;
    if (idx !== "") {
        const peca = estoquePecas[idx];
        document.getElementById('usedPart').value = peca.nome;
        document.getElementById('partSupplier').value = peca.fornecedor || 'Não Informado';
        document.getElementById('partCost').value = peca.custo;
    }
}

async function darBaixaEstoque(nomePeca) {
    const peca = estoquePecas.find(p => p.nome === nomePeca);
    if (peca && peca.qtd > 0) {
        peca.qtd -= 1;
        localStorage.setItem('oficina_stock_db', JSON.stringify(estoquePecas));
        if (db && peca.idDoc) {
            try { await db.collection('estoque_pecas').doc(peca.idDoc).update({ qtd: peca.qtd }); } catch(e){}
        }
        atualizarSelectEstoque();
    }
}

function verificarHistoricoCliente() {
    const phone = document.getElementById('clientPhone').value.replace(/\D/g, '');
    if (!phone) return;
    const anteriores = ordensServico.filter(os => os.whatsapp.replace(/\D/g, '') === phone);
    const alertBox = document.getElementById('clientHistoryAlert');
    
    if (anteriores.length > 0) {
        alertBox.innerText = `🔍 Cliente antigo! ${anteriores.length} OS anterior(es) encontrada(s).`;
    } else {
        alertBox.innerText = `✨ Novo cliente no sistema.`;
    }
}

async function alterarStatusOS(osId, novoStatus) {
    const os = ordensServico.find(item => item.idOS === osId);
    if (os) {
        os.status = novoStatus;
        localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));

        if (db && os.idDoc) {
            try { await db.collection('ordens_servico').doc(os.idDoc).update({ status: novoStatus }); } catch (e) {}
        }
        atualizarPainel();
    }
}

function comprimirImagem(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const imagem = new Image();
            imagem.onerror = reject;
            imagem.onload = () => {
                const limite = 960;
                const escala = Math.min(1, limite / Math.max(imagem.width, imagem.height));
                const largura = Math.round(imagem.width * escala);
                const altura = Math.round(imagem.height * escala);
                const fotoCanvas = document.createElement('canvas');
                fotoCanvas.width = largura;
                fotoCanvas.height = altura;
                fotoCanvas.getContext('2d').drawImage(imagem, 0, 0, largura, altura);
                resolve(fotoCanvas.toDataURL('image/jpeg', 0.65));
            };
            imagem.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

async function previewImages(event) {
    const files = Array.from(event.target.files).slice(0, 3);
    const container = document.getElementById('previewContainer');
    container.innerHTML = '';
    fotosTemp = [];

    if (event.target.files.length > 3) {
        mostrarAviso('Para salvar com segurança, use no máximo 3 fotos por ordem.', 'aviso');
    }

    for (const file of files) {
        try {
            const fotoComprimida = await comprimirImagem(file);
            fotosTemp.push(fotoComprimida);
            const img = document.createElement('img');
            img.src = fotoComprimida;
            img.className = 'preview-thumb';
            container.appendChild(img);
        } catch (erro) {
            console.error('Erro ao preparar foto:', erro);
            mostrarAviso('Não foi possível preparar uma das fotos.', 'erro');
        }
    }
}

async function salvarOS(event) {
    event.preventDefault();

    const botaoSalvar = document.getElementById('btnSaveOS');
    const textoOriginalBotao = botaoSalvar.innerText;
    botaoSalvar.disabled = true;
    botaoSalvar.innerText = 'Salvando no Firebase...';

    const docIdExistente = document.getElementById('editDocId').value;
    const osIdExistente = document.getElementById('editOSId').value;
    const osNumber = osIdExistente || ("OS-" + Math.floor(100000 + Math.random() * 900000));
    
    const pecaUtilizada = document.getElementById('usedPart').value || "Nenhuma";
    const fornecedorPeca = document.getElementById('partSupplier').value || "Não Informado";
    const custoPecaVal = parseFloat(document.getElementById('partCost').value) || 0;

    const novaOS = {
        idDoc: docIdExistente || undefined,
        idOS: osNumber,
        data: new Date().toLocaleDateString('pt-BR'),
        cliente: document.getElementById('clientName').value,
        whatsapp: document.getElementById('clientPhone').value,
        modelo: document.getElementById('deviceModel').value,
        imei: document.getElementById('deviceIMEI').value,
        defeito: document.getElementById('deviceDefect').value,
        pecasTrocadas: document.getElementById('replacedParts').value || "Nenhuma informada",
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
        fornecedorPeca: fornecedorPeca,
        custoPeca: custoPecaVal,
        status: document.getElementById('serviceStatus').value,
        statusPagamento: document.getElementById('paymentStatus').value,
        detalhesPagamento: document.getElementById('paymentDetails').value || "",
        valor: parseFloat(document.getElementById('servicePrice').value) || 0,
        fotos: fotosTemp,
        assinatura: canvas.toDataURL()
    };

    // Guarda no histórico de estoque se informou peça e custo
    if (pecaUtilizada !== "Nenhuma" && custoPecaVal > 0) {
        const jaExisteEmEstoque = estoquePecas.find(p => p.nome.toLowerCase() === pecaUtilizada.toLowerCase() && p.fornecedor === fornecedorPeca);
        if (!jaExisteEmEstoque) {
            const itemEstoque = { nome: pecaUtilizada, fornecedor: fornecedorPeca, qtd: 0, custo: custoPecaVal };
            estoquePecas.unshift(itemEstoque);
            localStorage.setItem('oficina_stock_db', JSON.stringify(estoquePecas));
            if (db) { try { db.collection('estoque_pecas').add(itemEstoque); } catch(e){} }
        }
    }

    if (!docIdExistente && pecaUtilizada !== "Nenhuma") {
        darBaixaEstoque(pecaUtilizada);
    }

    try {
        await salvarNoBanco(novaOS);
        fecharModalOS();
        document.getElementById('osForm').reset();
        document.getElementById('editDocId').value = '';
        document.getElementById('editOSId').value = '';
        document.getElementById('modalTitle').innerText = "Criar Ordem de Serviço";
        document.getElementById('previewContainer').innerHTML = '';
        document.getElementById('clientHistoryAlert').innerText = '';
        fotosTemp = [];
        limparAssinatura();
        mostrarAviso('Ordem de serviço salva no Firebase com sucesso!');
    } catch (erro) {
        console.error('Erro ao salvar ordem no Firebase:', erro);
        mostrarAviso(textoErroFirebase(erro), 'erro');
    } finally {
        botaoSalvar.disabled = false;
        botaoSalvar.innerText = textoOriginalBotao.includes('Atualizar') ? 'Atualizar Ordem de Serviço' : 'Salvar Ordem de Serviço';
    }
}

function atualizarPainel() {
    const osList = document.getElementById('osList');
    osList.innerHTML = '';

    let total = ordensServico.length;
    let analise = 0, orcamento = 0, reparo = 0, prontos = 0;
    let bruto = 0, custo = 0;

    ordensServico.forEach((os) => {
        if (os.status === 'Em análise') analise++;
        if (os.status === 'Em orçamento') orcamento++;
        if (os.status === 'Em reparo') reparo++;
        if (os.status === 'Pronto') prontos++;

        bruto += (os.valor || 0);
        custo += (os.custoPeca || 0);
    });

    document.getElementById('countTotal').innerText = total;
    document.getElementById('countAnalise').innerText = analise;
    document.getElementById('countOrcamento').innerText = orcamento;
    document.getElementById('countReparo').innerText = reparo;
    document.getElementById('countProntos').innerText = prontos;

    document.getElementById('totalBruto').innerText = `R$ ${bruto.toFixed(2)}`;
    document.getElementById('totalCusto').innerText = `R$ ${custo.toFixed(2)}`;
    document.getElementById('totalLucro').innerText = `R$ ${(bruto - custo).toFixed(2)}`;

    const ordensFiltradas = ordensServico.filter(os => {
        if (statusFiltroAtual === "Todos") return true;
        return os.status === statusFiltroAtual;
    });

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
            <p>📱 <strong>Aparelho:</strong> ${os.modelo} (IMEI: ${os.imei})</p>
            <p>🔧 <strong>Defeito Relatado:</strong> ${os.defeito}</p>
            <p style="color: #4ade80;">⚙️ <strong>Componentes Trocados:</strong> ${os.pecasTrocadas || 'Nenhum registrado'}</p>
            <p style="color: #cbd5e1; font-size: 12px;">📝 <strong>Descrição:</strong> ${os.descricaoServico || 'Sem detalhes'}</p>
            <p>🏷️ <strong>Fornecedor Peça:</strong> <strong style="color: #a855f7;">${os.fornecedorPeca || 'Não Informado'}</strong></p>
            <p>💳 <strong>Pagamento:</strong> <span style="color:${corPagamento}; font-weight:bold;">${os.statusPagamento || 'Aguardando'}</span> ${os.detalhesPagamento ? `(${os.detalhesPagamento})` : ''}</p>
            <p>💰 <strong>Valor Total:</strong> R$ ${os.valor.toFixed(2)} | <strong>Custo Peça:</strong> R$ ${(os.custoPeca || 0).toFixed(2)}</p>
            ${fotosHTML}
            <div class="os-card-actions">
                <button class="btn-sm btn-wa-orcamento" onclick="abrirModalOrcamentoOpcoes('${os.idOS}', '${os.whatsapp}', '${os.modelo}')">🟡 Orçamento</button>
                <button class="btn-sm btn-wa-aprovado" onclick="waNotificarAprovado('${os.idOS}')">👍 Aprovado</button>
                <button class="btn-sm btn-wa-pronto" onclick="waPronto('${os.whatsapp}', '${os.idOS}', '${os.modelo}', '${os.valor}')">🟢 Pronto</button>
                <button class="btn-sm btn-wa-comprovante" onclick="waEnviarComprovante('${os.idOS}')">📲 Via Zap</button>
            </div>
            <div class="os-card-subactions">
                <button class="btn-sm" onclick="imprimirCupom('${os.idOS}')">🖨️ OS Papel</button>
                <button class="btn-sm" style="background:#a855f7;" onclick="imprimirEtiqueta('${os.idOS}')">🏷️ Etiqueta</button>
                <button class="btn-sm btn-edit" onclick="editarOS('${os.idOS}')">✏️ Editar</button>
                <button class="btn-sm btn-delete" onclick="excluirOS('${os.idOS}')">🗑️ Excluir</button>
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

function waEnviarComprovante(osId) {
    const os = ordensServico.find(item => item.idOS === osId);
    if (!os) return;

    const num = os.whatsapp.replace(/\D/g, '');
    const qrCodeGarantia = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GARANTIA-${os.idOS}`;

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
    texto += `📲 *Consulte seu QR Code de Garantia:* ${qrCodeGarantia}\n\n`;
    texto += `Agradecemos a preferência! Caso precise, estamos à disposição.`;

    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(texto)}`, '_blank');
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
    document.getElementById('editDocId').value = '';
    document.getElementById('editOSId').value = '';
    document.getElementById('modalTitle').innerText = "Criar Ordem de Serviço";
    document.getElementById('btnSaveOS').innerText = "Salvar Ordem de Serviço";
}

function abrirModalEstoque() { document.getElementById('stockModal').style.display = 'flex'; renderizarEstoque(); }
function fecharModalEstoque() { document.getElementById('stockModal').style.display = 'none'; }

function abrirModalRelatorio() {
    document.getElementById('reportModal').style.display = 'flex';
    
    let lucroTotal = 0;
    let contagemModelos = {};
    
    ordensServico.forEach(os => {
        lucroTotal += ((os.valor || 0) - (os.custoPeca || 0));
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

    let avg = ordensServico.length > 0 ? (lucroTotal / ordensServico.length) : 0;

    document.getElementById('reportMonthLucro').innerText = `R$ ${lucroTotal.toFixed(2)}`;
    document.getElementById('reportTopModel').innerText = modeloMaisAtendido;
    document.getElementById('reportTicketAvg').innerText = `R$ ${avg.toFixed(2)}`;
}

function fecharModalRelatorio() { document.getElementById('reportModal').style.display = 'none'; }

function inicializarCanvas() {
    canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 300;
    canvas.height = canvas.offsetHeight || 120;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;

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
    const termo = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.os-card');
    cards.forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(termo) ? 'block' : 'none';
    });
}

function imprimirCupom(osId) {
    const os = ordensServico.find(item => item.idOS === osId);
    if (!os) return;

    const chk = os.checklist || { touch:'-', charge:'-', cameras:'-', bio:'-', audio:'-', signal:'-' };

    const printSection = document.getElementById('printSection');
    printSection.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 300px; margin: 0 auto; color: #000;">
            <h2 style="text-align: center; margin: 0; font-size: 16px;">📱 OFICINA DO CELULAR</h2>
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

window.onload = function() { checarSessao(); };
