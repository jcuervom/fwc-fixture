# Security Policy

## Supported Versions

Only the latest `main` branch is supported for security fixes.

## Reporting a Vulnerability

Do not open public issues for security vulnerabilities.

Report suspected vulnerabilities privately to:

- jose.cuervo@noirfeather.com

Please include a clear description, reproduction steps, affected files or URLs,
and any relevant logs or screenshots. I will acknowledge valid reports as soon as
possible and coordinate a fix before public disclosure.

## Repository Hardening

This repository is intended to run with:

- Required CI before deploy.
- CodeQL analysis.
- npm audit at low severity or higher.
- Dependabot updates for npm and GitHub Actions.
- Code owner review for protected branches.
- No force pushes or branch deletions on `main`.
