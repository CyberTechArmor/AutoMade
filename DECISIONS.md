# Technical Decisions

This document tracks deviations from the [Fractionate Development Standard](https://github.com/fractionate/dev-standard).

## Format

For each deviation:

```
### [Decision Title]
**Date:** YYYY-MM-DD
**Standard:** [Which standard section this deviates from]
**Deviation:** [What we're doing differently]
**Rationale:** [Why this deviation is necessary]
**Risk:** [Any risks introduced]
```

---

## Decisions

### Express over Fastify
**Date:** 2024-12-29
**Standard:** 03-STACK.md recommends Fastify as the primary backend framework
**Deviation:** Using Express instead of Fastify
**Rationale:** Express has broader ecosystem support and simpler async error handling patterns. The performance difference is negligible for our expected load.
**Risk:** Slightly lower baseline performance. Mitigated by proper middleware optimization.

---

*Additional deviations will be documented here as they arise.*
