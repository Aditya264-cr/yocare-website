# Security Policy

## Supported versions

Security fixes are made against the latest version on the default branch. Older public snapshots may not receive fixes.

## Reporting a vulnerability

Please do not publish exploit details, credentials, tokens, personal data, or proof-of-concept attacks in public issues or discussions.

Use GitHub's **Report a vulnerability** / private vulnerability reporting feature for this repository when it is available. Include:
- A concise description and affected component or route.
- The impact and realistic attack conditions.
- Reproduction steps that do not access other people's data or disrupt services.
- Any suggested mitigation.

If private vulnerability reporting is unavailable, contact the repository maintainer privately through their verified GitHub profile and request a secure channel before sending sensitive details.

## Secret exposure

If a credential, token, signing key, or private URL is exposed, treat it as compromised:
1. Revoke or rotate it with the issuing provider immediately.
2. Review provider audit logs and usage.
3. Replace it with a server-side secret or a narrowly scoped credential.
4. Remove the exposed value from the current source and, where appropriate, coordinate a history rewrite. Rewriting Git history does not make an already exposed secret safe; rotation is still required.

Do not commit production credentials, `.env` files, Cloudflare secrets, registry admin tokens, broadcaster credentials, or private rights documents.

## Scope

This policy covers security issues in Yocare-maintained application code and deployment configuration. Third-party services, APIs, libraries, media sources, and infrastructure providers have their own security reporting processes.
