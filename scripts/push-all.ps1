# ================================
# AuditDNA Global Grower Data Pipeline & Git Push Automation
# ================================

# --------- SETUP ---------
$repoPath = "C:\path\to\your\global-grower-search-engine\backend"
$gitUser = "SeabassFather"
$gitEmail = "your@email.com"
$branch = "main"
$commitMsg = "Automated: ETL update & push for AuditDNA global produce import data"
$envFile = ".env"

# Optional: Set your GitHub PAT as an environment variable for security
$env:GITHUB_TOKEN = "<YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>"

# --------- ENVIRONMENT ---------
cd $repoPath
git config --global user.name $gitUser
git config --global user.email $gitEmail

# --------- RUN ETL/DATA PIPELINE SCRIPTS ---------
Write-Host "Running ETL scripts..."

node src/scripts/fetchAphisGrowers.js
node src/scripts/fetchAmsMarketNews.js
node src/scripts/fetchFasImports.js
node src/scripts/fetchFdaRefusals.js
# Add any additional ETL scripts below as needed:
# node src/scripts/fetchCbpEntryPoints.js
# node src/scripts/normalizeCommodities.js

Write-Host "ETL scripts complete."

# --------- GIT ADD/COMMIT/PUSH ---------
git add .
git commit -m $commitMsg

# Use PAT for authentication (recommended, secure)
$remoteUrl = "https://$gitUser:$env:GITHUB_TOKEN@github.com/SeabassFather/global-grower-search-engine.git"
git remote set-url origin $remoteUrl

git push origin $branch

Write-Host "All changes pushed to $branch on GitHub!"

# --------- CLEANUP ---------
# (Optional) Remove PAT from environment after use
Remove-Item Env:\GITHUB_TOKEN

Write-Host "Pipeline complete."