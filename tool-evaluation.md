# Tool Evaluation Template

Use this template when considering a tool outside the approved stack. Complete all sections before proceeding with adoption.

---

## Problem Statement

**What gap are you trying to fill?**

[Describe the specific problem the approved stack cannot solve]

**Why can't the approved tool solve this?**

| Approved Tool | Limitation |
|---------------|------------|
| [tool] | [why it doesn't work] |

---

## Candidate Tool

**Name:** [Tool name]

**Purpose:** [One sentence description]

**Links:**
- Website: [url]
- GitHub: [url]
- Documentation: [url]

**Metrics:**
- License: [license name]
- GitHub Stars: [number]
- npm weekly downloads: [number]
- Last commit: [date]
- Open issues: [number]
- Contributors: [number]

---

## Required Criteria

All must be satisfied unless explicitly waived with documented rationale.

| Criterion | Requirement | Status | Evidence |
|-----------|-------------|--------|----------|
| **License** | Open source (MIT, Apache 2.0, BSD, AGPL, MPL) | ☐ Pass / ☐ Fail | [license] |
| **Maintenance** | Commit within last 6 months | ☐ Pass / ☐ Fail | [last commit date] |
| **Security** | No unpatched critical CVEs | ☐ Pass / ☐ Fail | [audit results] |
| **Scale** | Proven at 100+ companies OR documented scale | ☐ Pass / ☐ Fail | [evidence] |
| **TypeScript** | First-class support or @types available | ☐ Pass / ☐ Fail | [type quality] |
| **Documentation** | Complete API docs + getting started | ☐ Pass / ☐ Fail | [assessment] |

**Waived criteria (if any):**

| Criterion | Waiver Rationale | Approved By |
|-----------|------------------|-------------|
| [criterion] | [why waived] | [name] |

---

## Evaluation Criteria

| Criterion | Weight | Score (1-5) | Notes |
|-----------|--------|-------------|-------|
| **Integration** | High | | Works with existing stack without adapters? |
| **Simplicity** | High | | Mid-level dev can understand in 30 min? |
| **Community** | Medium | | Active issues, responsive maintainers? |
| **Longevity** | Medium | | Stable API, semantic versioning? |
| **Performance** | Medium | | Meets 10k user scale requirement? |

**Total Score:** [sum] / 25

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tool becomes unmaintained | Low/Med/High | [impact] | [how to mitigate] |
| Breaking changes in major version | Low/Med/High | [impact] | [how to mitigate] |
| Security vulnerability discovered | Low/Med/High | [impact] | [how to mitigate] |
| Integration issues with stack | Low/Med/High | [impact] | [how to mitigate] |

---

## Alternatives Considered

| Tool | Why Rejected |
|------|--------------|
| [tool 1] | [reason] |
| [tool 2] | [reason] |
| Build custom | [reason] |

---

## Proof of Concept

**POC completed:** ☐ Yes / ☐ No / ☐ Not required

**POC scope:**
[What was tested]

**POC results:**
[What was learned]

**POC code location:**
[Link to branch/PR if applicable]

---

## Recommendation

**Decision:** ☐ Adopt / ☐ Reject / ☐ Adopt with conditions

**Conditions (if applicable):**
- [condition 1]
- [condition 2]

**Add to approved stack:** ☐ Yes (all projects) / ☐ No (this project only)

**Rationale:**
[Summary of why this decision was made]

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Evaluator | | | |
| Reviewer | | | |

---

## Post-Adoption (if approved)

- [ ] Added to project DECISIONS.md
- [ ] Added to approved stack (if applicable)
- [ ] Guide created in /guides directory (if applicable)
- [ ] Team notified of new tool
