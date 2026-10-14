# Yocare static landing page

This is a standalone static version of the Yocare landing page, prepared from the visual direction and content in the Higgsfield export. It intentionally does not depend on Higgsfield-only packages.

## Files
- `index.html` — page content
- `styles.css` — responsive design and motion
- `script.js` — small year label script
- `assets/yocare-mark.svg` — favicon and brand mark

## Test locally
Open `index.html` in a browser.

## Publish on Cloudflare Pages
1. Create a GitHub repository named `yocare-website`.
2. Upload the contents of this folder (not the outer ZIP folder).
3. In Cloudflare, open Workers & Pages → Create → Pages → Connect to Git.
4. Select the repository. For a plain HTML site, no build command is required; use `.` as the build output directory if the dashboard requires one. Alternatively use Direct Upload and upload the site files.
5. Test the `pages.dev` address before connecting your domain.

## Custom domain and email safety
Cloudflare Pages supports custom domains. For the apex domain `yocare.online`, Cloudflare generally needs to manage the DNS zone, so before changing nameservers at Hostinger, copy every existing DNS record and recreate/verify them in Cloudflare. Preserve MX, SPF, DKIM, DMARC and verification records. Add the domain in the Pages project and follow the exact DNS steps shown by Cloudflare.

## Early access contact
The CTA currently opens an email draft to `hello@yocare.online`. Confirm that mailbox exists and can receive mail before publishing. If it does not, replace the `mailto:` links in `index.html` with your preferred working contact or a Google Form URL.

## Product accuracy
The page describes Yocare as an early-stage project and avoids claiming clinical validation, user numbers, or a working AI backend.
