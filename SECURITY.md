# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue
2. Email the maintainer directly at **me@zzet.org**, or use GitHub's private vulnerability reporting
3. Include a description of the vulnerability and steps to reproduce

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Scope

This repository is the web UI for [Gortex](https://github.com/zzet/gortex).
It is a Next.js app that connects to a gortex server over HTTP+SSE.
Security considerations include:

- **Client-side only**: the app runs in the user's browser. All data rendered
  comes from a gortex server the user points it at (`NEXT_PUBLIC_GORTEX_URL`).
- **Token handling**: when the server is started with `--auth-token`, the UI
  passes a bearer token from `NEXT_PUBLIC_GORTEX_TOKEN`. Tokens are never
  persisted server-side by the web app itself.
- **Server binding**: the gortex server binds to `localhost` by default. If
  you expose it on a network interface, use `--auth-token` and put it behind
  TLS — treat any non-local deployment as untrusted until configured.
- **Hosted UI**: the planned my.gortex.dev hosted UI is a client-side bundle
  that connects to the user's local daemon. It does not proxy data through
  third-party servers; report anything that suggests otherwise as a security
  issue.
- **Dependencies**: npm deps are kept current via Dependabot. Report
  supply-chain concerns the same way as vulnerabilities above.
