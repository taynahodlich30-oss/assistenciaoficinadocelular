const SENHA_ACESSO = "123456";

// CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456:web:123456"
};

let db = null;

// Inicializa o Firebase sem travar o restante do código caso haja erro
try {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("🔥 Firebase conectado!");
    }
} catch (e) {
    console.warn("Firebase não ativo, operando em modo local.");
}

let ordensServico = [];
let canvas, ctx;
let drawing = false;

// Inicializador da aplicação
document.addEventListener('DOMContentLoaded', () => {
    carregarOSDoBanco();
});

// LOGIN (Corrigido e protegido contra travamentos)
function validarSenha() {
    try {
        const input = document.getElementById("passwordInput");
        const error = document.getElementById("loginError");
        
        if (!input) return;

        if (input.value === SENHA_ACESSO) {
            document.getElementById("loginScreen").style.display = "none";
            document.getElementById("appScreen").style.display = "block";
            if (error) error.innerText = "";
        } else {
            if (error) error.innerText = "Senha incorreta!";
        }
    } catch (err) {
        console.error("Erro no login:", err);
    }
}

function logout() {
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("appScreen").style.display = "none";
    const pass = document.getElementById("passwordInput");
    if (pass) pass.value = "";
}

// ASSINATURA TOUCH NO CELULAR
function configurarCanvasAssinatura() {
    canvas = document.getElementById("signatureCanvas");
    if (!canvas) return;
    
    ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#0b1329";
    ctx.lineWidth = 2.5;

    canvas.width = canvas.offsetWidth || 350;
    canvas.height = canvas.offsetHeight || 150;

    // Eventos Mouse
    canvas.addEventListener("mousedown", (e) => { drawing = true; desenharMouse(e); });
    canvas.addEventListener("mouseup", () => { drawing = false; ctx.beginPath(); });
    canvas.addEventListener("mousemove", desenharMouse);

    // Eventos Touch (Celulares)
    canvas.addEventListener("touchstart", (e) => { 
        drawing = true; 
        desenharTouch(e); 
        e.preventDefault(); 
    }, { passive: false });

    canvas.addEventListener("touchend", () => { 
        drawing = false; 
        ctx.beginPath(); 
    });

    canvas.addEventListener("touchmove", (e) => { 
        desenharTouch(e); 
        e.preventDefault(); 
    }, { passive: false });
}

function desenharMouse(e) {
    if (!drawing || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function desenharTouch(e) {
    if (!drawing || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
}

function limparAssinatura() {
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
    }
}

// GERENCIAMENTO DE DADOS
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
    const backup = localStorage.getItem('oficina_os_db');
    ordensServico = backup ? JSON.parse(backup) : [];
}

async function salvarNoBanco(novaOS) {
    ordensServico.unshift(novaOS);
    localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));

    if (db) {
        try {
            await db.collection('ordens_servico').add(novaOS);
        } catch (error) {
            console.error("Erro ao salvar no Firebase:", error);
        }
    }
    atualizarPainel();
}

// INTERFACE
function abrirModalOS() {
    document.getElementById("osModal").style.display = "flex";
    setTimeout(() => {
        configurarCanvasAssinatura();
        limparAssinatura();
    }, 200);
}

function fecharModalOS() {
    document.getElementById("osModal").style.display = "none";
    document.getElementById("osForm").reset();
    limparAssinatura();
}

async function salvarOS(event) {
    event.preventDefault();

    const idRandom = Math.floor(100000 + Math.random() * 900000).toString();
    const cliente = document.getElementById("clientName").value;
    const telefone = document.getElementById("clientPhone").value;
    const aparelho = document.getElementById("deviceModel").value;
    const imei = document.getElementById("deviceIMEI") ? document.getElementById("deviceIMEI").value : "";
    const defeito = document.getElementById("deviceDefect").value;
    const obs = document.getElementById("deviceObs") ? document.getElementById("deviceObs").value : "";
    const peca = document.getElementById("usedPart") ? document.getElementById("usedPart").value : "";
    const custoPeca = parseFloat(document.getElementById("partCost") ? document.getElementById("partCost").value : 0) || 0;
    const status = document.getElementById("serviceStatus").value;
    const valor = parseFloat(document.getElementById("servicePrice").value || 0);

    let assinatura = "";
    if (canvas) {
        assinatura = canvas.toDataURL();
    }

    const novaOS = { 
        id: idRandom, cliente, telefone, aparelho, imei, defeito, obs, peca, custoPeca, status, valor, assinatura,
        dataCriacao: new Date().toLocaleDateString('pt-BR')
    };

    await salvarNoBanco(novaOS);
    fecharModalOS();
}

function atualizarPainel() {
    renderizarContadores();
    renderizarListaOS(ordensServico);
}

function renderizarContadores() {
    if(!document.getElementById("countTotal")) return;
    document.getElementById("countTotal").innerText = ordensServico.length;
    document.getElementById("countAnalise").innerText = ordensServico.filter(os => os.status === "Em análise").length;
    document.getElementById("countReparo").innerText = ordensServico.filter(os => os.status === "Em reparo").length;
    document.getElementById("countProntos").innerText = ordensServico.filter(os => os.status === "Pronto").length;
}

function renderizarListaOS(lista) {
    const container = document.getElementById("osList");
    if (!container) return;
    container.innerHTML = "";

    lista.forEach(os => {
        const valor = parseFloat(os.valor || 0);
        const custo = parseFloat(os.custoPeca || 0);
        const lucro = valor - custo;

        const item = document.createElement("div");
        item.className = "os-item";
        item.innerHTML = `
            <div class="os-top">
                <span class="os-title">OS #${os.id}</span>
                <span class="status-badge">${os.status}</span>
            </div>
            <div class="os-subtitle">${os.cliente} • ${os.telefone}</div>
            <div class="os-device">${os.aparelho} ${os.imei ? '• IMEI: ' + os.imei : ''}</div>
            <div class="os-detail"><strong>Defeito:</strong> ${os.defeito}</div>
            
            <div class="financial-details">
                <div>Custo: <span>R$ ${custo.toFixed(2)}</span></div>
                <div>Lucro: <span class="text-profit">R$ ${lucro.toFixed(2)}</span></div>
                <div>Total: <span>R$ ${valor.toFixed(2)}</span></div>
            </div>

            ${os.assinatura ? `
                <div class="os-signature-preview">
                    <strong>Assinatura do Cliente:</strong><br>
                    <img src="${os.assinatura}" alt="Assinatura Digital">
                </div>
            ` : ''}

            <div class="btn-group">
                <button class="btn-wsp" onclick="enviarWhatsApp('${os.cliente}', '${os.telefone}', '${os.aparelho}', '${os.status}', '${valor}')">💬 WhatsApp</button>
                <button class="btn-print" onclick="imprimirCupom('${os.id}')">🖨️ Imprimir OS</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function buscarOS() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const filtrados = ordensServico.filter(os => 
        (os.id && os.id.toLowerCase().includes(query)) ||
        (os.cliente && os.cliente.toLowerCase().includes(query)) ||
        (os.aparelho && os.aparelho.toLowerCase().includes(query))
    );
    renderizarListaOS(filtrados);
}

function imprimirCupom(id) {
    const os = ordensServico.find(o => o.id === id);
    if (!os) return;

    const printSection = document.getElementById("printSection");
    if(!printSection) return;

    printSection.innerHTML = `
        <h2>OFICINA DO CELULAR</h2>
        <p style="text-align:center;">ORDEM DE SERVIÇO - #${os.id}</p>
        <div class="line"></div>
        <p><strong>Cliente:</strong> ${os.cliente}</p>
        <p><strong>Tel:</strong> ${os.telefone}</p>
        <p><strong>Aparelho:</strong> ${os.aparelho}</p>
        <div class="line"></div>
        <p><strong>Defeito:</strong> ${os.defeito}</p>
        <p><strong>Valor Total: R$ ${parseFloat(os.valor || 0).toFixed(2)}</strong></p>
        <div class="line"></div>
        ${os.assinatura ? `<p style="text-align:center;"><strong>Assinatura do Cliente:</strong></p><img src="${os.assinatura}">` : ''}
    `;
    window.print();
}

function enviarWhatsApp(cliente, telefone, aparelho, status, valor) {
    let num = telefone.replace(/\D/g, '');
    let msg = `Olá *${cliente}*! 👋\nAqui é da *Oficina do Celular*.\n\nStatus da sua OS para o aparelho *${aparelho}*:\n📌 *Status:* ${status}\n💰 *Valor:* R$ ${parseFloat(valor).toFixed(2)}`;
    window.open(`https://api.whatsapp.com/send?phone=55${num}&text=${encodeURIComponent(msg)}`, '_blank');
}
