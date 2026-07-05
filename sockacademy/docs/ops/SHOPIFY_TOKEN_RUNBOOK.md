# Shopify Admin API Token — Runbook (proven working method, 05/07/2026)

Use this exact procedure any time `SHOPIFY_MASTER_TOKEN` needs to be
(re)generated — e.g. after a leak/rotation, or if a new store/app is needed.
It replaces the old classic Custom App flow, which Shopify has sunset.

**Context:** the old "Apps and sales channels → Develop apps → Create an
app" classic Custom App UI no longer produces a usable OAuth flow the way
it used to. New apps must be created through the **Dev Dashboard**
(`dev.shopify.com/dashboard`), which uses "Shopify Managed Installation" by
default — that model does **not** hand back an OAuth `code`, only
`hmac`/`host` params, so the classic token-exchange script can't be used
against it out of the box. The steps below show how to force the classic
flow back on for a Dev Dashboard app.

## 1. Create a fresh app via Shopify CLI

```
shopify app init -n <name> --template none -d npm
```

- App name: max 30 chars, cannot contain the word "Shopify".
- This scaffolds a `shopify.app.toml` in the new folder.

## 2. Configure `shopify.app.toml`

Required sections:

```toml
client_id = "<generated after first deploy>"
name = "<app name>"
application_url = "https://example.com"
embedded = true

[build]
automatically_update_urls_on_dev = true

[webhooks]
api_version = "<current>"

[access.admin]
direct_api_mode = "offline"
embedded_app_direct_api_access = true

[access_scopes]
scopes = "<comma-separated list — see corp/core agents for what's actually used; exclude customer_*, unauthenticated_*, and shop_app:oauth — those are Customer Account API / Storefront API / Shop App scopes, none of which this project's agents use since they only call the Admin API>"

[auth]
redirect_urls = [ "https://example.com" ]

[sidekick]
extensions_summary = "Integration app used to obtain a Shopify Admin API access token for SockAcademy's automation agents."
```

**Gotcha:** `extensions_summary` under `[sidekick]` is mandatory the moment
the app template includes any "sidekick-eligible" extension — deploy fails
with "An extensions_summary is required..." otherwise.

## 3. Deploy

```
shopify app deploy --reset
```

Run this **interactively in your own terminal** (not via an agent's
non-interactive shell) — it prompts "Create this project as a new app?"
and asks for the app name.

**Gotcha:** the CLI may silently switch to using a *different* config file
than the one you edited — e.g. `shopify.app.<slugified-name>.toml` instead
of `shopify.app.toml` — if you named the app differently than the folder.
Check the CLI output line "Using shopify.app.XXX.toml for default values"
and edit *that* file, not the original one, if they've diverged.

## 4. Force the classic OAuth flow back on

In the Dev Dashboard (`dev.shopify.com/dashboard`) → your app → **Settings**:

1. Check **"Use legacy install flow"**.
2. Set **App URL** and **Redirect URLs** to a URL you control and can read
   the query string from after redirect (e.g. `https://example.com` — it's
   a real domain that renders a harmless "Example Domain" page, so you can
   see the address bar).
3. Click **Release**.

Without this checkbox, installing the app from the Dev Dashboard app list
or from the Shopify Admin apps list just embeds it (returns `hmac`/`host`,
no `code`) — it does **not** go through the consent screen needed for the
classic token exchange.

## 5. Get an authorization code

**Do not** install by clicking the app icon in Shopify Admin — that uses
the embedded-launch URL pattern and skips the OAuth consent screen even
with "legacy install flow" on. Instead, hit the authorize endpoint
directly in the browser:

```
https://<shop>.myshopify.com/admin/oauth/authorize?client_id=<CLIENT_ID>&scope=<SCOPES>&redirect_uri=https://example.com&state=<any-random-string>
```

This shows the classic "Install app" consent screen. Approve it, and the
browser lands on `https://example.com/?code=...&state=...`. The `code` is
single-use and **expires within about a minute** — exchange it immediately.

Note: `client_id` is **not secret** — it's safe to put in a URL, share, or
commit; it's the equivalent of a public app identifier. Only the client
secret and the resulting access token are sensitive.

## 6. Exchange the code for a token

`POST https://<shop>.myshopify.com/admin/oauth/access_token` with a
**JSON** body (this is the critical gotcha — form-urlencoded body
produces a `400 Oauth error invalid_request` even with a valid code and
matching secret; Shopify's endpoint expects JSON here):

```json
{
  "client_id": "<CLIENT_ID>",
  "client_secret": "<CLIENT_SECRET>",
  "code": "<code from step 5>"
}
```

`sockacademy/scripts/setup/exchange_token.js` implements this correctly
(JSON body, `Content-Type: application/json`). Usage:

```
node exchange_token.js "<code>"
```

The client secret is on the Dev Dashboard app's **Settings → Credentials**
page (Reveal → Copy) — grab it there, never ask an AI assistant to
generate or guess it.

## 7. Which token format is correct

This app model can produce two different token formats — **both are valid
Admin API access tokens with the same header (`X-Shopify-Access-Token`),
but only one may actually work depending on install state**:

- `shpat_...` (38 chars) — from the classic OAuth exchange in step 6.
- `atkn_...` (69 chars) — from the Dev Dashboard's separate "Create
  automation token" button (API access page), explicitly labeled "For
  CI/CD workflows only".

On 05/07/2026 the `atkn_` token returned `401 Invalid API key or access
token` while the `shpat_` token from the OAuth exchange worked immediately
(`200 OK`) — most likely because the automation token was generated before
the app's install (via step 5) had actually completed on the store. **Always
verify whichever token you end up with** with a direct read call before
wiring it into `.env`/GitHub Secrets — don't assume the format implies
validity:

```js
// quick one-off connectivity check — GET shop.json with the token,
// confirm HTTP 200 and the correct shop name before trusting it.
```

## 8. Store the result

- `sockacademy/.env`: `SHOPIFY_MASTER_TOKEN=<verified working token>`
- GitHub Actions: `gh secret set SHOPIFY_MASTER_TOKEN` (run this yourself,
  interactively — paste the value only at the `? Paste your secret` prompt,
  never as a command-line argument, and never through an AI assistant's
  tool calls).

Both locations need the same value: `.env` is read only by local/manual
runs; GitHub Secrets is what the actual scheduled cron workflows use in
production. Updating one without the other leaves automation silently
running on a stale/dead token.

## Security notes

- Never paste a client secret, access token, or any code fragment derived
  from them into a chat with an AI assistant — not even truncated. Do the
  `.env` edit and `gh secret set` yourself.
- `client_id` and app names are not secrets and are safe to share/commit.
- If a token screenshot or partial value is accidentally shared, treat it
  as a signal to rotate that credential, not as catastrophic on its own —
  but avoid repeating it.
