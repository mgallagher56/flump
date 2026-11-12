# E20 Phase 0 ledger

| Item                 | Status       | Notes                                                                        |
| -------------------- | ------------ | ---------------------------------------------------------------------------- |
| Q1                   | done  |                                                                              |
| Q2                   | done  |                                                                              |
| Q3                   | done  |                                                                              |
| Q4                   | done  |                                                                              |
| Q5                   | done  |                                                                              |
| Q8                   | done  |                                                                              |
| Q10                  | done  |                                                                              |
| Q12                  | deferred     | needs owner to decode a real token's iss claim; wrong value 401s every login |
| Q13                  | done  |                                                                              |
| Q14                  | done  |                                                                              |
| Q6,Q7,Q9,Q11,Q15,Q16 | out of scope | Tier B                                                                       |

## Review findings fixed
- MCP failed-auth limiter keyed on req.ip would share one bucket behind Railway: backend now trusts one proxy hop by default in production (TRUST_PROXY_HOPS overrides).
- Marketing production CSP blocked the inline theme script: nonce now injected.

## Not acted on / unverified
- Real WorkOS login, callback, logout redirect and refresh unverified (unit tests with mocks only).
- Production CORS_ALLOWED_ORIGINS must be set on the backend before deploy or boot fails.
- Marketing production CSP not browser smoke-tested.
- DisclosurePolicySection not registered in packages/ui architecture laws test (not required by it today).
- Pre-existing root lint errors: biome.json version mismatch (CLI 2.6.4 vs 2.6.5), single-api-client.guard.test.ts, dependency-cruiser.config.cjs.
- finance.service.ts:286 still defaults a dead /auth/callback bank redirect.
