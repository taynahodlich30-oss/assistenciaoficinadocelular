// CONFIGURAÇÃO DO SISTEMA
const SENHA_ACESSO = "576249"; // Altere sua senha aqui se desejar

// CONFIGURAÇÃO DO FIREBASE (Projeto: oficina-do-celular-eaaed)
const firebaseConfig = {
    apiKey: "AIzaSyDDLsDkCsFma4xWIpSfwE58w3zSUNuv9Bc",
    authDomain: "oficina-do-celular-eaaed.firebaseapp.com",
    projectId: "oficina-do-celular-eaaed",
    storageBucket: "oficina-do-celular-eaaed.firebasestorage.app",
    messagingSenderId: "32431619085",
    appId: "1:32431619085:web:18b3a2defb79795f832944",
    measurementId: "G-J6PHLDPD1H"
};

// Inicialização do Firebase e Firestore
let db = null;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("🔥 Firebase conectado com sucesso!");
    } else {
        console.warn("⚠️ Biblioteca do Firebase não encontrada no HTML.");
    }
} catch (e) {
    console.error("❌ Erro ao inicializar Firebase:", e);
}

// VARIÁVEIS GLOBAIS DA APLICAÇÃO
let ordensServico = [];
let canvas, ctx;
let isDrawing = false;

// 1. SISTEMA DE LOGIN E SESSÃO
function validarSenha() {
    const input = document.getElementById('passwordInput').value;
    const errorMsg = document.getElementById('loginError');

    if (input === SENHA_ACESSO) {
        sessionStorage.setItem('oficina_logado', 'true');
        exibirApp();
    } else {
        errorMsg.innerText = "Senha incorreta! Tente novamente.";
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

// 2. INTEGRAÇÃO COM FIREBASE / LOCALSTORAGE
async function carregarOSDoBanco() {
    if (db) {
        try {
            const snapshot = await db.collection('ordens_servico').get();
            ordensServico = [];
            snapshot.forEach(doc => {
                ordensServico.push({ idDoc: doc.id, ...doc.data() });
            });
            console.log("✅ OSs sincronizadas com o Firebase!");
        } catch (error) {
            console.error("⚠️ Erro ao carregar do Firebase:", error);
            carregarLocal();
        }
    } else {
        carregarLocal();
    }
    atualizarPainel();
}

function carregarLocal() {
    const dadosSalvos = localStorage.getItem('oficina_os_db');
    if (dadosSalvos) {
        ordensServico = JSON.parse(dadosSalvos);
    }
}

async function salvarNoBanco(novaOS) {
    // 1. Salva localmente primeiro
    ordensServico.unshift(novaOS);
    localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));

    // 2. Tenta enviar para o Firestore
    if (db) {
        try {
            const docRef = await db.collection('ordens_servico').add(novaOS);
            novaOS.idDoc = docRef.id;
            alert("🎉 Sucesso! Ordem de Serviço salva no FIREBASE!");
        } catch (error) {
            alert("❌ Erro ao salvar no Firebase! Veja o console (F12).");
            console.error("Detalhes do Erro no Firebase:", error);
        }
    } else {
        alert("⚠️ Atenção: Firebase não inicializado. Salvo apenas no navegador.");
    }
    atualizarPainel();
}

// 3. GERENCIAMENTO DAS ORDENS DE SERVIÇO
function salvarOS(event) {
    event.preventDefault();

    const osNumber = "OS-" + Math.floor(100000 + Math.random() * 900000);
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    const novaOS = {
        idOS: osNumber,
        data: dataAtual,
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
        assinatura: canvas.toDataURL()
    };

    salvarNoBanco(novaOS);
    fecharModalOS();
    document.getElementById('osForm').reset();
    limparAssinatura();
}

function atualizarPainel() {
    const osList = document.getElementById('osList');
    osList.innerHTML = '';

    let total = ordensServico.length;
    let analise = 0, reparo = 0, prontos = 0;

    ordensServico.forEach((os) => {
        if (os.status === 'Em análise') analise++;
        if (os.status === 'Em reparo') reparo++;
        if (os.status === 'Pronto') prontos++;

        const card = document.createElement('div');
        card.className = 'os-card';
        card.innerHTML = `
            <div class="os-card-header">
                <strong>${os.idOS} - ${os.cliente}</strong>
                <span class="badge ${getBadgeClass(os.status)}">${os.status}</span>
            </div>
            <p>📱 <strong>Aparelho:</strong> ${os.modelo} (IMEI: ${os.imei})</p>
            <p>🔧 <strong>Defeito:</strong> ${os.defeito}</p>
            <p>💰 <strong>Valor:</strong> R$ ${os.valor.toFixed(2)}</p>
            <div class="os-card-actions">
                <button class="btn-sm" onclick="imprimirCupom('${os.idOS}')">🖨️ Imprimir</button>
                <button class="btn-sm btn-whatsapp" onclick="enviarWhatsApp('${os.whatsapp}', '${os.idOS}', '${os.status}')">💬 WhatsApp</button>
            </div>
        `;
        osList.appendChild(card);
    });

    document.getElementById('countTotal').innerText = total;
    document.getElementById('countAnalise').innerText = analise;
    document.getElementById('countReparo').innerText = reparo;
    document.getElementById('countProntos').innerText = prontos;
}

function getBadgeClass(status) {
    switch (status) {
        case 'Em orçamento': return 'badge-orcamento';
        case 'Em análise': return 'badge-analise';
        case 'Em reparo': return 'badge-reparo';
        case 'Pronto': return 'badge-pronto';
        default: return '';
    }
}

// 4. MODAL E ASSINATURA DIGITAL
function abrirModalOS() {
    document.getElementById('osModal').style.display = 'flex';
}

function fecharModalOS() {
    document.getElementById('osModal').style.display = 'none';
}

function inicializarCanvas() {
    canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);

    canvas.addEventListener('touchstart', startDrawingTouch);
    canvas.addEventListener('touchmove', drawTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) { isDrawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); }
function draw(e) { if (!isDrawing) return; ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); }
function stopDrawing() { isDrawing = false; }

function startDrawingTouch(e) {
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

function limparAssinatura() {
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 5. IMPRESSÃO E WHATSAPP
function enviarWhatsApp(telefone, osId, status) {
    const numLimpo = telefone.replace(/\D/g, '');
    const mensagem = encodeURIComponent(`Olá! Sua Ordem de Serviço *${osId}* na Oficina do Celular teve o status atualizado para: *${status}*.`);
    window.open(`https://wa.me/55${numLimpo}?text=${mensagem}`, '_blank');
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

// BUSCA RÁPIDA
function buscarOS() {
    const termo = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.os-card');

    cards.forEach(card => {
        const texto = card.innerText.toLowerCase();
        card.style.display = texto.includes(termo) ? 'block' : 'none';
    });
}

// INICIALIZAÇÃO AUTOMÁTICA AO CARREGAR A PÁGINA
window.onload = function() {
    checarSessao();
};
