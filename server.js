hereconst https = require('https');
const TOKEN = process.env.TELEGRAM_TOKEN;

function sendMessage(chatId, text) {
  const body = JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, resolve);
    req.write(body);
    req.end();
  });
}

const sessions = {};

function menu() {
  return '👋 Bienvenue chez *FinanceXpress* 🏦\n\n1️⃣ Faire une demande\n2️⃣ Nos conditions\n3️⃣ Documents requis\n4️⃣ Parler à un agent';
}

async function handleUpdate(chatId, msg) {
  if (!sessions[chatId]) sessions[chatId] = { step: 'MENU', data: {} };
  const s = sessions[chatId];
  const m = (msg || '').trim().toLowerCase();

  if (m === '/start' || m === 'menu' || m === 'stop') {
    s.step = 'MENU'; s.data = {};
    return sendMessage(chatId, menu());
  }

  if (s.step === 'MENU') {
    if (m === '1' || m.includes('demande')) { s.step = 'NOM'; return sendMessage(chatId, 'Parfait ! 😊\n\nQuel est votre *nom complet* ?'); }
    if (m === '2') return sendMessage(chatId, '📋 *Conditions :*\n\n• 50 000 – 5 000 000 FCFA\n• Durée : 1 à 24 mois\n• Taux : 4%/mois\n• Frais : 5 000 FCFA\n\nTapez *1* pour une demande.');
    if (m === '3') return sendMessage(chatId, '📎 *Documents :*\n\n① CNI ou Passeport\n② Justificatif revenus\n③ Facture domicile\n④ Numéro Mobile Money');
    if (m === '4') return sendMessage(chatId, '📞 Un agent vous rappelle dans *30 min* ✅');
    return sendMessage(chatId, menu());
  }

  if (s.step === 'NOM') {
    s.data.nom = msg.trim(); s.step = 'MONTANT';
    return sendMessage(chatId, `Merci *${s.data.nom}* ! 💰\n\nQuel montant ? _(50 000 – 5 000 000 FCFA)_`);
  }

  if (s.step === 'MONTANT') {
    const n = parseInt(m.replace(/\D/g, ''));
    if (!n || n < 50000 || n > 5000000) return sendMessage(chatId, '⚠️ Montant invalide. Entre *50000* et *5000000*.');
    s.data.montant = n; s.step = 'DUREE';
    return sendMessage(chatId, `✅ *${n.toLocaleString()} FCFA*\n\nDurée ?\n1 - 1 mois\n2 - 3 mois\n3 - 6 mois\n4 - 12 mois\n5 - 24 mois`);
  }

  if (s.step === 'DUREE') {
    const d = {'1':1,'2':3,'3':6,'4':12,'5':24};
    const duree = d[m] || parseInt(m);
    if (!duree || duree > 24) return sendMessage(chatId, '⚠️ Tapez 1, 2, 3, 4 ou 5.');
    s.data.duree = duree;
    const mens = Math.round((s.data.montant * 0.04 * Math.pow(1.04, duree)) / (Math.pow(1.04, duree) - 1));
    s.step = 'CONFIRM';
    return sendMessage(chatId, `📊 *Simulation :*\n\n👤 ${s.data.nom}\n💰 ${s.data.montant.toLocaleString()} FCFA\n⏳ ${duree} mois\n📅 Mensualité : *${mens.toLocaleString()} FCFA*\n\nTapez *OUI* pour confirmer ou *NON* pour annuler.`);
  }

  if (s.step === 'CONFIRM') {
    if (m === 'oui') {
      const ref = 'FX-' + Date.now().toString().slice(-6);
      sessions[chatId] = { step: 'MENU', data: {} };
      return sendMessage(chatId, `🎉 *Demande enregistrée !*\n\n📌 Dossier : *${ref}*\n\nUn agent vous contacte dans *24-48h* 🙏\n_FinanceXpress_`);
    }
    sessions[chatId] = { step: 'MENU', data: {} };
    return sendMessage(chatId, '❌ Annulée.\n\n' + menu());
  }

  return sendMessage(chatId, menu());
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET') return res.end(JSON.stringify({ status: 'OK' }));
  try {
    let body = '';
    await new Promise((resolve) => { req.on('data', c => body += c); req.on('end', resolve); });
    const update = JSON.parse(body);
    if (update.message && update.message.text) {
      await handleUpdate(String(update.message.chat.id), update.message.text);
    }
  } catch(e) { console.error(e); }
  res.end(JSON.stringify({ ok: true }));
};
