# Tool Guides

This directory contains detailed implementation guides for each tool in the approved stack. These guides are separate from the core Development Standard to allow:

- Deep technical detail without bloating the standard
- Frequent updates as we learn from real projects
- Tool substitution without changing core documents

---

## Available Guides

| Guide | Tool | Status |
|-------|------|--------|
| [drizzle.md](drizzle.md) | Drizzle ORM | ✅ Complete |
| postgres.md | PostgreSQL | 🚧 Planned |
| express.md | Express.js | 🚧 Planned |
| socketio.md | Socket.io | 🚧 Planned |
| docker.md | Docker & Compose | 🚧 Planned |
| github-actions.md | CI/CD Pipelines | 🚧 Planned |
| openapi.md | API Specification | 🚧 Planned |
| vitest.md | Testing | 🚧 Planned |

---

## Guide Structure

Each guide follows this structure:

```markdown
# [Tool Name] Guide

## Overview
Brief description and why this tool is in the stack.

## Installation & Setup
How to add to a project, configuration files needed.

## Common Patterns
Code examples for typical use cases.

## Best Practices
What to do (and what to avoid).

## Troubleshooting
Common issues and solutions.

## Integration
How this tool works with other stack components.

## Resources
Official docs, tutorials, community resources.
```

---

## Contributing Guides

When you solve a problem or learn something useful:

1. Check if a guide exists for that tool
2. If yes: Add to the relevant section
3. If no: Create a new guide following the structure above

Keep guides practical—code examples over theory.
