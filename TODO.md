# TODO

## Responsive payment experience

- [ ] Provide a polished responsive HTML frontend for the M-Pesa STK Push sandbox application.
- [ ] Let the user enter a Kenyan phone number and payment amount.
- [ ] Show concise sandbox-oriented payment guidance and explain that the user must approve the prompt on their phone.

## Validation and request flow

- [ ] Normalize Kenyan phone numbers and show clear field-level guidance for invalid input.
- [ ] Validate the payment amount and show a clear field-level error when it is invalid.
- [ ] Submit to a server-side STK Push endpoint without exposing consumer credentials or the passkey in browser code.
- [ ] Show a prominent loading state while the request is being initiated and prevent duplicate submissions.
- [ ] Show understandable success and error feedback based on the server response with an easy retry path.

## Safaricom integration

- [ ] Preserve the Safaricom Daraja OAuth, STK Push request, and callback response behavior for the configured environment.
- [ ] Select sandbox or production endpoints only from protected runtime configuration.
- [ ] Use `CustomerBuyGoodsOnline` for a production Buy Goods Till STK Push, with the Till as the business shortcode and Party B.
- [ ] Use the H.O./Store number as `BusinessShortCode` and the actual Till number as `PartyB`.
- [ ] Keep Business Buy Goods B2B separate from the customer-facing STK Push flow.
- [ ] Show the active environment in the interface without exposing credentials.
- [ ] Require a public HTTPS callback URL when production mode is enabled.
- [ ] Receive callback notifications at a server endpoint and return the accepted response expected by Safaricom.

## Preview readiness

- [ ] Serve the declared page route manifest and listen on the managed runtime port.
