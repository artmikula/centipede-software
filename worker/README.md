# Contact endpoint

Cloudflare Worker behind `centipede.dev/api/contact`. The rest of the site is
served by GitHub Pages; this route is intercepted at the edge because the zone
is proxied through Cloudflare.

Replaces the previous EmailJS integration, which exposed its public key and
template ID in the page source and ran validation only in the browser.

## Deploy

```bash
cd worker
npx wrangler deploy
```

## Secrets

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put FORM_FROM_EMAIL   # sender, domain must be verified in Resend
npx wrangler secret put FORM_TO_EMAIL     # where inquiries land
```

Rejections from Resend are logged with their reason, so `npx wrangler tail` shows
why a send failed.
