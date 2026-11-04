const form = document.querySelector('#payment-form');
const phoneInput = document.querySelector('#phone');
const amountInput = document.querySelector('#amount');
const submitButton = document.querySelector('#submit-button');
const buttonLabel = document.querySelector('.button-label');
const statusCard = document.querySelector('#status-card');
const statusTitle = document.querySelector('#status-title');
const statusMessage = document.querySelector('#status-message');
const environmentPill = document.querySelector('#environment-pill');
const finePrint = document.querySelector('#fine-print');
const footerMode = document.querySelector('#footer-mode');

async function loadEnvironment() {
  try {
    const response = await fetch('/api/config', { headers: { Accept: 'application/json' } });
    const config = await response.json();
    const production = config.environment === 'production';
    environmentPill.innerHTML = `<span class="status-dot"></span> ${production ? 'Production test' : 'Sandbox mode'}`;
    finePrint.textContent = production
      ? 'Production test mode. Continue only when you intend to trigger a live M-Pesa request.'
      : 'By continuing, you’re testing against the Safaricom Daraja sandbox. No production funds are moved.';
    footerMode.textContent = production ? 'Daraja production · Preview testing' : 'Daraja sandbox · Local testing';
  } catch {
    environmentPill.innerHTML = '<span class="status-dot"></span> Environment unavailable';
    finePrint.textContent = 'The active payment environment could not be confirmed.';
  }
}

function normalizePhone(value) {
  const compact = String(value || '').trim().replace(/[\s().-]/g, '');
  if (/^\+254\d{9}$/.test(compact)) return compact.slice(1);
  if (/^254\d{9}$/.test(compact)) return compact;
  if (/^0\d{9}$/.test(compact)) return `254${compact.slice(1)}`;
  return null;
}

function setFieldError(name, message) {
  const input = name === 'phone' ? phoneInput : amountInput;
  const group = input.closest('.field-group');
  const error = document.querySelector(`#${name}-error`);
  group.classList.toggle('invalid', Boolean(message));
  input.closest('.input-wrap').classList.remove('valid');
  error.textContent = message || '';
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function validate() {
  const phone = normalizePhone(phoneInput.value);
  const amount = Number(amountInput.value);
  let valid = true;

  if (!phone) {
    setFieldError('phone', 'Enter a valid Kenyan number, for example 0712 345 678.');
    valid = false;
  } else {
    setFieldError('phone', '');
    phoneInput.closest('.input-wrap').classList.add('valid');
  }

  if (!Number.isInteger(amount) || amount < 1 || amount > 150000) {
    setFieldError('amount', 'Enter a whole-number amount between KES 1 and KES 150,000.');
    valid = false;
  } else {
    setFieldError('amount', '');
    amountInput.closest('.input-wrap').classList.add('valid');
  }
  return { valid, phone, amount };
}

function showStatus(state, title, message) {
  statusCard.dataset.state = state;
  statusTitle.textContent = title;
  statusMessage.textContent = message;
  const icon = statusCard.querySelector('.status-icon');
  icon.textContent = state === 'success' ? '✓' : state === 'error' ? '!' : state === 'loading' ? '·' : 'i';
}

function setLoading(loading) {
  submitButton.disabled = loading;
  buttonLabel.textContent = loading ? 'Sending prompt…' : 'Send STK prompt';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const { valid, phone, amount } = validate();
  if (!valid) {
    showStatus('error', 'Check the highlighted fields', 'We need a valid phone number and amount before sending.');
    return;
  }

  setLoading(true);
  showStatus('loading', 'Connecting to M-Pesa…', 'We’re sending the payment prompt to your phone.');
  try {
    const response = await fetch('/api/stk-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, amount })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      if (result.field) setFieldError(result.field, result.message);
      throw new Error(result.message || 'The payment request could not be started.');
    }
    showStatus('success', 'Prompt sent to your phone', result.message || 'Approve the request in M-Pesa to complete the payment.');
  } catch (error) {
    showStatus('error', 'Couldn’t start the payment', error.message || 'Please check your details and try again.');
  } finally {
    setLoading(false);
  }
});

phoneInput.addEventListener('input', () => {
  if (phoneInput.value) validate();
});
amountInput.addEventListener('input', () => {
  if (amountInput.value) validate();
});

loadEnvironment();
