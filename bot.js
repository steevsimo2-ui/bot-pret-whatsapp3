// ============================================================
// BOT WHATSAPP — AGENCE DE PRÊT
// Plateforme : Twilio Sandbox (gratuit)
// ============================================================

const sessions = {}; // Stockage en mémoire des sessions

// ── Utilitaires ──────────────────────────────────────────────

function getSession(phone) {
  if (!sessions[phone]) {
    sessions[phone] = { step: 'MENU', data: {} };
  }
  return sessions[phone];
}

function resetSession(phone) {
  sessions[phone] = { step: 'MENU', data: {} };
}

function calculerMensualite(montant, mois, taux = 0.04) {
  if (mois === 1) return Math.round(montant * (1 + taux));
  const m = (montant * taux * Math.pow(1 + taux, mois)) / (Math.pow(1 + taux, mois) - 1);
  return Math.round(m);
}

function formatFCFA(n) {
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

function parseMontant(text) {
  const clean = text.replace(/\s/g, '').replace(/fcfa/gi, '').replace(/,/g, '');
  const n = parseInt(clean);
  return isNaN(n) ? null : n;
}

// ── Réponses du bot ──────────────────────────────────────────

const MESSAGES = {
  MENU: () => `👋 Bonjour ! Bienvenue chez *FinanceXpress* 🏦

Je suis votre assistant virtuel de prêt.

Choisissez une option :
1️⃣ Faire une demande de prêt
2️⃣ Voir nos conditions
3️⃣ Documents requis
4️⃣ Parler à un agent
5️⃣ Suivre ma demande`,

  CONDITIONS: () => `📋 *Nos conditions de prêt :*

• Montant : 50 000 – 5 000 000 FCFA
• Durée : 1 à 24 mois
• Taux : 4% / mois (fixe)
• Frais de dossier : 5 000 FCFA
• Remboursement mensuel fixe

Tapez *1* pour faire une demande ou *menu* pour revenir.`,

  DOCUMENTS: () => `📎 *Documents requis :*

① CNI ou Passeport valide
② Justificatif de revenus (3 derniers mois)
③ Facture eau/électricité (justificatif domicile)
④ Numéro Mobile Money actif (MTN MoMo ou Orange Money)

Tapez *1* pour faire une demande ou *menu* pour revenir.`,

  AGENT: () => `📞 Un agent vous rappellera dans les *30 minutes*.

Restez disponible sur ce numéro ✅

Tapez *menu* pour revenir au menu principal.`,

  SUIVI: () => `🔍 *Suivi de demande*

Votre dossier est en cours de traitement.
Délai habituel : *24 à 48 heures ouvrables*.

Pour toute urgence, tapez *4* pour parler à un agent.`,

  DEMANDE_NOM: () => `✅ Parfait ! Commençons votre demande.

👤 *Quel est votre nom complet ?*`,

  DEMANDE_AGE: (nom) => `Merci *${nom}* ! 😊

🎂 *Quel est votre âge ?*`,

  DEMANDE_ACTIVITE: () => `💼 *Quelle est votre activité principale ?*

1 - Salarié(e)
2 - Commerçant(e)
3 - Travailleur indépendant
4 - Autre`,

  DEMANDE_MONTANT: () => `💰 *Quel montant souhaitez-vous emprunter ?*

Exemples :
• 50000
• 100000
• 500000

_(Entre 50 000 et 5 000 000 FCFA)_`,

  DEMANDE_DUREE: (montant) => `✅ Montant retenu : *${formatFCFA(montant)}*

⏳ *Sur quelle durée souhaitez-vous rembourser ?*

1 - 1 mois
2 - 3 mois
3 - 6 mois
4 - 12 mois
5 - 24 mois`,

  DEMANDE_CONFIRMATION: (data) => {
    const mensualite = calculerMensualite(data.montant, data.duree);
    data.mensualite = mensualite;
    return `📊 *Simulation de votre prêt :*

👤 Nom : ${data.nom}
🎂 Âge : ${data.age} ans
💼 Activité : ${data.activite}
💰 Montant : ${formatFCFA(data.montant)}
⏳ Durée : ${data.duree} mois
📅 Mensualité estimée : *${formatFCFA(mensualite)}*
📋 Frais de dossier : 5 000 FCFA

Confirmez-vous votre demande ?
✅ Tapez *OUI* pour confirmer
❌ Tapez *NON* pour annuler`;
  },

  DEMANDE_OK: (data) => `🎉 *Demande enregistrée avec succès !*

📌 Numéro de dossier : *FX-${Date.now().toString().slice(-6)}*

Un agent vous contactera dans *24 à 48 heures* pour :
• Vérifier vos documents
• Finaliser le contrat
• Procéder au versement

Merci de votre confiance 🙏
_FinanceXpress — Rapide & Fiable_`,

  ERREUR_MONTANT: () => `⚠️ Montant invalide.

Entrez un nombre entre *50 000* et *5 000 000*.
Exemple : *150000*`,

  ERREUR_AGE: () => `⚠️ Âge invalide. Entrez votre âge en chiffres (ex: *25*)`,

  NON_COMPRIS: () => `❓ Je n'ai pas compris votre message.

Tapez *menu* pour voir les options disponibles.`,
};

// ── Machine à états ──────────────────────────────────────────

async function handleMessage(phone, incomingMsg) {
  const session = getSession(phone);
  const msg = incomingMsg.trim().toLowerCase();
  let response = '';

  // Commande globale reset
  if (msg === 'menu' || msg === 'stop' || msg === 'annuler') {
    resetSession(phone);
    return MESSAGES.MENU();
  }

  switch (session.step) {

    case 'MENU': {
      if (msg === '1' || msg.includes('demande')) {
        session.step = 'NOM';
        response = MESSAGES.DEMANDE_NOM();
      } else if (msg === '2' || msg.includes('condition')) {
        response = MESSAGES.CONDITIONS();
      } else if (msg === '3' || msg.includes('document')) {
        response = MESSAGES.DOCUMENTS();
      } else if (msg === '4' || msg.includes('agent')) {
        response = MESSAGES.AGENT();
      } else if (msg === '5' || msg.includes('suivi')) {
        response = MESSAGES.SUIVI();
      } else {
        response = MESSAGES.MENU();
      }
      break;
    }

    case 'NOM': {
      if (msg.length < 2) {
        response = '⚠️ Nom trop court. Entrez votre nom complet.';
      } else {
        session.data.nom = incomingMsg.trim();
        session.step = 'AGE';
        response = MESSAGES.DEMANDE_AGE(session.data.nom);
      }
      break;
    }

    case 'AGE': {
      const age = parseInt(msg);
      if (isNaN(age) || age < 18 || age > 75) {
        response = age < 18
          ? '❌ Désolé, vous devez avoir au moins *18 ans* pour faire une demande.'
          : MESSAGES.ERREUR_AGE();
      } else {
        session.data.age = age;
        session.step = 'ACTIVITE';
        response = MESSAGES.DEMANDE_ACTIVITE();
      }
      break;
    }

    case 'ACTIVITE': {
      const activites = { '1': 'Salarié(e)', '2': 'Commerçant(e)', '3': 'Travailleur indépendant', '4': 'Autre' };
      session.data.activite = activites[msg] || incomingMsg.trim();
      session.step = 'MONTANT';
      response = MESSAGES.DEMANDE_MONTANT();
      break;
    }

    case 'MONTANT': {
      const montant = parseMontant(msg);
      if (!montant || montant < 50000 || montant > 5000000) {
        response = MESSAGES.ERREUR_MONTANT();
      } else {
        session.data.montant = montant;
        session.step = 'DUREE';
        response = MESSAGES.DEMANDE_DUREE(montant);
      }
      break;
    }

    case 'DUREE': {
      const durees = { '1': 1, '2': 3, '3': 6, '4': 12, '5': 24 };
      const duree = durees[msg] || parseInt(msg);
      if (!duree || duree < 1 || duree > 24) {
        response = '⚠️ Choisissez une durée valide (1 à 5 ou tapez le nombre de mois).';
      } else {
        session.data.duree = duree;
        session.step = 'CONFIRMATION';
        response = MESSAGES.DEMANDE_CONFIRMATION(session.data);
      }
      break;
    }

    case 'CONFIRMATION': {
      if (msg === 'oui' || msg === 'yes' || msg === 'o') {
        response = MESSAGES.DEMANDE_OK(session.data);
        resetSession(phone);
      } else if (msg === 'non' || msg === 'no' || msg === 'n') {
        resetSession(phone);
        response = '❌ Demande annulée.\n\n' + MESSAGES.MENU();
      } else {
        response = 'Tapez *OUI* pour confirmer ou *NON* pour annuler.';
      }
      break;
    }

    default:
      resetSession(phone);
      response = MESSAGES.MENU();
  }

  return response;
}

module.exports = { handleMessage };
