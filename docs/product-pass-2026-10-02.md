# Estate 2.0.1 — Product pass

## Baseline and scope

Started from production/main `781f2410fd85c8eda184b8cc4a17cb501899cded`, after PR #4 was merged. Preserves engine `estate_financial_v2.0.0`, GVA geometry, renovation, XIRR, strategy snapshots, operational pipeline, saved searches, comparable evidence and provider budgets. No schema or provider subscription changes.

## Product behavior

- Private Radar, Market, Pipeline, Portfolio and property workspaces are mounted only with a resolved user. Signed-out access has its own screen. Initial loading and failed data loads do not masquerade as empty datasets. Provider budget queries also check user explicitly.
- Errors are mapped to human messages at UI boundaries. Responses arriving after logout cannot restore another session's property data.
- Inicio: compact action/index composition and investment cycle; populated attention, top opportunities, evidence debt, capital deviations and recorded price history.
- Radar: command bar, collapsible filters, saved-search and source popovers, photo/price/rent/evidence cards, real-coordinate map/list, comparison up to four assets. Commercial/residential filter applies to saved assets as well as research.
- Mercado: recent unique sample, percentile strip, amount/€/m² histogram, quality rail and dense comparable ledger. No implied distance when coordinates are absent.
- Flujo: edge-mounted time filters and A/B selector, actual GVA segment colors, source/year tooltips, readable dark basemap, no central overlay. Messages dismiss after six seconds. Annual vehicle counts are not pedestrian footfall.
- Pipeline: scroll/snap stage navigator, stage filtering, readable counts and operational cards; compact empty state.
- Cartera: measured KPIs, debt/equity composition, actual cash-flow series, geographic allocation, asset map, forecast comparison and per-asset HOLD/REFINANCE/SELL disclosure. Missing inputs remain missing.
- Removed 80 retired CSS rules/duplicates, introduced semantic product styles, corrected orange CTA contrast, small score labels and analyzer accessibility labels.

## Verification design

`tests/e2e/fixtures.mjs` intercepts Supabase requests in an isolated browser context. Fixtures are not imported by application code and are never inserted in a database. These tests establish UI behavior, not live authenticated persistence or live RLS. Earlier backend checks remain separate evidence.

Browser matrix covers six required dimensions (1440×900, 1512×982, 1728×1117, 1280×800, 768×1024, 390×844), signed-out, authenticated-empty, populated, retryable errors and loading. Eight views include analyzer and populated property workspace; a property workspace without an asset is not a valid empty/signed-out route. Captures live in `docs/qa/product-pass/`; CI preserves the current run as an artifact. Axe checks WCAG A/AA critical/serious findings on module screens plus analyzer/property. Browser runtime errors and page-level horizontal overflow fail the tests. Scrollable data tables and stage strips deliberately scroll within their containers.

## Release checks

The production health response now exposes the public Git commit SHA to establish alias-to-commit identity. Release requires tests/lint/typecheck/build, browser suite, green CI, merge to main, Vercel Production READY, alias health and runtime log inspection. The delivery response records live results and commit identity.

## Limits

Live authenticated E2E still requires a user session; isolated browser fixtures do not establish it. No production test records were seeded. Paid/contract providers remain at their actual configuration states. GVA road flow is annual; unknown directions are not invented. Maps omit assets lacking coordinates and disclose coverage. Strategy outputs remain explicit assumptions, not approved financing.

## Local result

2026-10-02: 32 unit tests and 22 browser cases pass. Lint, TypeScript and Node 24 production build pass. Final screenshots were captured with CSS animations completed; no horizontal page overflow or browser runtime errors in the tested matrix. No critical/serious Axe findings in the checked screens.
