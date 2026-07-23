# Freezer Batch Cocktails workflow v2 migration

`FreezerBatchCocktails-v2.json` is an inactive, importable replacement for the legacy public
webhook workflow. Do not remove v1 until the staging matrix below passes.

## Import and configure

1. In n8n, import `FreezerBatchCocktails-v2.json` and leave it inactive.
2. Create or select these named configuration values; enter values only in n8n/its secret
   store, never in this repository:
   - `N8N_WEBHOOK_SECRET` — must match the Pages `N8N_WEBHOOK_SECRET` binding.
   - `RESEND_API_KEY` — the Resend API credential used by the HTTP request nodes.
   - `FBC_CRM_SHEET_ID` — the Subscribers spreadsheet identifier.
3. Attach a Google Sheets OAuth2 credential to **Upsert Newsletter Pending Consent**,
   **Upsert Recipe Pending Consent**, and **Record Unsubscribe**, and confirm the
   `Subscribers` sheet has the mapped columns:
   `Email`, `Status`, `Source`, `Consent Version`, `Consent Timestamp`, `Page`, and
   `Unsubscribed At`.
4. Configure the double-opt-in mechanism used by the subscriber system. This workflow records
   consent as `pending` and sends the confirmation message; only a completed confirmation may
   promote the CRM status to `subscribed`. If the selected CRM/ESP cannot provide that callback,
   use the documented single-opt-in fallback and record the same consent version, source, and
   timestamp before setting `subscribed`.
5. Confirm the Resend sender identity is `Freezer Batch Cocktails
   <recipes@freezerbatchcocktails.com>` with reply-to `hello@freezerbatchcocktails.com`.
6. Activate v2 only after the Pages Function is deployed with its matching webhook URL and
   secret.

## Staging matrix

Use controlled, disposable test addresses and a test sheet. Send each request through the
Pages Function, not directly to the n8n webhook. Confirm the Function passes the secret and
request ID headers.

| Request | Expected result |
|---|---|
| `send_recipe`, `marketingConsent: false` | One transactional recipe email; no CRM write; no confirmation email. |
| `send_recipe`, `marketingConsent: true` | One transactional recipe email; CRM row `pending` with consent metadata; one confirmation email. |
| `subscribe` | No recipe email; CRM row `pending` with source, page, consent version, timestamp; one confirmation email. |
| `unsubscribe` | No email; CRM row is upserted as `unsubscribed` with timestamp and source, including when no prior row exists. |
| Unknown action | No CRM write and no email; deterministic invalid-action response. |
| Wrong or missing `X-FBC-Webhook-Secret` | 401 response; no CRM write and no email. |
| Repeated request ID | Resend accepts only one message per matching `Idempotency-Key` per send type. |
| HTML-looking recipe/ingredient values | Message displays literal text; it must not execute or create markup. |

Also inspect each message’s HTML and text alternative, the apex-host links, sender/reply-to,
and the 22% freezer-pour and citrus-storage copy.

## Cutover and rollback

1. Deploy the Pages Function and v2 together, with `N8N_WEBHOOK_URL` targeting the v2 webhook.
2. Run the staging matrix against production-equivalent configuration and review n8n/Resend
   execution logs without exposing addresses, tokens, request bodies, or secrets.
3. Activate v2, then disable the legacy v1 workflow or protect its public webhook with the
   same secret check.
4. Observe Function errors, n8n failures, Resend delivery, and CRM consent rows for 48 hours.

Rollback is intentionally simple: change the Pages `N8N_WEBHOOK_URL` back to v1, re-enable v1
only if necessary, and deactivate v2. Record the reason, preserve evidence, and do not expose
the legacy public endpoint after the incident is resolved.
