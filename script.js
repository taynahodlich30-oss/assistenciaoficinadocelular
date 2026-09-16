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
    carregarOSDoBanco();
}

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
        } catch (error) {
            console.error(error);
        }
    }
    atualizarPainel();
}

// MUDAR STATUS EM TEMPO REAL
async function alterarStatusOS(osId, novoStatus) {
    const os = ordensServico.find(item => item.idOS === osId);
    if (os) {
        os.status = novoStatus;
        localStorage.setItem('oficina_os_db', JSON.stringify(ordensServico));

        if (db && os.idDoc) {
            try {
                await db.collection('ordens_servico').doc(os.idDoc).update({ status: novoStatus });
            } catch (e) {
                console.error("Erro ao atualizar status:", e);
            }
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
                <button class="btn-sm btn-wa-orcamento" onclick="waOrcamento('${os.whatsapp}', '${os.idOS}', '${os.modelo}', '${os.valor}')">🟡 Orçamento</button>
                <button class="btn-sm btn-wa-pronto" onclick="waPronto('${os.whatsapp}', '${os.idOS}', '${os.modelo}', '${os.valor}')">🟢 Pronto</button>
                <button class="btn-sm" onclick="imprimirCupom('${os.idOS}')">🖨️ Imprimir OS</button>
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
    const msg = encodeURIComponent(`Olá! Excelente notícia 🎉! O seu *${modelo}* (${osId}) já está pronto para retirada. Valor: *R$ ${parseFloat(valor).toFixed(2)}*. Aguardamos você!`);
    window.open(`https://wa.me/55${num}?text=${msg}`, '_blank');
}

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

// FUNÇÃO DE IMPRESSÃO LIMPA (SOMENTE COMPROVANTE E TERMO)
function imprimirCupom(osId) {
    const os = ordensServico.find(item => item.idOS === osId);
    if (!os) return;

    const printSection = document.getElementById('printSection');
    printSection.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 300px; margin: 0 auto; color: #000;">
            <h2 style="text-align: center; margin: 0; font-size: 16px;">📱 OFICINA DO CELULAR</h2>
            <p style="text-align: center; margin: 2px 0; font-size: 12px;">ORDEM DE SERVIÇO DE ENTRADA</p>
            <p style="text-align: center; font-size: 11px; margin-bottom: 5px;">Data: ${os.data}</p>
            <hr style="border-top: 1px dashed #000; margin: 5px 0;">
            
            <p style="font-size: 12px; margin: 3px 0;"><strong>Nº OS:</strong> ${os.idOS}</p>
            <p style="font-size: 12px; margin: 3px 0;"><strong>Cliente:</strong> ${os.cliente}</p>
            <p style="font-size: 12px; margin: 3px 0;"><strong>WhatsApp:</strong> ${os.whatsapp}</p>
            <p style="font-size: 12px; margin: 3px 0;"><strong>Aparelho:</strong> ${os.modelo}</p>
            <p style="font-size: 12px; margin: 3px 0;"><strong>IMEI:</strong> ${os.imei}</p>
            <p style="font-size: 12px; margin: 3px 0;"><strong>Defeito Relatado:</strong> ${os.defeito}</p>
            <p style="font-size: 12px; margin: 3px 0;"><strong>Obs/Riscos:</strong> ${os.obs}</p>
            <p style="font-size: 13px; margin: 5px 0;"><strong>Valor Total:</strong> R$ ${os.valor.toFixed(2)}</p>
            
            <hr style="border-top: 1px dashed #000; margin: 8px 0;">
            
            <div style="font-size: 9px; text-align: justify; line-height: 1.2;">
                <strong>TERMO DE GARANTIA E RETIRADA:</strong><br>
                1. A garantia dos serviços prestados e peças trocadas é de <strong>90 dias</strong> a contar desta data.<br>
                2. A garantia não cobre danos por quedas, oxidação (contato com líquidos) ou mau uso.<br>
                3. O cliente declara estar ciente de que tem o prazo máximo de <strong>90 dias</strong> para a retirada do aparelho pronto. Após esse período, o aparelho será considerado abandonado nos termos da lei.
            </div>
            
            <div style="text-align: center; margin-top: 15px;">
                <img src="${os.assinatura}" style="width: 180px; height: 50px; border-bottom: 1px solid #000;"><br>
                <small style="font-size: 10px;">Assinatura do Cliente</small>
            </div>
        </div>
    `;

    setTimeout(() => {
        window.print();
    }, 200);
}

window.onload = function() { checarSessao(); };
