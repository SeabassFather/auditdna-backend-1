```text
RECOVERY.md

This file records the incident and recovery steps for the Vite-style module tag accidentally added to public/index.html in a CRA project.

Summary:
- Symptom: Browser console error "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of 'text/html'".
- Root cause: public/index.html had a Vite-style tag: <script type="module" src="/src/main.jsx"></script>. CRA does not serve /src files as modules; the dev server returned index.html for that path, causing the MIME error.
- Recovery: Removed the module tag from public/index.html, restarted CRA dev server, verified "Compiled successfully", confirmed /static/js/*.js assets served as application/javascript.
- Prevention: Installed a git pre-commit hook (hooks/pre-commit or hooks/pre-commit.ps1) to block commits that introduce the offending tag; added scripts/inspect_and_protect.ps1 to detect any occurrences.

How to review later:
- Run: powershell -ExecutionPolicy Bypass -File .\scripts\inspect_and_protect.ps1
- To fix automatically: powershell -ExecutionPolicy Bypass -File .\scripts\inspect_and_protect.ps1 -Fix
- To fix and commit: powershell -ExecutionPolicy Bypass -File .\scripts\inspect_and_protect.ps1 -Fix -Commit

If this file is missing or corrupted, recreate it from your recovery notes.
