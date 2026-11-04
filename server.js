const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY_BYTES = 32 * 1024;
const isProduction = process.env.MPESA_ENV === 'production';
const safaricomBaseUrl = isProduction ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function normalizePhone(value) {
  const compact = String(value || '').trim().replace(/[\s().-]/g, '');
  if (/^\+254\d{9}$/.test(compact)) return compact.slice(1);
  if (/^254\d{9}$/.test(compact)) return compact;
  if (/^0\d{9}$/.test(compact)) return `254${compact.slice(1)}`;
  return null;
}

function validateAmount(value) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 1 || amount > 150000) return null;
  return amount;
}

function getCallbackUrl(req) {
  if (process.env.CALLBACK_URL) return process.env.CALLBACK_URL;
  if (isProduction) throw new Error('A public HTTPS CALLBACK_URL is required for production testing.');
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const protocol = forwardedProto || 'http';
  const host = forwardedHost || req.headers.host;
  return `${protocol}://${host}/api/callback`;
}

function currentTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

async function getAccessToken() {
  const key = process.env.CONSUMER_KEY;
  const secret = process.env.CONSUMER_SECRET;
  if (!key || !secret) throw new Error('Safaricom credentials are not configured on the server.');

  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
  const response = await fetch(`${safaricomBaseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json'
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error('Safaricom OAuth rejected the configured credentials.');
  }
  return data.access_token;
}

async function sendStkPush(req, phoneNumber, amount) {
  const businessShortCode = process.env.HO_NUMBER || (isProduction ? '' : (process.env.SHORTCODE || '174379'));
  const tillNumber = process.env.TILL_NUMBER || (isProduction ? '' : (process.env.SHORTCODE || '174379'));
  if (!businessShortCode) throw new Error('The production H.O./Store number is not configured on the server.');
  if (!tillNumber) throw new Error('The production Till number is not configured on the server.');
  const transactionType = process.env.MPESA_TRANSACTION_TYPE || (isProduction ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline');
  const passkey = process.env.PASSKEY;
  if (!passkey) throw new Error('The Safaricom passkey is not configured on the server.');

  const timestamp = currentTimestamp();
  const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');
  const token = await getAccessToken();
  const response = await fetch(`${safaricomBaseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: tillNumber,
      PhoneNumber: phoneNumber,
      AccountReference: 'Till payment',
      TransactionDesc: 'Buy Goods payment',
      CallBackURL: getCallbackUrl(req)
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ResponseCode !== '0') {
    const message = data.errorMessage || data.ResponseDescription || 'Safaricom could not accept the STK request.';
    throw new Error(message);
  }
  return data;
}

async function handleStkRequest(req, res) {
  let input;
  try {
    input = JSON.parse(await readRequestBody(req) || '{}');
  } catch {
    sendJson(res, 400, { ok: false, message: 'Please send a valid JSON request.' });
    return;
  }

  const phoneNumber = normalizePhone(input.phone);
  const amount = validateAmount(input.amount);
  if (!phoneNumber) {
    sendJson(res, 400, { ok: false, field: 'phone', message: 'Enter a valid Kenyan number, for example 0712 345 678.' });
    return;
  }
  if (!amount) {
    sendJson(res, 400, { ok: false, field: 'amount', message: 'Enter a whole-number amount between KES 1 and KES 150,000.' });
    return;
  }

  try {
    const result = await sendStkPush(req, phoneNumber, amount);
    console.log(`STK request accepted for ${phoneNumber.slice(0, 6)}•••${phoneNumber.slice(-2)} / KES ${amount}`);
    sendJson(res, 200, {
      ok: true,
      message: 'STK prompt sent. Approve it on your phone to complete the payment.',
      checkoutRequestId: result.CheckoutRequestID,
      customerMessage: result.CustomerMessage
    });
  } catch (error) {
    console.error('STK request failed:', error.message);
    sendJson(res, 502, { ok: false, message: error.message || 'The payment request could not be started.' });
  }
}

function handleCallback(req, res) {
  readRequestBody(req)
    .then((body) => {
      let payload = {};
      try { payload = JSON.parse(body || '{}'); } catch { /* Safaricom callbacks should be JSON. */ }
      const callback = payload?.Body?.stkCallback;
      if (Number(callback?.ResultCode) === 0) {
        const items = callback.CallbackMetadata?.Item || [];
        const details = Object.fromEntries(items.map((item) => [item.Name, item.Value]));
        console.log(`Payment successful: KES ${details.Amount || '?'} / receipt ${details.MpesaReceiptNumber || '?'}`);
      } else if (callback) {
        console.log(`Payment failed or cancelled: ${callback.ResultDesc || 'Unknown result'}`);
      } else {
        console.log('Received an unrecognized Safaricom callback.');
      }
      sendJson(res, 200, { ResultCode: 0, ResultDesc: 'Accepted' });
    })
    .catch(() => sendJson(res, 400, { ResultCode: 0, ResultDesc: 'Accepted' }));
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${requested}`);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    sendText(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendText(res, 404, 'Not found', 'text/plain; charset=utf-8');
      return;
    }
    const extension = path.extname(filePath).toLowerCase();
    sendText(res, 200, content, contentTypes[extension] || 'application/octet-stream');
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/config') {
    sendJson(res, 200, {
      environment: isProduction ? 'production' : 'sandbox',
      transactionType: process.env.MPESA_TRANSACTION_TYPE || (isProduction ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline'),
      tillConfiguration: isProduction ? Boolean(process.env.HO_NUMBER && process.env.TILL_NUMBER) : true
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'mpesa-stk-checkout', environment: isProduction ? 'production' : 'sandbox' });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/stk-push') {
    await handleStkRequest(req, res);
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/callback') {
    handleCallback(req, res);
    return;
  }
  if (req.method === 'GET') {
    serveStatic(req, res, url.pathname);
    return;
  }
  sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`M-Pesa STK Checkout listening on port ${PORT}`);
});
