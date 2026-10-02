<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# Estate project release rules

These rules are mandatory for every Codex task in this repository.

## Production completion is part of "done"

Do not stop at a Preview deployment or an open pull request.

Unless the user explicitly asks for preview-only work, the final workflow must be:

1. Finish the requested implementation.
2. Run the full quality gate:
   - npm run test
   - npm run lint
   - npm run typecheck
   - next build
3. Confirm GitHub CI is green.
4. Make the PR ready for review if it is still draft.
5. Merge the PR into `main`.
6. Wait for the Vercel deployment from `main` with target `production`.
7. Confirm that deployment reaches `READY`.
8. Verify the production alias, not only the generated Preview URL.
9. Check `/api/health` and any endpoints materially changed by the task.
10. Report the production URL and deployed commit SHA.

A response saying "production is still not updated" is not completion. If automatic production deployment fails, investigate and fix the failure when possible. If an external permission, paid credential, irreversible action, or provider contract is the only blocker, state that blocker precisely.

## UX/UI quality gate

Estate is a working investment operating system, not a concept dashboard.

Before finishing any visual task:
- inspect all affected screens at realistic desktop sizes;
- avoid giant empty canvases and decorative dead space;
- do not expose raw database/provider errors to end users;
- keep required text readable;
- use progressive disclosure instead of permanent explanatory paragraphs;
- prioritize the next decision/action;
- preserve visual hierarchy across Inicio, Radar, Mercado, Flujo, Pipeline and Cartera;
- do not make every module share the same card structure;
- verify empty, loading, authenticated, unauthenticated, error and populated states.

Screenshots that merely look clean are not enough: the flow must be operational.
