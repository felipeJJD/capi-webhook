const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const app = express();
// type: '*/*' → parseia como JSON independente do Content-Type enviado
app.use(express.json({ type: '*/*' }));
app.use(express.urlencoded({ extended: true }));

// ─── Config ───────────────────────────────────────────────────────────────────
const PIXEL_ID      = process.env.PIXEL_ID      || '1867026417263870';
const CAPI_TOKEN    = process.env.CAPI_TOKEN    || 'EAASBbvEeaYkBQZCpa59QjK2JJ7FCcsC2ZABTzBJnIcvJ9n1EDlSnZAiNKnezBBZCjfDIxYSYAbLz7ns58mEUh9ZB4sGFGWn5wzvLZCnIKioMRgLkZCLWvS7Kl1pWEKhOkfRDctYgwTnkZBhzCZCnxBbmACSPeQZCk36hHcXQFx2U9ZCxW7y9TVsRGjP8IaTJ7rWJYBHQO7ZB03b5uD722k90sIGJ7MZCnPcVf32N5T7RWrZAOVxV93YoNPeZA4LJGgqfp1mj1sSS7Wn7dcVTMQ5IA114owq';
const EVENT_VALUE   = parseFloat(process.env.EVENT_VALUE   || '37.00');
const EVENT_CURRENCY = process.env.EVENT_CURRENCY || 'BRL';
const PORT          = parseInt(process.env.PORT  || '3000', 10);

const CAPI_URL = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normaliza o telefone: remove tudo que não é dígito.
 * Se não começar com 55 (código do Brasil), adiciona.
 */
function normalizePhone(raw) {
  let digits = raw.replace(/\D/g, '');
  if (!digits.startsWith('55')) {
    digits = '55' + digits;
  }
  return digits;
}

/** SHA-256 de uma string, retorna hex */
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Valida se parece um email real (tem @ e domínio com ponto) */
function isValidEmail(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Últimos N dígitos de uma string (para log seguro) */
function lastDigits(str, n = 4) {
  return '****' + str.slice(-n);
}

// ─── Rotas ────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/purchase', async (req, res) => {
  const { phone, name, email, value } = req.body || {};

  if (!phone) {
    return res.status(400).json({ success: false, error: 'Campo "phone" é obrigatório.' });
  }

  let normalizedPhone;
  try {
    normalizedPhone = normalizePhone(String(phone));
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Telefone inválido.' });
  }

  const hashedPhone = sha256(normalizedPhone);
  const eventId     = uuidv4();
  const eventTime   = Math.floor(Date.now() / 1000);

  // ─── user_data: quanto mais campos, maior o EMQ (Event Match Quality) ───
  const userData = {
    ph:      [hashedPhone],
    country: [sha256('br')],   // Brasil fixo — sempre ajuda o match
  };

  // Nome do WhatsApp → extrai primeiro nome
  if (name && String(name).trim()) {
    const firstName = String(name).trim().split(' ')[0].toLowerCase();
    userData.fn = [sha256(firstName)];
  }

  // Email → valida antes de usar (ignora "não tenho email", textos livres, etc.)
  const emailValid = isValidEmail(email);
  if (emailValid) {
    userData.em = [sha256(String(email).trim().toLowerCase())];
  }

  // Valor da venda → usa parâmetro ou fallback do env (R$49 padrão)
  const saleValue = value ? parseFloat(value) : EVENT_VALUE;

  const payload = {
    data: [{
      event_name:    'Purchase',
      event_time:    eventTime,
      action_source: 'other',
      event_id:      eventId,
      user_data:     userData,
      custom_data: {
        value:    saleValue,
        currency: EVENT_CURRENCY
      }
    }],
    access_token: CAPI_TOKEN
  };

  const emailLog = emailValid ? `✓ ${email.trim()}` : (email ? `✗ inválido (${email.trim()})` : 'N/A');
  console.log(`[${new Date().toISOString()}] Enviando Purchase | phone: ${lastDigits(normalizedPhone)} | name: ${name || 'N/A'} | email: ${emailLog} | value: R$${saleValue} | event_id: ${eventId}`);

  try {
    const response = await fetch(CAPI_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[${new Date().toISOString()}] Erro Meta CAPI:`, JSON.stringify(data));
      return res.status(502).json({ success: false, error: 'Erro ao enviar para Meta CAPI.', details: data });
    }

    console.log(`[${new Date().toISOString()}] Evento enviado com sucesso | events_received: ${data.events_received}`);
    return res.json({ success: true, events_received: data.events_received, event_id: eventId });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro de rede:`, err.message);
    return res.status(500).json({ success: false, error: 'Erro interno ao chamar Meta CAPI.' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Servidor CAPI rodando na porta ${PORT}`);
  console.log(`  GET  /health`);
  console.log(`  POST /purchase`);
});
