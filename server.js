const https = require('https');

const TOKEN = process.env.TELEGRAM_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

const sessions = {};

function sendMessage(chatId, text) {
  const data = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  });
  const url = new URL(`${API}/sendMessage`);
  return new Promise((resolve) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, resolve);
    req.write(data);
    req.end();
  });
}

function menu() {
  return '👋 Bienvenue chez *FinanceXpress* 🏦\n\n1️⃣ Faire une demande\n2️⃣ Nos conditions\n3️⃣ Documents requis\n4️⃣ Parler à un agent';
}

async function handleUpdate(chatId, msg) {
  if (!sessions[chatId]) sessions[chatId] = { step: 'MENU', data: {} };
  const s = sessions[chatId];
  const m = msg.trim().toLowerCase();

  if (m === 'menu' || m === '/start' || m === 'stop') {
    s.step = 'MENU'; s.data = {};
    return sendMessage(chatId, menu());
  }

  if (s.step === 'MENU') {
    if (m === '1' || m.includes('demande')) { s.step = 'NOM'; return sendMessage(chatId, 'Parfait ! 😊\n\nQuel est votre *nom complet* ?'); }
    if (m === '2') return sendMessage(chatId, '📋 *Nos conditions :*\n\n• Montant : 50 000 – 5 000 000 FCFA\n• Durée : 1 à 24 mois\n• Taux : 4%/mois\n• Frais dossier : 5 000 FCFA\n\nTapez *1* pour faire une demande.');
    if (m === '3') return sendMessage(chatId, '📎 *Documents requis :*\n\n① CNI ou Passeport\n② Justificatif revenus (3 mois)\n③ Facture domicile\n④ Numéro Mobile Money\n\nTapez *1* pour une demande.');
    if (m === '4') return sendMessage(chatId, '📞 Un agent vous rappelle dans *30 minutes*.\nRestez disponible ✅');
    return sendMessage(chatId, menu());
  }

  if (s.step === 'NOM') {
    s.data.nom = msg.trim(); s.step = 'MONTANT';
    return sendMessage(chatId, `Merci *${s.data.nom}* ! 😊\n\n💰 Quel montant souhaitez-vous emprunter ?\n_(entre 50 000 et 5 000 000 FCFA)_`);
  }

  if (s.step === 'MONTANT') {
    const n = parseInt(m.replace(/\D/g, ''));
    if (!n || n < 50000 || n > 5000000) return sendMessage(chatId, '⚠️ Montant invalide.\nEntrez un nombre entre *50000* et *5000000*.');
    s.data.montant = n; s.step = 'DUREE';
    return sendMessage(chatId, `✅ Montant : *${n.toLocaleString()} FCFA*\n\n⏳ Sur quelle durée ?\n\n1 - 1 mois\n2 - 3 mois\n3 - 6 mois\n4 - 12 mois\n5 - 24 mois`);
  }

  if (s.step === 'DUREE') {
    const d = {'1':1,'2':3,'3':6,'4':12,'5':24};
    const duree = d[m] || parseInt(m);
    if (!duree || duree > 24) return sendMessage(chatId, '⚠️ Choisissez entre 1 et 5.');
    s.data.duree = duree;
    const mens = Math.round((s.data.montant * 0.04 * Math.pow(1.04, duree)) / (Math.pow(1.04, duree) - 1));
    s.step = 'CONFIRM';
    return sendMessage(chatId, `📊 *Simulation de votre prêt :*\n\n👤 Nom : ${s.data.nom}\n💰 Montant : ${s.data.montant.toLocaleString()} FCFA\n⏳ Durée : ${duree} mois\n📅 Mensualité : *${mens.toLocaleString()} FCFA*\n📋 Frais dossier : 5 000 FCFA\n\nTapez *OUI* pour confirmer ou *NON* pour annuler.`);
  }

  if (s.step === 'CONFIRM') {
    if (m === 'oui') {
      const ref = 'FX-' + Date.now().toString().slice(-6);
      sessions[chatId] = { step: 'MENU', data: {} };
      return sendMessage(chatId, `🎉 *Demande enregistrée !*\n\n📌 Dossier : *${ref}*\n\nUn agent vous contacte dans *24 à 48h* pour finaliser.\n\nMerci de votre confiance 🙏\n_FinanceXpress — Rapide & Fiable_`);
    }
    sessions[chatId] = { step: 'MENU', data: {} };
    return sendMessage(chatId, '❌ Demande annulée.\n\n' + menu());
  }

  return sendMessage(chatId, menu());
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.end(JSON.stringify({ status: 'OK', bot: 'FinanceXpress Telegram Bot' }));
  }
  try {
    let body = '';
    await new Promise((resolve) => { req.on('data', c => body += c); req.on('end', resolve); });
    const update = JSON.parse(body);
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || '';
      await handleUpdate(chatId, text);
    }
    res.end('OK');
  } catch (e) {
    res.end('OK');
  }
};
