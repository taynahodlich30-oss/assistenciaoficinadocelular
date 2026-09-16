// Senha de Acesso ao Painel da Oficina do Celular (Altere aqui se quiser)
const SENHA_ACESSO = "123456";

function validarSenha() {
    const senhaDigitada = document.getElementById("passwordInput").value;
    const errorElement = document.getElementById("loginError");

    if (senhaDigitada === SENHA_ACESSO) {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("appScreen").style.display = "block";
        errorElement.innerText = "";
    } else {
        errorElement.innerText = "Senha incorreta! Tente novamente.";
    }
}

function logout() {
    document.getElementById("passwordInput").value = "";
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("appScreen").style.display = "none";
}

// Mostra o preview das fotos no painel
function previewImages(event) {
    const previewContainer = document.getElementById("previewContainer");
    previewContainer.innerHTML = "";
    const files = event.target.files;

    if (files) {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement("img");
                img.src = e.target.result;
                previewContainer.appendChild(img);
            }
            reader.readAsDataURL(file);
        });
    }
}

// Disparo de Orçamento no WhatsApp
function gerarEEnviarOrcamento(event) {
    event.preventDefault();

    const nome = document.getElementById("clientName").value;
    let telefone = document.getElementById("clientPhone").value.replace(/\D/g, '');
    const modelo = document.getElementById("deviceModel").value;
    const servico = document.getElementById("serviceDetails").value;
    const valor = document.getElementById("totalValue").value;
    const prazo = document.getElementById("deliveryDeadline").value;
    const fotos = document.getElementById("devicePhotos").files;

    let avisoFotos = fotos.length > 0 ? `\n\n📸 *Nota:* Registramos ${fotos.length} foto(s) de entrada em nosso sistema.` : '';

    const mensagem = 
`Olá *${nome}*! 👋
Aqui é da *Oficina do Celular*. Segue o orçamento para o seu aparelho:

📲 *Aparelho:* ${modelo}
🛠️ *Serviço:* ${servico}
💰 *Valor:* R$ ${valor}
⏱️ *Prazo de entrega:* ${prazo}${avisoFotos}

Podemos aprovar o serviço para dar início?`;

    const urlWhatsApp = `https://api.whatsapp.com/send?phone=55${telefone}&text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
}

// Disparo de Notificação de Aparelho Pronto
function notificarAparelhoPronto(event) {
    event.preventDefault();

    const nome = document.getElementById("readyClientName").value;
    let telefone = document.getElementById("readyClientPhone").value.replace(/\D/g, '');
    const modelo = document.getElementById("readyDeviceModel").value;
    const valor = document.getElementById("readyTotalValue").value;

    const mensagem = 
`Boas notícias, *${nome}*! 🎉

Seu aparelho *${modelo}* já está *PRONTO* para ser retirado na *Oficina do Celular*!

✅ Testes de qualidade concluídos
💰 *Valor a pagar:* R$ ${valor}

Aguardamos você em nossa loja!`;

    const urlWhatsApp = `https://api.whatsapp.com/send?phone=55${telefone}&text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
}
