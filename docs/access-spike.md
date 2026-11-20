# Cloudflare Access spike: can it protect only `/admin*` and `/api/admin*` on workers.dev?

Status: **desk research only. Not yet verified hands-on in the dashboard** (no Cloudflare resources created).

## Findings (from Cloudflare docs, via search)
- **Whole-Worker Access is the wrong tool.** Enabling Access from the Worker's own settings (the one-click option, Oct 2025 changelog) protects every domain tied to the Worker, including workers.dev and previews. That would lock guests out. Do **not** use it.
- **Hostname/path-based Access appears supported on workers.dev.** The Workers "Cloudflare Access" doc describes using a self-hosted Access application when only a specific URL or path should require sign-in, and lists a workers.dev hostname as an example. Create it in Zero Trust > Access > Applications with the workers.dev hostname as the domain and a path.
- **Path matching caveat.** A wildcard path does not cover the bare parent path. Expect to need entries for both `/admin` and `/admin/*`, and both `/api/admin` and `/api/admin/*` (or equivalents). Not confirmed with a doc example; test it.
- **Deny by default.** Access apps deny unless an Allow policy matches. Use an email-based Allow policy (OTP does not support group rules).
- **Free plan:** Zero Trust Free covers up to 50 users; reports say signup asks for payment details even for free. Unverified.
- **OTP on workers.dev:** no doc statement found either way. Verify.

## Outcome options
- (a) Path-scoped Access works on workers.dev: use `access-jwt` strategy. Preferred.
- (b) It does not: buy a cheap custom domain, then path-scope there.
- (c) Use the `password-cookie` fallback strategy (already planned as a pluggable strategy).

## Hands-on test plan (needs owner approval to create Cloudflare resources)
1. Deploy the hello-world Worker (Phase 1 scaffold) to workers.dev.
2. Create a self-hosted Access app for `<worker>.<account>.workers.dev` with paths `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*`, Allow policy = owner email.
3. From a logged-out/incognito browser confirm: `/admin/` and `/api/admin/anything` show the Access login; `/`, `/i/TEST` and `/api/health` stay public; OTP email arrives; after login `Cf-Access-Jwt-Assertion` reaches the Worker.
4. Record: JWKS URL (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`), AUD tag, and any surprises.

Sources: Cloudflare docs, "Cloudflare Access" under Workers configuration; Zero Trust "Application paths" and "Self-hosted applications"; changelog 2025-10-03.
