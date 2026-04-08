# Repository Instructions

## Context7

Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage.

Prefer Context7 over web search for library docs.

Do not use Context7 for:
- refactoring
- writing scripts from scratch
- debugging business logic
- code review
- general programming concepts

## Context7 Workflow

1. Start with `resolve-library-id` using the library name and the user's question, unless the user provides an exact library ID in `/org/project` format.
2. Pick the best match by exact name match, description relevance, code snippet count, source reputation, and benchmark score.
3. If the first results do not look right, try alternate names or rephrase the query.
4. Use version-specific IDs when the user mentions a version.
5. Run `query-docs` with the selected library ID and the user's full question.
6. Answer using the fetched docs.
