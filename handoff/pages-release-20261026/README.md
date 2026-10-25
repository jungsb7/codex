# Verified model54 Pages release — 2026-10-26

The user explicitly requested deployment and enabled GitHub Actions as the Pages source. This workflow publishes the previously verified model54 package from archive commit `9d272f862167a269dd721a5320e4d4eb5773346f`. It does not use the old phase50 files on main as its site source. Existing main files and the archive branch remain intact.

`packaging/` preserves all float64 bits and PNG scanline bytes. The build checks every tracked source blob, 32 AI queries, 36 decoded periods, water budgets and 571 manifest descriptors before upload. `baseline.json` pins the exact package fingerprint already checked locally. `stage.cjs` adds a separate research report and two navigation links to a fresh site directory, validates all static links, and enforces a file-content total below 1,000,000,000 bytes. Existing browser validation covered 57 checks and 19 downloads; CI additionally repeats the data and query checks.

The v3a research candidate is **not adopted as the production model**. Of the original 32 time-sensitive nodes, 31 are now within 1 m; with six newly detected nodes, seven exceed 1 m. The bounded 417-curve spatial comparison leaves one node above 1 m. The same-step formulation change reaches 26.284691 m across 845 nodes above 1 m. `actual=null` and `fullNumericalConvergence=false` are preserved. Failed implicit-ice experiments are not included.

The three report JSON files preserve the validated numerical results while omitting local filesystem paths. Large native caches remain on the user's PC. The source code, input values, original model results, adopted world definitions and economy are not recalculated by deployment.

The pipeline runs on main pushes affecting this release or by manual dispatch. Deploy requires the build job to succeed, uses the `github-pages` environment, and has only `pages:write` and `id-token:write` permissions. GitHub action revisions and Node 24.19.0 are pinned. To roll back, use the previously successful Pages deployment or change the pinned archive/package deliberately in a new commit; do not force-reset unrelated main changes.
