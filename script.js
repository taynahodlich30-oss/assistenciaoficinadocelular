// CONFIGURAÇÃO DO SISTEMA
const SENHA_ACESSO = "123456"; 

// CONFIGURAÇÃO DO FIREBASE
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
        console.log("🔥 Firebase conectado com sucesso!");
    }
} catch (e) {
    console.error("❌ Erro ao inicializar Firebase:", e);
}

let ordensServico = [];
let fotosTemp = [];
let canvas, ctx;
let isDrawing = false;

// LOGIN E SESSÃO
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
    carregarOSDoBanco();
}

// INTEGRAÇÃO BANCO DE DADOS
async function carregarOSDoBanco() {
    if (db) {
        try {
            const snapshot = await db.collection('ordens_servico').get();
            ordensServico = [];
            snapshot.forEach(doc => {
                ordensServico.push({ idDoc: doc.id, ...doc.data() });
            });
        } catch (error) {
            carregarLocal();
        }
    } else {
        carregarLocal();
    }
    atualizarPainel();
}

function carregarLocal() {
    const dadosSalvos = localStorage.getItem('oficina_os_db');
    if (dadosSalvos) ordensServico = JSON.parse(dadosSalvos);
}

async function salvarNoBanco(novaOS) {
    ordensServico.unshift(novaOS);
    localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));

    if (db) {
        try {
            const docRef = await db.collection('ordens_servico').add(novaOS);
            novaOS.idDoc = docRef.id;
            alert("🎉 Sucesso! Ordem de Serviço salva no FIREBASE!");
        } catch (error) {
            alert("❌ Erro ao salvar no Firebase!");
        }
    } else {
        alert("⚠️ Salvo apenas localmente.");
    }
    atualizarPainel();
}

// PROCESSAMENTO DE FOTOS CHECK-IN
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

// CRIAR E EXIBIR OS
function salvarOS(event) {
    event.preventDefault();

    const osNumber = "OS-" + Math.floor(100000 + Math.random() * 900000);
    const novaOS = {
        idOS: osNumber,
        data: new Date().toLocaleDateString('pt-BR'),
        cliente: document.getElementById('clientName').value,
        whatsapp: document.getElementById('clientPhone').value,
        modelo: document.getElementById('deviceModel').value,
        imei: document.getElementById('deviceIMEI').value,
        defeito: document.getElementById('deviceDefect').value,
        obs: document.getElementById('deviceObs').value || "Sem observações",
        peca: document.getElementById('usedPart').value || "Nenhuma",
        custoPeca: parseFloat(document.getElementById('partCost').value) || 0,
        status: document.getElementById('serviceStatus').value,
        valor: parseFloat(document.getElementById('servicePrice').value) || 0,
        fotos: fotosTemp,
        assinatura: canvas.toDataURL()
    };

    salvarNoBanco(novaOS);
    fecharModalOS();
    document.getElementById('osForm').reset();
    document.getElementById('previewContainer').innerHTML = '';
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
            os.fotos.forEach(f => {
                fotosHTML += `<img src="${f}" class="preview-thumb">`;
            });
            fotosHTML += '</div>';
        }

        const card = document.createElement('div');
        card.className = 'os-card';
        card.innerHTML = `
            <div class="os-card-header">
                <strong>${os.idOS} - ${os.cliente}</strong>
                <span>${os.status}</span>
            </div>
            <p>📱 <strong>Aparelho:</strong> ${os.modelo} (IMEI: ${os.imei})</p>
            <p>🔧 <strong>Defeito:</strong> ${os.defeito}</p>
            <p>💰 <strong>Valor:</strong> R$ ${os.valor.toFixed(2)} | <strong>Custo:</strong> R$ ${(os.custoPeca || 0).toFixed(2)}</p>
            ${fotosHTML}
            <div class="os-card-actions">
                <button class="btn-sm btn-wa-orcamento" onclick="waOrcamento('${os.whatsapp}', '${os.idOS}', '${os.modelo}', '${os.valor}')">🟡 Zap Orçamento</button>
                <button class="btn-sm btn-wa-pronto" onclick="waPronto('${os.whatsapp}', '${os.idOS}', '${os.modelo}', '${os.valor}')">🟢 Zap Pronto</button>
                <button class="btn-sm" onclick="imprimirCupom('${os.idOS}')">🖨️ Cupom</button>
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

// MENSAGENS WHATSAPP
function waOrcamento(telefone, osId, modelo, valor) {
    const num = telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! Referente à sua *${osId}* do aparelho *${modelo}*: O orçamento total ficou em *R$ ${parseFloat(valor).toFixed(2)}*. Podemos aprovar o serviço?`);
    window.open(`https://wa.me/55${num}?text=${msg}`, '_blank');
}

function waPronto(telefone, osId, modelo, valor) {
    const num = telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! Excelente notícia 🎉! O seu *${modelo}* (${osId}) já está pronto para retirada. Valor: *R$ ${parseFloat(valor).toFixed(2)}*. Aguardamos você!`);
    window.open(`https://wa.me/55${num}?text=${msg}`, '_blank');
}

// CANVASES E MODAL
function abrirModalOS() { document.getElementById('osModal').style.display = 'flex'; }
function fecharModalOS() { document.getElementById('osModal').style.display = 'none'; }

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

    const printSection = document.getElementById('printSection');
    printSection.innerHTML = `
        <div style="font-family: monospace; width: 280px; font-size: 12px;">
            <h3 style="text-align: center; margin: 0;">📱 OFICINA DO CELULAR</h3>
            <p style="text-align: center; margin: 2px 0;">Comprovante de Entrada</p>
            <hr>
            <p><strong>OS:</strong> ${os.idOS}</p>
            <p><strong>Data:</strong> ${os.data}</p>
            <p><strong>Cliente:</strong> ${os.cliente}</p>
            <p><strong>Aparelho:</strong> ${os.modelo}</p>
            <p><strong>Defeito:</strong> ${os.defeito}</p>
            <p><strong>Valor:</strong> R$ ${os.valor.toFixed(2)}</p>
            <hr>
            <p style="font-size: 10px; text-align: justify;">⚠️ TERMO: O cliente declara estar ciente do prazo máximo de 90 dias para retirada do aparelho.</p>
            <br>
            <div style="text-align: center;">
                <img src="${os.assinatura}" style="width: 200px; height: 60px; border-bottom: 1px solid #000;"><br>
                <small>Assinatura do Cliente</small>
            </div>
        </div>
    `;
    window.print();
}

window.onload = function() { checarSessao(); };
