# Security Policy

## Supported Versions

| Version | Supported              |
| ------- | ---------------------- |
| 0.6.x   | ✅ Current             |
| < 0.6   | ❌ No longer supported |

## Reporting a Vulnerability

If you discover a security vulnerability in CloudBlocks, please report it responsibly.

### How to Report

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. Use GitHub Security Advisories (private):
   - **[Report a vulnerability](https://github.com/yeongseon/cloudblocks/security/advisories/new)**
   - Keep details out of public issues and discussions.
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix or mitigation**: Dependent on severity

### Scope

The following areas are in scope:

- Authentication and session management (`cb_session`, `cb_oauth` cookies)
- GitHub OAuth flow security
- API endpoint authorization
- Cross-site scripting (XSS) in the visual builder
- Cross-site request forgery (CSRF) protections
- Dependency vulnerabilities

### Security Architecture

For details on CloudBlocks' security boundaries and threat model, see:

- [Security Boundaries](docs/design/SECURITY_BOUNDARIES.md) — Authentication, authorization, and data protection design

## Disclosure Policy

We follow [coordinated vulnerability disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). We will credit reporters in release notes unless anonymity is requested.
