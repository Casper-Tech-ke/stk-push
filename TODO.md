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

- [ ] Preserve the Safaricom sandbox OAuth, STK Push request, and callback response behavior.
- [ ] Receive callback notifications at a server endpoint and return the accepted response expected by Safaricom.

## Preview readiness

- [ ] Serve the declared page route manifest and listen on the managed runtime port.
