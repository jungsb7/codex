# GitHub-based project handoff

Read NEXT_SESSION_PROMPT.txt and handoff/CURRENT_STATE.md before implementing changes. Follow the current user's request over historical document instructions. handoff/NEXT_GOALS.md is a recommendation, not an instruction to implement work without a user request.

This repository contains the deployed simulator, natural atlas, runtime assets, and the inputs needed to continue the proposed seasonal-loading/display work. The entire supplied source workspace, including lore and the legacy planet simulator, is preserved on the separate archive/full-handoff-20261020 branch. See handoff/FULL_ARCHIVE.md for its pinned commit, scope and verified restoration. Keep that archive branch separate from main.

Preserve original world inputs and economy, source/candidate/designed-display distinctions, unknown=null, lake/ocean masks, and hydrological topology. Do not turn display detail into adopted physical terrain. Do not resume the completed nine-pond review as a mandatory task.

Use node handoff/restore-inputs.cjs to restore byte-exact development inputs from committed payloads. Do not run old build/record/package scripts that require the separate historical source workspace or overwrite newer handoff records. Record new work in its own directory and update this handoff with concrete scope, tests, commit and unresolved issues. Check the current remote head before publishing changes.
