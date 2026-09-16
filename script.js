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
    }
} catch (e) {
    console.error("Erro Firebase:", e);
}

let ordensServico = [];
let estoquePecas = [];
let fotosTemp = [];
let canvas, ctx;
let isDrawing = false;

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
            const snapOS = await db.collection('ordens_servico').get();
            ordensServico = [];
            snapOS.forEach(doc => ordensServico.push({ idDoc: doc.id, ...doc.data() }));

            const snapStock = await db.collection('estoque_pecas').get();
            estoquePecas = [];
            snapStock.forEach(doc => estoquePecas.push({ idDoc: doc.id, ...doc.data() }));
        } catch (e) {
            carregarLocal();
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
    ordensServico.unshift(novaOS);
    localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));

    if (db) {
        try {
            const docRef = await db.collection('ordens_servico').add(novaOS);
            novaOS.idDoc = docRef.id;
        } catch (e) { console.error(e); }
    }
    atualizarPainel();
}

// ESTOQUE - SALVAR E DAR BAIXA AUTOMÁTICA
async function salvarPecaEstoque(e) {
    e.preventDefault();
    const novaPeca = {
        nome: document.getElementById('stockName').value,
        qtd: parseInt(document.getElementById('stockQty').value) || 0,
        custo: parseFloat(document.getElementById('stockCost').value) || 0
    };

    estoquePecas.unshift(novaPeca);
    localStorage.setItem('oficina_stock_db', JSON.stringify(estoquePecas));

    if (db) {
        try {
            const doc = await db.collection('estoque_pecas').add(novaPeca);
            novaPeca.idDoc = doc.id;
        } catch (err) { console.error(err); }
    }

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
                <small style="color:#cbd5e1">Qtd: ${item.qtd} un | R$ ${item.custo.toFixed(2)}</small>
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
            select.innerHTML += `<option value="${idx}">${p.nome} (${p.qtd} un) - R$ ${p.custo.toFixed(2)}</option>`;
        }
    });
}

function selecionarPecaEstoque() {
    const idx = document.getElementById('stockPartSelect').value;
    if (idx !== "") {
        const peca = estoquePecas[idx];
        document.getElementById('usedPart').value = peca.nome;
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

// VERIFICAR HISTÓRICO DO CLIENTE
function verificarHistoricoCliente() {
    const phone = document.getElementById('clientPhone').value.replace(/\D/g, '');
    if (!phone) return;
    const anteriores = ordensServico.filter(os => os.whatsapp.replace(/\D/g, '') === phone);
    const alertBox = document.getElementById('clientHistoryAlert');
    
    if (anteriores.length > 0) {
        alertBox.innerText = `🔍 Cliente antigo encontrado! ${anteriores.length} OS anterior(es) registrada(s).`;
    } else {
        alertBox.innerText = `✨ Novo cliente no sistema.`;
    }
}

// MUDAR STATUS OS
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

function salvarOS(event) {
    event.preventDefault();

    const osNumber = "OS-" + Math.floor(100000 + Math.random() * 900000);
    const pecaUtilizada = document.getElementById('usedPart').value || "Nenhuma";

    const novaOS = {
        idOS: osNumber,
        data: new Date().toLocaleDateString('pt-BR'),
        cliente: document.getElementById('clientName').value,
        whatsapp: document.getElementById('clientPhone').value,
        modelo: document.getElementById('deviceModel').value,
        imei: document.getElementById('deviceIMEI').value,
        defeito: document.getElementById('deviceDefect').value,
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
        custoPeca: parseFloat(document.getElementById('partCost').value) || 0,
        status: document.getElementById('serviceStatus').value,
        valor: parseFloat(document.getElementById('servicePrice').value) || 0,
        fotos: fotosTemp,
        assinatura: canvas.toDataURL()
    };

    if (pecaUtilizada !== "Nenhuma") {
        darBaixaEstoque(pecaUtilizada);
    }

    salvarNoBanco(novaOS);
    fecharModalOS();
    document.getElementById('osForm').reset();
    document.getElementById('previewContainer').innerHTML = '';
    document.getElementById('clientHistoryAlert').innerText = '';
    fotosTemp = [];
    limparAssinatura();
}

function atualizarPainel() {
    const osList = document.getElementById('osList');
    osList.innerHTML = '';

    let total = ordensServico.length;
    let analise = 0, reparo = 0, prontos = 0;
    let bruto = 0, custo = 0;

    ordensServico.forEach((os) => {
        if (os.status === 'Em análise') analise++;
        if (os.status === 'Em reparo') reparo++;
        if (os.status === 'Pronto') prontos++;

        bruto += (os.valor || 0);
        custo += (os.custoPeca || 0);

        let fotosHTML = '';
        if (os.fotos && os.fotos.length > 0) {
            fotosHTML = '<div class="preview-container">';
            os.fotos.forEach(f => { fotosHTML += `<img src="${f}" class="preview-thumb">`; });
            fotosHTML += '</div>';
        }

        const card = document.createElement('div');
        card.className = 'os-card';
        card.innerHTML = `
            <div class="os-card-header">
                <strong>${os.idOS} - ${os.cliente}</strong>
                <select class="status-select" onchange="alterarStatusOS('${os.idOS}', this.value)">
                    <option value="Em orçamento" ${os.status === 'Em orçamento' ? 'selected' : ''}>Em orçamento</option>
                    <option value="Em análise" ${os.status === 'Em análise' ? 'selected' : ''}>Em análise</option>
                    <option value="Em reparo" ${os.status === 'Em reparo' ? 'selected' : ''}>Em reparo</option>
                    <option value="Pronto" ${os.status === 'Pronto' ? 'selected' : ''}>Pronto</option>
                </select>
            </div>
            <p>📱 <strong>Aparelho:</strong> ${os.modelo} (IMEI: ${os.imei})</p>
            <p>🔧 <strong>Defeito:</strong> ${os.defeito}</p>
            <p>💰 <strong>Valor:</strong> R$ ${os.valor.toFixed(2)} | <strong>Custo:</strong> R$ ${(os.custoPeca || 0).toFixed(2)}</p>
            ${fotosHTML}
            <div class="os-card-actions">
                <button class="btn-sm btn-wa-orcamento" onclick="waOrcamento('${os.whatsapp}', '${os.idOS}', '${os.modelo}', '${os.valor}')">🟡 WhatsApp</button>
                <button class="btn-sm btn-wa-pronto" onclick="waPronto('${os.whatsapp}', '${os.idOS}', '${os.modelo}', '${os.valor}')">🟢 Pronto</button>
                <button class="btn-sm" onclick="imprimirCupom('${os.idOS}')">🖨️ Termo</button>
                <button class="btn-sm" style="background:#a855f7;" onclick="imprimirEtiqueta('${os.idOS}')">🏷️ Etiqueta</button>
            </div>
        `;
        osList.appendChild(card);
    });

    document.getElementById('countTotal').innerText = total;
    document.getElementById('countAnalise').innerText = analise;
    document.getElementById('countReparo').innerText = reparo;
    document.getElementById('countProntos').innerText = prontos;

    document.getElementById('totalBruto').innerText = `R$ ${bruto.toFixed(2)}`;
    document.getElementById('totalCusto').innerText = `R$ ${custo.toFixed(2)}`;
    document.getElementById('totalLucro').innerText = `R$ ${(bruto - custo).toFixed(2)}`;
}

function waOrcamento(telefone, osId, modelo, valor) {
    const num = telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! Referente à sua *${osId}* do aparelho *${modelo}*: O orçamento total ficou em *R$ ${parseFloat(valor).toFixed(2)}*. Podemos aprovar o serviço?`);
    window.open(`https://wa.me/55${num}?text=${msg}`, '_blank');
}

function waPronto(telefone, osId, modelo, valor) {
    const num = telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! O seu *${modelo}* (${osId}) já está pronto para retirada. Valor: *R$ ${parseFloat(valor).toFixed(2)}*. Aguardamos você!`);
    window.open(`https://wa.me/55${num}?text=${msg}`, '_blank');
}

function abrirModalOS() { document.getElementById('osModal').style.display = 'flex'; }
function fecharModalOS() { document.getElementById('osModal').style.display = 'none'; }
function abrirModalEstoque() { document.getElementById('stockModal').style.display = 'flex'; renderizarEstoque(); }
function fecharModalEstoque() { document.getElementById('stockModal').style.display = 'none'; }

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

// IMPRESSÃO DE CUPOM COMPLETO COM CHECKLIST
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
            <p style="font-size: 12px; margin: 2px 0;"><strong>Obs/Riscos:</strong> ${os.obs}</p>
            <p style="font-size: 13px; margin: 5px 0;"><strong>Valor Total:</strong> R$ ${os.valor.toFixed(2)}</p>
            
            <hr style="border-top: 1px dashed #000; margin: 8px 0;">
            
            <div style="font-size: 9px; text-align: justify; line-height: 1.2;">
                <strong>TERMO DE GARANTIA:</strong> Garantia de 90 dias para os serviços prestados. Não cobre mau uso, quedas ou contato com líquidos. Prazo máximo para retirada: 90 dias.
            </div>
            
            <div style="text-align: center; margin-top: 15px;">
                <img src="${os.assinatura}" style="width: 180px; height: 50px; border-bottom: 1px solid #000;"><br>
                <small style="font-size: 10px;">Assinatura do Cliente</small>
            </div>
        </div>
    `;

    setTimeout(() => { window.print(); }, 200);
}

// IMPRESSÃO DE ETIQUETA COM QR CODE
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
