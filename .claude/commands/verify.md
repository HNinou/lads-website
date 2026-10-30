Run the full verification loop for the chalet website and fix what fails.

1. Run `npm run build`. Fix any build error.
2. Run `npm run verify`. Fix every FAIL line in the site code or content (never by weakening `scripts/`). Re-run until `RESULT: PASS`.
3. Run `npm run check:visual`. Fix every FAIL. Re-run until `RESULT: PASS`.
4. Open every PNG in `.verify/screenshots/` with the Read tool. Review them against CLAUDE.md section 5 (Design): hierarchy, spacing, image crops, legibility, mobile layout. Fix what a demanding art director would reject, then repeat from step 1.
5. Run `npm run todo` and update `docs/BUILD-REPORT.md`: what changed, decisions, remaining warnings, owner to-do list.
6. Report back in 5 lines max: pass/fail per check, what you fixed, what the owner must do.
