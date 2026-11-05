# Contributing to STK Push

Thank you for contributing to **XCASPER SPACE STK TILL PUSH**. This project provides a Safaricom Daraja Buy Goods Till STK Push flow and handles live payment requests, so changes should be deliberate, reviewable, and safe.

## Before you start

Read the [README](./README.md), especially the Daraja product mapping, callback requirements, deployment notes, and security guidance. Use a Daraja sandbox app for development whenever possible. Do not use live production credentials for local testing unless the test is explicitly approved.

## Development setup

```bash
git clone https://github.com/Casper-Tech-ke/stk-push.git
cd stk-push
npm install
cp .env.example .env
npm start
```

Open `http://127.0.0.1:3000/` for the checkout and `http://127.0.0.1:3000/docs` for the Daraja guide. The server uses `PORT` when supplied by Render or another process manager.

## Branches and commits

Create a focused branch from `main`:

```bash
git checkout -b fix/short-description
```

Use a clear imperative commit subject, such as `Improve callback status handling`. Keep unrelated changes out of the same pull request.

## Pull requests

A pull request should explain the user-facing or operational change, identify any Daraja behavior affected, and include the validation performed. For UI changes, include a screenshot or a short description of the responsive behavior. For API changes, document request/response changes and callback implications.

Before opening a pull request, run:

```bash
node --check server.js
node --check public/app.js
python3 -m json.tool public/manus-routes.json >/dev/null
git diff --check
```

If you change the production request payload, verify the official Daraja documentation and explain the relevant `BusinessShortCode`, `PartyB`, `TransactionType`, callback, or passkey behavior in the pull request.

## Security rules

Never commit `.env`, Daraja consumer keys, consumer secrets, passkeys, access tokens, phone-number lists, or raw callback logs. Use `.env.example` for variable names only. Mask phone numbers in logs and do not mark a payment successful from the STK request response alone; use the Safaricom callback and reconcile the result with the merchant statement.

Do not send duplicate live STK requests while debugging. Use the health and configuration endpoints for non-payment checks:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/config
curl http://127.0.0.1:3000/api/activity
```

## Deployment changes

Render deployment is defined in [`render.yaml`](./render.yaml). Local or VPS deployment uses `npm start` with a protected environment file and a public HTTPS callback URL. Do not change the production callback URL, Till mapping, or reverse-proxy configuration without documenting the change.

## Reporting issues

When reporting an issue, include the commit or deployment version, environment (sandbox or production), endpoint affected, sanitized error message, and reproduction steps. Never include credentials, PINs, full phone numbers, access tokens, or unredacted payment payloads.

## Maintainer

The site is improved and maintained by **SPACE TECH KE DEVS** under the Casper-Tech-ke project ownership.
