const firebaseConfig = {
    apiKey: 'AIzaSyDDLsDkCsFma4xWIpSfwE58w3zSUNuv9Bc',
    authDomain: 'oficina-do-celular-eaaed.firebaseapp.com',
    projectId: 'oficina-do-celular-eaaed',
    storageBucket: 'oficina-do-celular-eaaed.firebasestorage.app',
    messagingSenderId: '32431619085',
    appId: '1:32431619085:web:18b3a2defb79795f832944',
    measurementId: 'G-J6PHLDPD1H'
};
const resultado = document.getElementById('message');
let banco;
try { firebase.initializeApp(firebaseConfig); banco = firebase.firestore(); }
catch(e) { resultado.textContent = 'Consulta indisponível. Tente novamente mais tarde.'; }
const parametros = new URLSearchParams(location.search);
const codigoUrl = parametros.get('c') || parametros.get('codigo');
if (codigoUrl) { document.getElementById('code').value = codigoUrl; consultar(codigoUrl); }
document.getElementById('lookup').addEventListener('submit', e => { e.preventDefault(); consultar(document.getElementById('code').value.trim()); });
function tokenGarantia(entrada) {
    let codigo = String(entrada || '').trim();
    if (/^https?:\/\//i.test(codigo)) {
        try { const url = new URL(codigo); codigo = url.searchParams.get('c') || url.searchParams.get('codigo') || ''; }
        catch (_) { return ''; }
    }
    if (/^[0-9a-f]{48}$/.test(codigo)) return codigo;
    if (!/^[A-Za-z0-9_-]{32}$/.test(codigo)) return '';
    try {
        const bytes = atob(codigo.replace(/-/g, '+').replace(/_/g, '/'));
        if (bytes.length !== 24) return '';
        return Array.from(bytes, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    } catch (_) { return ''; }
}
async function consultar(entrada) {
    const codigo = tokenGarantia(entrada);
    if (!codigo) { resultado.textContent = 'Código inválido. Confira o link enviado pela oficina.'; return; }
    if (!banco) return;
    resultado.textContent = 'Consultando...';
    try {
        const snap = await banco.collection('garantias_publicas').doc(codigo).get();
        if (!snap.exists) { resultado.textContent = 'Garantia não encontrada. Confira o código com a oficina.'; return; }
        const g = snap.data();
        const card = document.createElement('div'); card.className = 'card';
        const validade = new Date(g.validade + 'T12:00:00Z');
        const vigente = new Date().toISOString().slice(0,10) <= g.validade;
        const badge = document.createElement('span'); badge.className = vigente ? 'badge' : 'badge expired'; badge.textContent = vigente ? 'Dentro do prazo' : 'Prazo encerrado'; card.appendChild(badge);
        for (const [rotulo, valor] of [['OS',g.idOS],['Aparelho',g.modelo],['Componentes',g.componentes],['Início',g.inicio],['Validade',g.validade]]) {
            const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = rotulo + ': '; p.appendChild(strong); p.appendChild(document.createTextNode(String(valor || '-'))); card.appendChild(p);
        }
        resultado.replaceChildren(card);
    } catch(e) { resultado.textContent = e.code === 'permission-denied' ? 'A consulta pública está bloqueada. Peça à oficina para conferir as regras de leitura da garantia no Firebase.' : 'Não foi possível consultar agora. Verifique sua conexão e tente novamente.'; }
}
