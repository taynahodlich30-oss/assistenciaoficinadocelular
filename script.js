const SENHA_ACESSO = "123456";

// Banco de dados em memória de Exemplo
let ordensServico = [
    { id: 1001, cliente: "Carlos Eduardo", telefone: "11999991111", aparelho: "iPhone 12", imei: "354128091234567", defeito: "Troca de tela", status: "Em Manutenção", valor: "450,00" },
    { id: 1002, cliente: "Mariana Costa", telefone: "11988882222", aparelho: "Samsung S21", imei: "358741098765432", defeito: "Não carrega (conector)", status: "Em Análise", valor: "180,00" }
];

function validarSenha() {
    const senha = document.getElementById("passwordInput").value;
    const error = document.getElementById("loginError");

    if (senha === SENHA_ACESSO) {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("appScreen").style.display = "block";
        error.innerText = "";
        renderizarOS(ordensServico);
    } else {
        error.innerText = "Senha incorreta!";
    }
}

function logout() {
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("appScreen").style.display = "none";
    document.getElementById("passwordInput").value = "";
}

function renderizarOS(lista) {
    const grid = document.getElementById("osList");
    grid.innerHTML = "";

    if (lista.length === 0) {
        grid.innerHTML = `<p style="color: var(--text-secondary);">Nenhuma Ordem de Serviço encontrada.</p>`;
        return;
    }

    lista.forEach(os => {
        let badgeClass = "badge-orcamento";
        if (os.status === "Em Análise") badgeClass = "badge-analise";
        if (os.status === "Em Manutenção") badgeClass = "badge-manutencao";
        if (os.status === "Pronto para Retirada") badgeClass = "badge-pronto";

        const card = document.createElement("div");
        card.className = "os-card";
        card.innerHTML = `
            <div>
                <div class="os-header">
                    <span class="os-number">O.S. #${os.id}</span>
                    <span class="badge ${badgeClass}">${os.status}</span>
                </div>
                <div class="os-body">
                    <p><strong>Cliente:</strong> ${os.cliente}</p>
                    <p><strong>Aparelho:</strong> ${os.aparelho}</p>
                    <p><strong>IMEI:</strong> ${os.imei}</p>
                    <p><strong>Defeito:</strong> ${os.defeito}</p>
                    <p><strong>Valor:</strong> R$ ${os.valor || 'A definir'}</p>
                </div>
            </div>
            <button class="btn-primary" style="padding:0.5rem;" onclick="notificarWhatsApp('${os.cliente}', '${os.telefone}', '${os.aparelho}', '${os.status}', '${os.valor}')">💬 Avisar no WhatsApp</button>
        `;
        grid.appendChild(card);
    });
}

function buscarOS() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const filtrados = ordensServico.filter(os => 
        os.id.toString().includes(query) ||
        os.cliente.toLowerCase().includes(query) ||
        os.imei.toLowerCase().includes(query) ||
        os.aparelho.toLowerCase().includes(query)
    );
    renderizarOS(filtrados);
}

function abrirModalNovaOS() {
    document.getElementById("osModal").style.display = "flex";
}

function fecharModalNovaOS() {
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

function salvarEEnviarOS(event) {
    event.preventDefault();

    const novoId = ordensServico.length > 0 ? ordensServico[ordensServico.length - 1].id + 1 : 1001;
    const cliente = document.getElementById("clientName").value;
    const telefone = document.getElementById("clientPhone").value.replace(/\D/g, '');
    const aparelho = document.getElementById("deviceModel").value;
    const imei = document.getElementById("deviceIMEI").value;
    const defeito = document.getElementById("deviceDefect").value;
    const status = document.getElementById("serviceStatus").value;
    const valor = document.getElementById("servicePrice").value;

    const novaOS = { id: novoId, cliente, telefone, aparelho, imei, defeito, status, valor };
    ordensServico.unshift(novaOS);

    renderizarOS(ordensServico);
    fecharModalNovaOS();
    notificarWhatsApp(cliente, telefone, aparelho, status, valor);
}

function notificarWhatsApp(cliente, telefone, aparelho, status, valor) {
    let msg = `Olá *${cliente}*! 👋\nAqui é da *Oficina do Celular*.\n\nAtualização do seu aparelho (*${aparelho}*):\n📌 *Status:* ${status}\n`;
    if (valor) msg += `💰 *Valor:* R$ ${valor}\n`;
    msg += `\nCaso tenha dúvidas, estamos à disposição!`;

    window.open(`https://api.whatsapp.com/send?phone=55${telefone}&text=${encodeURIComponent(msg)}`, '_blank');
}
