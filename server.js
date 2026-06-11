// ============================================================
// SERVEUR EXPRESS — WEBHOOK TWILIO WHATSAPP
// ============================================================

require('dotenv').config();
const express = require('express');
const { twiml: { MessagingResponse } } = require('twilio');
const { handleMessage } = require('./bot');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ── Health check (pour Render) ────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    bot: 'FinanceXpress WhatsApp Bot',
    time: new Date().toISOString()
  });
});

// ── Webhook principal Twilio ──────────────────────────────────
app.post('/webhook', async (req, res) => {
  try {
    const incomingMsg = req.body.Body || '';
    const fromNumber  = req.body.From || '';  // ex: "whatsapp:+237..."

    console.log(`[${new Date().toLocaleTimeString()}] MSG de ${fromNumber}: "${incomingMsg}"`);

    const replyText = await handleMessage(fromNumber, incomingMsg);

    const twimlResponse = new MessagingResponse();
    twimlResponse.message(replyText);

    res.type('text/xml').send(twimlResponse.toString());

  } catch (err) {
    console.error('Erreur webhook:', err);
    const twimlResponse = new MessagingResponse();
    twimlResponse.message('⚠️ Une erreur est survenue. Tapez *menu* pour recommencer.');
    res.type('text/xml').send(twimlResponse.toString());
  }
});

// ── Démarrage ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Bot FinanceXpress démarré sur le port ${PORT}`);
});
