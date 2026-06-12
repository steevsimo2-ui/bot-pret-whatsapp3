module.exports = asmodule.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ status: 'OK', bot: 'FinanceXpress' }));
  }

  try {
    let body = '';
    await new Promise((resolve) => {
      req.on('data', chunk => body += chunk);
      req.on('end', resolve);
    });

    const params = new URLSearchParams(body);
    const incomingMsg = (params.get('Body') || '').trim().toLowerCase();
    const from = params.get('From') || '';

    let reply = getReply(incomingMsg, from);

    res.setHeader('Content-Type', 'text/xml');
    return res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`);

  } catch (err) {
    res.setHeader('Content-Type', 'text/xml');
    return res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Erreur. Tapez menu.</Message></Response>`);
  }
};

const sessions = {};

function getReply(msg, from) {
  if (!sessions[from]) sessions[from] = { step: 'MENU', data: {} };
  const s = sessions[from];

  if (msg === 'menu' || msg === 'stop') {
    s.step = 'MENU'; s.data = {};
    return menu();
  }

  if (s.step === 'MENU') {
    if (msg === '1' || msg.includes('demande')) { s.step = 'NOM'; return 'Parfait ! Quel est votre nom complet ?'; }
    if (msg === '2') return '📋 Montant: 50 000 – 5 000 000 FCFA\nDurée: 1 à 24 mois\nTaux: 4%/mois\nFrais dossier: 5 000 FCFA\n\nTapez 1 pour faire une demande.';
    if (msg === '3') return '📎 Documents requis:\n① CNI ou Passeport\n② Justificatif revenus (3 mois)\n③ Facture domicile\n④ Numéro Mobile Money\n\nTapez 1 pour une demande.';
    if (msg === '4') return '📞 Un agent vous rappelle dans 30 minutes. Restez disponible ✅';
    return menu();
  }

  if (s.step === 'NOM') {
    s.data.nom = msg; s.step = 'MONTANT';
    return `Merci ${msg} ! 💰 Quel montant souhaitez-vous ? (entre 50000 et 5000000 FCFA)`;
  }

  if (s.step === 'MONTANT') {
    const n = parseInt(msg.replace(/\D/g,''));
    if (!n || n < 50000 || n > 5000000) return '⚠️ Montant invalide. Entrez entre 50000 et 5000000.';
    s.data.montant = n; s.step = 'DUREE';
    return `✅ Montant: ${n.toLocaleString()} FCFA\n\nSur quelle durée ?\n1 - 1 mois\n2 - 3 mois\n3 - 6 mois\n4 - 12 mois\n5 - 24 mois`;
  }

  if (s.step === 'DUREE') {
    const d = {'1':1,'2':3,'3':6,'4':12,'5':24};
    const duree = d[msg] || parseInt(msg);
    if (!duree) return '⚠️ Choisissez entre 1 et 5.';
    s.data.duree = duree;
    const mensualite = Math.round((s.data.montant * 0.04 * Math.pow(1.04, duree)) / (Math.pow(1.04, duree) - 1));
    s.step = 'CONFIRM';
    return `📊 Simulation:\nNom: ${s.data.nom}\nMontant: ${s.data.montant.toLocaleString()} FCFA\nDurée: ${duree} mois\nMensualité: ${mensualite.toLocaleString()} FCFA\n\nTapez OUI pour confirmer ou NON pour annuler.`;
  }

  if (s.step === 'CONFIRM') {
    if (msg === 'oui') {
      const ref = 'FX-' + Date.now().toString().slice(-6);
      sessions[from] = { step: 'MENU', data: {} };
      return `🎉 Demande enregistrée !\nDossier: ${ref}\n\nUn agent vous contacte dans 24-48h.\nMerci de votre confiance 🙏 FinanceXpress`;
    }
    sessions[from] = { step: 'MENU', data: {} };
    return '❌ Demande annulée.\n\n' + menu();
  }

  return menu();
}

function menu() {
  return '👋 Bienvenue chez FinanceXpress 🏦\n\n1️⃣ Faire une demande\n2️⃣ Nos conditions\n3️⃣ Documents requis\n4️⃣ Parler à un agent';
}￼Enter
