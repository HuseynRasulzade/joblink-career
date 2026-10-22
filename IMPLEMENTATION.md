# Joblink

An Azerbaijani candidate and employer application with persistent CV profiles,
PDF/DOCX/TXT import, printable CVs, explainable vacancy matching, career
recommendations, saved jobs, applications, active-candidate discovery, and
confirmation-based vacancy publication.

## Run

Use Node 22.13+ and `npm ci`, then `npm run dev`. Apply the generated SQL migration
to the local D1 binding before exercising the API. `npm run build` emits the
Cloudflare Worker and assets. `npm test` checks experience deduplication,
evidence-based matching, CV score changes, and vacancy-draft behavior.

## Authentication and data

The hosted private site uses platform ChatGPT sign-in. Every mutation requires
the trusted platform user ID. Employer actions check job/draft ownership on the
server; application CVs are snapshots visible only to their submitting candidate
and the owner of the relevant job. Candidate discovery requires explicit
availability and excludes direct contact fields. Do not expose the Worker
directly without an authentication gateway that strips/replaces identity headers.

D1 owns profiles, jobs, applications, bookmarks, drafts, and upload metadata.
R2 owns imported CV files. Browser state is not authoritative. Seeded jobs,
profiles and HR candidates are visibly marked as demonstration data; demonstration
applications do not reach the named companies.

## Analysis and AI

Without a provider secret, the UI explicitly reports rule-based CV analysis,
skill/experience matching and profession templates. These scores are not hiring
probabilities. Experience merges overlapping date ranges. Career paths require
evidence of shared skills and list missing skills.

Generative CV feedback and vacancy-copy assistance use the server-side Responses
API when `OPENAI_API_KEY` is configured as a Sites secret. `OPENAI_MODEL` defaults
to `gpt-5.2` and is configurable. The UI asks users to opt in before sending text
to OpenAI; API response storage is disabled. Vacancy publication is a separate
operation and always requires a reviewed draft and explicit confirmation.

The provider secret was not supplied in this task, so live model calls could not
be verified. External/public email-password authentication and the original
Vercel project's production database are not connected to this separate site.

## Verification performed

- TypeScript validation and deployment build.
- Four business-logic tests.
- Local integration checks with synthetic users: authentication, ownership,
  profile persistence/validation, confirmation and idempotency, duplicate
  applications, applicant privacy, status propagation, bookmarks and opt-out.
- PDF, DOCX and TXT extraction with synthetic documents.

# Independent Cloudflare deployment

## CV autofill and DeepSeek update

The public Worker now supports DEEPSEEK_API_KEY as a Cloudflare secret, with DEEPSEEK_MODEL defaulting to deepseek-chat. DeepSeek takes precedence over the optional OpenAI provider. A synthetic DeepSeek contact-extraction request returned HTTP 200. The key is not in source or client assets; rotate keys disclosed in chat.

CV upload offers a local, conservative contact/label/skills extraction preview. The CV tab also provides consent-gated AI extraction for work history, education and other profile fields. Both use a review/apply step and require a separate profile save. Unknown dates remain empty for user correction; scanned image-only PDFs still require OCR, which is not implemented. Existing auth protects the parse endpoint and only a consented CV text is sent to the selected provider.

TypeScript, production build, existing model tests, and focused local CV-field extraction/merge checks passed. No real candidate CV was used in the provider test. Historical notes below describe the initial deployment before this update.

The public deployment uses `wrangler.external.json` and a separate Cloudflare D1 database. Build with `npm run build:cloudflare`, then publish with `npm run deploy:cloudflare`. Apply new schema migrations with `npx wrangler d1 migrations apply DB --remote --config wrangler.external.json` before deploying changes that require them.

External authentication uses email/password accounts with salted PBKDF2 password hashes and seven-day, hashed, HttpOnly/Secure/SameSite session cookies. Incoming ChatGPT identity headers are ignored in this deployment. Authentication endpoints enforce same-origin requests and rate limits. Password reset by email is not configured.

CV PDF/DOCX/TXT parsing runs in the browser on the external deployment. Only extracted CV text and the filename are saved with the profile; original documents are not stored. No R2 subscription or paid hosting plan was enabled. Generative AI remains disabled until an OpenAI API key is configured; the UI identifies the existing rule-based analysis and vacancy templates.

Verified locally: TypeScript, model tests, production build, origin enforcement, session revocation, spoofed-header rejection, profile/CV persistence, account isolation, confirmed job publishing and applications. The external database is separate from private Sites data.
