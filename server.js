hereconst { twiml: { MessagingResponse } } = require('twilio');
const { handleMessage } = require('./bot');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.json({
      status: 'OK',
      bot: 'FinanceXpress WhatsApp Bot'
    });
  }

  try {
    let body = '';
    await new Promise((resolve) => {
      req.on('data', chunk => body += chunk);
      req.on('end', resolve);
    });

    const params = new URLSearchParams(body);
    const incomingMsg = params.get('Body') || '';
    const fromNumber = params.get('From') || '';

    console.log(`MSG de ${fromNumber}: "${incomingMsg}"`);

    const replyText = await handleMessage(fromNumber, incomingMsg);

    const twimlResponse = new MessagingResponse();
    twimlResponse.message(replyText);

    res.setHeader('Content-Type', 'text/xml');
    return res.send(twimlResponse.toString());

  } catch (err) {
    console.error('Erreur:', err);
    const twimlResponse = new MessagingResponse();
    twimlResponse.message('⚠️ Erreur. Tapez menu pour recommencer.');
    res.setHeader('Content-Type', 'text/xml');
    return res.send(twimlResponse.toString());
  }
};
