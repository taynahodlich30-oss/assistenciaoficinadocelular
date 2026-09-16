const SENHA_ACESSO = "123456";

// ----------------------------------------------------
// BANCO DE DADOS NA NUVEM (OPCIONAL)
// Se quiser salvar tudo na nuvem para usar em vários celulares,
// basta colocar a URL e a KEY do seu Supabase aqui:
const SUPABASE_URL = ""; 
const SUPABASE_KEY = ""; 
let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase conectado.");
}
// ----------------------------------------------------

let ordensServico = [];

// Elementos de Desenho de Assinatura
let canvas, ctx;
let drawing = false;

// Inicializador da página
window.addEventListener('DOMContentLoaded', () => {
    carregarOSDoBanco();
    configurarCanvasAssinatura();
});

// Carrega LocalStorage ou Supabase
async function carregarOSDoBanco() {
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from('ordens_servico').select('*').order('id', { ascending: false });
            if (error) throw error;
            ordensServico = data || [];
        } catch (e) {
            console.error("Erro Supabase:", e);
            carregarLocal();
        }
    } else {
        carregarLocal();
    }
    atualizarPainel();
}

function carregarLocal() {
    const backup = localStorage.getItem('oficina_os_db');
    ordensServico = backup ? JSON.parse(backup) : [
        { 
            id: "647636", cliente: "Jsjsje", telefone: "94949", aparelho: "Sbbsb", imei: "Wnnen", defeito: "Zbnsb", 
            obs: "Snsnn", status: "Em reparo", valor: 799.00, peca: "Tela Original", custoPeca: 150.00, assinatura: ""
        }
    ];
}

async function salvarNoBanco(novaOS) {
    ordensServico.unshift(novaOS);
    localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));
    
    if (supabaseClient) {
        try {
            await supabaseClient.from('ordens_servico').insert([novaOS]);
        } catch (e) { console.error(e); }
    }
    atualizarPainel();
}

// Lógica de Login
function validarSenha() {
    const senha = document.getElementById("passwordInput").value;
    const error = document.getElementById("loginError");

    if (senha === SENHA_ACESSO) {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("appScreen").style.display = "block";
        error.innerText = "";
    } else {
        error.innerText = "Senha incorreta!";
    }
}

function logout() {
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("appScreen").style.display = "none";
    document.getElementById("passwordInput").value = "";
}

function atualizarPainel() {
    renderizarContadores();
    renderizarListaOS(ordensServico);
}

function renderizarContadores() {
    document.getElementById("countTotal").innerText = ordensServico.length;
    document.getElementById("countAnalise").innerText = ordensServico.filter(os => os.status === "Em análise").length;
    document.getElementById("countReparo").innerText = ordensServico.filter(os => os.status === "Em reparo").length;
    document.getElementById("countProntos").innerText = ordensServico.filter(os => os.status === "Pronto").length;
}

function renderizarListaOS(lista) {
    const container = document.getElementById("osList");
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
            <div class="os-device">${os.aparelho} • IMEI ${os.imei}</div>
            <div class="os-detail"><strong>Defeito:</strong> ${os.defeito}</div>
            ${os.obs ? `<div class="os-detail"><strong>Observações:</strong> ${os.obs}</div>` : ''}
            
            <div class="financial-details">
                <div>Custo Peça: <span>R$ ${custo.toFixed(2)}</span></div>
                <div>Lucro: <span class="text-profit">R$ ${lucro.toFixed(2)}</span></div>
                <div>Total: <span>R$ ${valor.toFixed(2)}</span></div>
            </div>

            ${os.assinatura ? `
                <div class="os-signature-preview">
                    <strong>Assinatura:</strong><br>
                    <img src="${os.assinatura}" alt="Assinatura Digital">
                </div>
            ` : ''}

            <div class="os-legal-alert">
                ⚖️ <strong>Prazo Legal:</strong> Máximo de 90 dias para retirada a partir da finalização. Após esse período, incidirá taxa de armazenamento.
            </div>

            <div class="btn-group">
                <button class="btn-wsp" onclick="enviarWhatsApp('${os.cliente}', '${os.telefone}', '${os.aparelho}', '${os.status}', '${valor}')">💬 WhatsApp</button>
                <button class="btn-print" onclick="imprimirCupom('${os.id}')">🖨️ Imprimir OS</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// Impressão Térmica Dinâmica
function imprimirCupom(id) {
    const os = ordensServico.find(o => o.id === id);
    if (!os) return;

    const printSection = document.getElementById("printSection");
    printSection.innerHTML = `
        <h2>OFICINA DO CELULAR</h2>
        <p style="text-align:center;">ORDEM DE SERVIÇO - #${os.id}</p>
        <div class="line"></div>
        <p><strong>Cliente:</strong> ${os.cliente}</p>
        <p><strong>Tel:</strong> ${os.telefone}</p>
        <p><strong>Aparelho:</strong> ${os.aparelho}</p>
        <p><strong>IMEI:</strong> ${os.imei}</p>
        <div class="line"></div>
        <p><strong>Defeito:</strong> ${os.defeito}</p>
        <p><strong>Serviço/Peça:</strong> ${os.peca || 'Não informada'}</p>
        <p><strong>Valor Total: R$ ${parseFloat(os.valor || 0).toFixed(2)}</strong></p>
        <div class="line"></div>
        <p style="font-size:7pt; text-align:justify;">
            ⚠️ ATENÇÃO: O cliente declara estar ciente de que tem o prazo máximo de 90 dias (3 meses), a contar do aviso de conclusão, para a retirada do aparelho. Após esse período, incidirá taxa de armazenamento de R$ 5,00/dia.
        </p>
        <div class="line"></div>
        ${os.assinatura ? `<p style="text-align:center;"><strong>Assinatura do Cliente:</strong></p><img src="${os.assinatura}">` : '<br><br><p style="text-align:center;">________________________<br>Assinatura do Cliente</p>'}
        <br><p style="text-align:center; font-size:8pt;">Agradecemos a preferência!</p>
    `;
    window.print();
}

// Lógica de Busca
function buscarOS() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const filtrados = ordensServico.filter(os => 
        os.id.toLowerCase().includes(query) ||
        os.cliente.toLowerCase().includes(query) ||
        os.aparelho.toLowerCase().includes(query) ||
        os.imei.toLowerCase().includes(query)
    );
    renderizarListaOS(filtrados);
}

// Janela OS Modal
function abrirModalOS() {
    document.getElementById("osModal").style.display = "flex";
    limparAssinatura();
}

function fecharModalOS() {
    document.getElementById("osModal").style.display = "none";
    document.getElementById("osForm").reset();
    document.getElementById("previewContainer").innerHTML = "";
    limparAssinatura();
}

// Configuração Canvas Assinatura (Mouse e Touch)
function configurarCanvasAssinatura() {
    canvas = document.getElementById("signatureCanvas");
    ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#0b1329";
    ctx.lineWidth = 2;

    // Eventos Mouse
    canvas.addEventListener("mousedown", (e) => { drawing = true; desenhar(e); });
    canvas.addEventListener("mouseup", () => { drawing = false; ctx.beginPath(); });
    canvas.addEventListener("mousemove", desenhar);

    // Eventos Touch (Celular)
    canvas.addEventListener("touchstart", (e) => { drawing = true; desenharTouch(e); e.preventDefault(); });
    canvas.addEventListener("touchend", () => { drawing = false; ctx.beginPath(); });
    canvas.addEventListener("touchmove", (e) => { desenharTouch(e); e.preventDefault(); });
}

function desenhar(e) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function desenharTouch(e) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
}

function limparAssinatura() {
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function previewImages(event) {
    const container = document.getElementById("previewContainer");
    container.innerHTML = "";
    const files = event.target.files;

    if (files) {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.createElement("img");
                img.src = e.target.result;
                container.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }
}

// Salva Nova O.S.
function salvarOS(event) {
    event.preventDefault();

    const idRandom = Math.floor(100000 + Math.random() * 900000).toString();
    const cliente = document.getElementById("clientName").value;
    const telefone = document.getElementById("clientPhone").value;
    const aparelho = document.getElementById("deviceModel").value;
    const imei = document.getElementById("deviceIMEI").value;
    const defeito = document.getElementById("deviceDefect").value;
    const obs = document.getElementById("deviceObs").value;
    const peca = document.getElementById("usedPart").value;
    const custoPeca = parseFloat(document.getElementById("partCost").value || 0);
    const status = document.getElementById("serviceStatus").value;
    const valor = parseFloat(document.getElementById("servicePrice").value || 0);

    // Salva a assinatura do cliente como Base64
    const assinaturaData = canvas.toDataURL();
    
    // Testa se o canvas está vazio (se o usuário não desenhou)
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    const assinatura = assinaturaData === blank.toDataURL() ? "" : assinaturaData;

    const novaOS = { id: idRandom, cliente, telefone, aparelho, imei, defeito, obs, peca, custoPeca, status, valor, assinatura };
    
    salvarNoBanco(novaOS);
    fecharModalOS();
    enviarWhatsApp(cliente, telefone, aparelho, status, valor);
}

function enviarWhatsApp(cliente, telefone, aparelho, status, valor) {
    let num = telefone.replace(/\D/g, '');
    const avisoLegal = `⚠️ *IMPORTANTE:* Conforme termos da nossa O.S., o prazo limite de retirada é de 90 dias (3 meses).`;
    let msg = `Olá *${cliente}*! 👋\nAqui é da *Oficina do Celular*.\n\nStatus da sua OS para o aparelho *${aparelho}*:\n📌 *Status:* ${status}\n💰 *Valor:* R$ ${parseFloat(valor).toFixed(2)}\n\n${avisoLegal}\n\nQualquer dúvida, fale conosco!`;

    window.open(`https://api.whatsapp.com/send?phone=55${num}&text=${encodeURIComponent(msg)}`, '_blank');
}
