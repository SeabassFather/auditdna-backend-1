<#
PowerShell: transfer_supreme_frontend.ps1
Safe transfer of "supreme" frontend files into repo/frontend with backups, snapshot branch, and PR push.

Usage:
- Open Windows Terminal or PowerShell first (do NOT double-click the file).
- Run: .\transfer_supreme_frontend.ps1
- When prompted, paste the full path to the folder containing your supreme frontend files.
- Confirm the actions when asked.

This script is intentionally interactive and conservative. It does NOT overwrite backups, and it commits only if there are real changes.
#>

# Start transcript so window closures still keep a record
$transcriptPath = Join-Path -Path (Get-Location) -ChildPath "transfer_transcript_$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
try {
    Start-Transcript -Path $transcriptPath -Force
} catch {
    Write-Host "Warning: Start-Transcript failed: $($_.Exception.Message)"
}

# Prompt for Source folder (where your "supreme" frontend files live)
$defaultSuggested = ''
Write-Host ""
Write-Host "STEP 1 — Enter the FULL path to the folder that contains the SUPREME frontend files."
Write-Host "Example: C:\Users\You\Desktop\supreme_frontend"
$SourceFolder = Read-Host "Source folder (paste full path here)"

if (-not $SourceFolder -or -not (Test-Path $SourceFolder)) {
    Write-Host ""
    Write-Host "ERROR: Source folder is missing or invalid. Aborting."
    Stop-Transcript 2>$null
    exit 1
}

# Find repo root (ensure we are inside a git repo)
try {
    $repoRoot = (git rev-parse --show-toplevel).Trim()
} catch {
    Write-Host ""
    Write-Host "ERROR: This script must be run from inside a git repository. Aborting."
    Stop-Transcript 2>$null
    exit 1
}
Write-Host ""
Write-Host "REPO_ROOT: $repoRoot"

# Destination frontend folder inside repo
$dest = Join-Path $repoRoot "frontend"

# Timestamp and branch names
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$preSnapshotBranch = "pre-transfer-snapshot-$timestamp"
$transferBranch = "transfer-supreme-$timestamp"
$backupRoot = Join-Path $repoRoot "transfer_backups"
$backup = Join-Path $backupRoot "backup_$timestamp"

Write-Host ""
Write-Host "SUMMARY OF ACTIONS (preview):"
Write-Host "  Source: $SourceFolder"
Write-Host "  Destination (repo frontend): $dest"
Write-Host "  Backup location: $backup"
Write-Host "  Snapshot branch (safe rollback): $preSnapshotBranch"
Write-Host "  Transfer branch to be created: $transferBranch"
Write-Host ""

$ok = Read-Host "Type YES to proceed with the above actions (or anything else to cancel)"
if ($ok -ne "YES") {
    Write-Host "Cancelled by user. No changes made."
    Stop-Transcript 2>$null
    exit 0
}

# Create backup dir and copy existing frontend to backup (if dest exists)
if (Test-Path $dest) {
    New-Item -ItemType Directory -Path $backup -Force | Out-Null
    Write-Host "Backing up existing frontend -> $backup (this may take a moment)..."
    # Use robocopy for robust Windows copying; exclude node_modules and .git
    $robocopyArgs = @($dest, $backup, "/E", "/COPYALL", "/R:2", "/W:1", "/XD", ".git", "node_modules", "transfer_backups", "/NFL", "/NDL")
    $rc = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -NoNewWindow -Wait -PassThru
    if ($rc.ExitCode -le 7) {
        Write-Host "BACKUP_DONE: $backup (robocopy exit code $($rc.ExitCode))"
    } else {
        Write-Host "WARNING: robocopy returned code $($rc.ExitCode). Check $backup for completeness."
    }
} else {
    Write-Host "Destination frontend did not exist. Creating folder: $dest"
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    Write-Host "DEST_CREATED"
}

# Create a safe snapshot branch (local only) for rollback
Write-Host "Creating snapshot branch: $preSnapshotBranch"
git branch $preSnapshotBranch 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "SNAPSHOT_BRANCH_CREATED: $preSnapshotBranch" } else { Write-Host "SNAPSHOT_BRANCH_MAY_EXIST_OR_FAILED" }

# Create and switch to transfer branch
Write-Host "Creating and switching to transfer branch: $transferBranch"
git checkout -b $transferBranch
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: failed to create or checkout branch $transferBranch. Aborting."
    Stop-Transcript 2>$null
    exit 1
}
Write-Host "ON_BRANCH: $(git rev-parse --abbrev-ref HEAD)."

# Copy files from source to destination
Write-Host "Copying files from source -> dest (excluding .git and node_modules). This may take a while..."
$robocopyArgs2 = @($SourceFolder, $dest, "/E", "/COPY:DAT", "/R:2", "/W:1", "/XD", ".git", "node_modules", "transfer_backups", "/NFL", "/NDL")
$rc2 = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs2 -NoNewWindow -Wait -PassThru
Write-Host "robocopy finished with exit code $($rc2.ExitCode)."

# Show git status of changes (un-staged)
Write-Host ""
Write-Host "Files changed (un-staged) preview (first 200 entries):"
git status --porcelain | Select-Object -First 200 | ForEach-Object { Write-Host $_ }

# Stage and commit only if there are changes
Write-Host ""
Write-Host "Staging all changes..."
git add -A
# Attempt commit
$commitMsg = "chore(transfer): copy supreme frontend files into frontend (backup: $backup)"
$commitOut = & git commit -m $commitMsg 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "COMMIT_OK"
    Write-Host $commitOut
} else {
    Write-Host "NO_COMMIT_MADE_OR_COMMIT_FAILED"
    Write-Host $commitOut
}

# Push branch to origin
Write-Host ""
Write-Host "Pushing transfer branch to origin..."
$pushOut = & git push -u origin $transferBranch 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "PUSH_OK"
    Write-Host $pushOut
} else {
    Write-Host "PUSH_FAILED"
    Write-Host $pushOut
    Write-Host "If authentication or credential helper issues occur, open GitHub Desktop or a terminal with credentials set and run:"
    Write-Host "  git push -u origin $transferBranch"
}

# Open PR page on GitHub for review (uses your GitHub username + repo)
$owner = "SeabassFather"
$repo = "audit-frontend"
$prUrl = "https://github.com/$owner/$repo/pull/new/$transferBranch"
Write-Host ""
Write-Host "PR_URL: $prUrl"
try { Start-Process $prUrl } catch { Write-Host "Open this URL in your browser to create a PR: $prUrl" }

Write-Host ""
Write-Host "SUMMARY:"
Write-Host "  Transcript file: $transcriptPath"
Write-Host "  Backup folder: $backup"
Write-Host "  Snapshot branch: $preSnapshotBranch"
Write-Host "  Transfer branch: $transferBranch"
Write-Host ""
Write-Host "If you want to revert the transfer and restore the backed up frontend into the repo, reply here with: Restore from backup — yes"
Write-Host "If you want me to now create the PR title/body or to help resolve conflicts after the PR, paste the git push output above or say: 'PR pushed'."

# End transcript
Stop-Transcript 2>$null