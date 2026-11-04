const form = document.querySelector('#payment-form');
const phoneInput = document.querySelector('#phone');
const amountInput = document.querySelector('#amount');
const submitButton = document.querySelector('#submit-button');
const statusCard = document.querySelector('#status-card');
const statusTitle = document.querySelector('#status-title');
const statusMessage = document.querySelector('#status-message');
const environmentPill = document.querySelector('#environment-pill');
const finePrint = document.querySelector('#fine-print');
const footerMode = document.querySelector('#footer-mode');

const states = {
  idle: { icon: 'i', title: 'Ready when you are', message: 'Your payment status will appear here.' },
  loading: { icon: '…', title: 'Connecting to Daraja', message: 'Preparing your secure Till payment request.' },
  pending: { icon: '↗', title: 'Prompt sent to your phone', message: 'Approve the M-Pesa prompt on your phone to complete payment.' },
  successful: { icon: '✓', title: 'Payment successful', message: 'The Till payment was completed successfully.' },
  cancelled: { icon: '×', title: 'Payment cancelled', message: 'The payment was cancelled on the customer’s phone.' },
  insufficient: { icon: '!', title: 'Insufficient balance', message: 'The customer did not have enough M-Pesa balance.' },
  timeout: { icon: '⌛', title: 'No response from phone', message: 'The prompt expired before it was completed.' },
  failed: { icon: '!', title: 'Payment not completed', message: 'Safaricom could not complete the payment.' },
  error: { icon: '!', title: 'Could not start payment', message: 'Check the details and try again.' }
};

function setStatus(state, message) {
  const copy = states[state] || states.error;
  statusCard.dataset.state = state;
  statusCard.querySelector('.status-icon').textContent = copy.icon;
  statusTitle.textContent = copy.title;
  statusMessage.textContent = message || copy.message;
}

function setFieldError(id, message) {
  const field = document.querySelector(`#${id}`);
  const group = field.closest('.field-group');
  group.classList.toggle('invalid', Boolean(message));
  group.querySelector('.field-error').textContent = message || '';
}

function normalizePhone(value) {
  const compact = String(value || '').trim().replace(/[\s().-]/g, '');
  if (/^\+254\d{9}$/.test(compact)) return compact.slice(1);
  if (/^254\d{9}$/.test(compact)) return compact;
  if (/^0\d{9}$/.test(compact)) return `254${compact.slice(1)}`;
  return null;
}

function validate() {
  const phone = normalizePhone(phoneInput.value);
  const amount = Number(amountInput.value);
  setFieldError('phone', phone ? '' : 'Enter a valid Kenyan mobile number.');
  setFieldError('amount', Number.isInteger(amount) && amount >= 1 && amount <= 150000 ? '' : 'Enter a whole-number amount between KES 1 and KES 150,000.');
  return phone && Number.isInteger(amount) && amount >= 1 && amount <= 150000 ? { phone, amount } : null;
}

async function pollStatus(checkoutRequestId) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const response = await fetch(`/api/stk-status/${encodeURIComponent(checkoutRequestId)}`, { cache: 'no-store' });
    if (!response.ok) continue;
    const result = await response.json();
    setStatus(result.state, result.message);
    if (result.state !== 'pending') return;
  }
  setStatus('timeout', 'No callback arrived before the monitoring window closed. Check the M-Pesa message or business statement.');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const details = validate();
  if (!details) return;
  submitButton.disabled = true;
  submitButton.querySelector('.button-label').textContent = 'Sending prompt…';
  setStatus('loading');
  try {
    const response = await fetch('/api/stk-push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(details) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'The payment request could not be started.');
    setStatus('pending', result.message);
    if (result.checkoutRequestId) pollStatus(result.checkoutRequestId);
  } catch (error) {
    setStatus('error', error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('.button-label').textContent = 'Send STK prompt';
  }
});

Promise.resolve(fetch('/api/config', { cache: 'no-store' })).then((response) => response.json()).then((config) => {
  const label = config.environment === 'production' ? 'Production · Till live' : 'Sandbox · Test mode';
  environmentPill.innerHTML = `<span class="status-dot"></span>${label}`;
  finePrint.textContent = config.environment === 'production' ? 'Live Daraja mode · CustomerBuyGoodsOnline · H.O./Store → Till' : 'Sandbox Daraja mode · Test credentials only';
  footerMode.textContent = config.environment === 'production' ? 'Daraja production · CustomerBuyGoodsOnline' : 'Daraja sandbox · Test mode';
}).catch(() => {
  environmentPill.innerHTML = '<span class="status-dot"></span>Mode unavailable';
  finePrint.textContent = 'Daraja environment could not be read.';
});
