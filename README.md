# Deploy this form

Upload `index.html`, `style.css`, `app.js`, and `form.json` together to any static web host, including GitHub Pages. Open the hosted HTTPS URL. Do not open `index.html` directly using file:// because browsers can block loading `form.json`.

There is no editor, settings panel, admin route, analytics or vendor branding in the public site. To change the form later, edit `form.json` directly and redeploy the files.

## Webhook delivery
The only default delivery mechanism is the configured HTTP(S) JSON POST webhooks in `form.json` under `delivery.webhooks`. Browser-local storage is deliberately excluded. The public form sends:

- Method: POST
- Request headers: `Content-Type: application/json`, `Accept: application/json`
- JSON body: `{schemaVersion, formId, id, submittedAt, answers}`
- Expected response: HTTP 2xx. A 2xx acknowledges HTTP receipt, not downstream business completion.

## CORS configuration for the receiving service
Your webhook receiver must allow the **deployed website origin**, not just localhost.

Typical CORS preflight request: `OPTIONS /your-path` with `Origin: https://your-domain.example`, `Access-Control-Request-Method: POST`, and `Access-Control-Request-Headers: content-type`.

Typical response headers from the server for OPTIONS and the POST response:
```
Access-Control-Allow-Origin: https://your-domain.example
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept
Vary: Origin
```
Return HTTP 204 for OPTIONS where appropriate. Use an explicit trusted origin rather than a wildcard when credentials or sensitive contexts are involved. This form intentionally omits browser credentials. Browsers control the Origin header; don't try to set it in JavaScript.

**Security:** Never put tokens, passwords, signing keys, or privileged service credentials in `form.json` or client JavaScript. Use a server-side relay if the receiver requires secrets, does not support CORS, or needs anti-spam, durable persistence, authorization, verified downstream processing, or idempotent delivery. Do not expose unrestricted privileged webhooks directly to public visitors.

**Capability limits:** The exported runtime supports standard fields, select/multiple choice, matrix, conditions, repeated sections, simple line items and JSON submissions. Some richer editor-specific semantics (e.g. full drag-ranking, actual file uploads, cryptographic signatures, sophisticated branching) require future audited adapters and must not be assumed equivalent. Test your exported form before deploying it publicly.
