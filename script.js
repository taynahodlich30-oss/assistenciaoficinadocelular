const SENHA_ACESSO = "123456";

// Dados iniciais inspirados no print
let ordensServico = [
    { 
        id: "647636", 
        cliente: "Jsjsje", 
        telefone: "94949", 
        aparelho: "Sbbsb", 
        imei: "Wnnen", 
        defeito: "Zbnsb", 
        obs: "Snsnn", 
        status: "Em reparo", 
        valor: "799797,00" 
    },
    { 
        id: "524781", 
        cliente: "Test", 
        telefone: "54646", 
        aparelho: "iPhone 11", 
        imei: "123456789", 
        defeito: "Tela quebrada", 
        obs: "Troca de vidro e touch", 
        status: "Em análise", 
        valor: "350,00" 
    }
];

function validarSenha() {
    const senha = document.getElementById("passwordInput").value;
    const error = document.getElementById("loginError");

    if (senha === SENHA_ACESSO) {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("appScreen").style.display = "block";
        error.innerText = "";
        atualizarPainel();
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

    if (lista.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#64748b; margin-top:1rem;">Nenhuma ordem encontrada.</p>`;
        return;
    }

    lista.forEach(os => {
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
            <div class="os-value">Valor: R$ ${os.valor || '0,00'}</div>
            <button class="btn-wsp" onclick="enviarWhatsApp('${os.cliente}', '${os.telefone}', '${os.aparelho}', '${os.status}', '${os.valor}')">💬 Avisar no WhatsApp</button>
        `;
        container.appendChild(item);
    });
}

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

function abrirModalOS() {
    document.getElementById("osModal").style.display = "flex";
}

function fecharModalOS() {
    document.getElementById("osModal").style.display = "none";
    document.getElementById("osForm").reset();
    document.getElementById("previewContainer").innerHTML = "";
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

function salvarOS(event) {
    event.preventDefault();

    const idRandom = Math.floor(100000 + Math.random() * 900000).toString();
    const cliente = document.getElementById("clientName").value;
    const telefone = document.getElementById("clientPhone").value;
    const aparelho = document.getElementById("deviceModel").value;
    const imei = document.getElementById("deviceIMEI").value;
    const defeito = document.getElementById("deviceDefect").value;
    const obs = document.getElementById("deviceObs").value;
    const status = document.getElementById("serviceStatus").value;
    const valor = document.getElementById("servicePrice").value;

    const novaOS = { id: idRandom, cliente, telefone, aparelho, imei, defeito, obs, status, valor };
    ordensServico.unshift(novaOS);

    atualizarPainel();
    fecharModalOS();
    enviarWhatsApp(cliente, telefone, aparelho, status, valor);
}

function enviarWhatsApp(cliente, telefone, aparelho, status, valor) {
    let num = telefone.replace(/\D/g, '');
    let msg = `Olá *${cliente}*! 👋\nAqui é da *Oficina do Celular*.\n\nStatus da sua OS para o aparelho *${aparelho}*:\n📌 *Status:* ${status}\n`;
    if (valor) msg += `💰 *Valor:* R$ ${valor}\n`;
    msg += `\nQualquer dúvida estamos à disposição!`;

    window.open(`https://api.whatsapp.com/send?phone=55${num}&text=${encodeURIComponent(msg)}`, '_blank');
}
