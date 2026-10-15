# Any-Shape Flow — Cloudflare Deployment Test

**Experimental deployment with real R2/D1 handlers.** The original exported frontend has been adapted to submit through a same-origin Pages Function. This is a test repository, **not yet an independently verified live deployment**. Use only synthetic submissions and files.

## One-time setup — GitHub Actions

1. In this repository open **Settings → Secrets and variables → Actions**.
2. Under **Secrets**, add `CLOUDFLARE_API_TOKEN` with a scoped Cloudflare API token. Never paste the token in committed files or chat.
3. Under **Variables**, add:
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID.
   - `D1_DATABASE_ID` — UUID of the existing D1 database `any-shape-test-submissions`.
   - `R2_BUCKET_NAME` — exact name of an existing Cloudflare R2 bucket.
   - `PAGES_PROJECT_NAME` — optional, defaults to `any-shape-form-tests`.
4. Ensure the Cloudflare Pages project has already been created for this **direct-upload/Wrangler deployment workflow**. A Git-integrated Pages project may use a different deployment setup; do not mix incompatible project types.
5. Open **Actions → Deploy and verify Cloudflare Pages test → Run workflow**. Monitor the logs. This workflow creates an ephemeral Wrangler configuration on the runner, applies the D1 schema, and deploys the project.

The token exists only inside GitHub Actions when a workflow runs. It is **not** included in downloaded ZIPs, JavaScript, or any browser request.

## Live check

Open the Cloudflare Pages URL printed by the workflow. Complete the Flow form using synthetic answers, attach a small text or image file, and submit. The receipt must report `r2: accepted` and `d1: accepted`, with an individual `recordUrl`. Open that record URL and verify that the JSON matches the answers and includes actual attachment metadata. Use the R2 dashboard to verify stored objects under `Submitted-Files/<type>/<formId>/<submissionId>/`. The D1 table should contain the submission JSON.

**Status honesty:** No real Cloudflare workflow run or full end-to-end verification has been observed in this chat. A successful GitHub Actions deployment does not, by itself, prove that R2 and D1 submissions work. The workflow currently provisions the D1 table and deploys; it does **not yet execute automated live submission/GET verification**. Do not claim that all three Any-Shape exporters have this backend; this repository is a focused experiment on Flow.

## Architecture

- Static exported form: `index.html`, `style.css`, `app.js`, `form.json`.
- `functions/api/submit.js`: accepts multipart submission JSON and files, writes JSON to R2 and D1.
- `functions/api/submissions/[[id]].js`: resolves stored JSON by ID from D1 or R2.
- `functions/api/file-routing.js`: routes attachments by content category under `Submitted-Files/`.
- `migrations/0001_submissions.sql`: repeatable database table/index creation.
- `.github/workflows/cloudflare-pages-test.yml`: deploys via GitHub Actions using secret and variables.

The stable, portable behavioral contract should ultimately move back into the shared Any-Shape exporter after we capture successful live evidence. This test repository should not become a second long-term implementation.
