# LOAF backend route extension - adds /api/loaf/auction and /api/loaf/reverse
# Run from C:\AuditDNA\backend

$ErrorActionPreference = 'Stop'
$path = "C:\AuditDNA\backend\routes\loaf-routes.js"
$src = Get-Content $path -Raw

if ($src.Contains("router.post('/auction'")) {
  Write-Host "Auction route already present - skipping injection" -ForegroundColor Yellow
} else {
  # Find the /factor route block end - inject after it
  $anchor = "router.post('/factor'"
  $idx = $src.IndexOf($anchor)
  if ($idx -lt 0) { throw "Could not find /factor route in loaf-routes.js" }

  # Find the end of that route handler - look for the closing }); pattern after our anchor
  # We'll search forward from anchor for the matching }); at the start of a line
  $rest = $src.Substring($idx)
  $endRel = $rest.IndexOf("`n});")
  if ($endRel -lt 0) { throw "Could not find end of /factor handler" }
  $insertAt = $idx + $endRel + 4   # position right after the }); + newline

  $auctionRoute = @"


// ============== AUCTION (BID) - grower posts a lot, buyers bid up ==============
router.post('/auction', async (req, res) => {
  try {
    const { commodity, quantity, unit, reservePrice, durationHours, notes, grade } = req.body || {};
    if (!commodity || !quantity) return res.status(400).json({ ok:false, error:'commodity and quantity required' });
    const startsAt = new Date();
    const endsAt = new Date(Date.now() + (parseInt(durationHours||24,10) * 3600 * 1000));
    let saved = null;
    try {
      saved = await dataEngine.saveSubmission({
        kind: 'auction',
        payload: { commodity, quantity, unit, reservePrice, durationHours, notes, grade, startsAt, endsAt }
      });
    } catch (e) { console.warn('[loaf-routes] auction save warn:', e.message); }

    // Fan-out to brain events so AuditDNA Mission Control sees it
    try {
      const { getPool } = require('../db');
      const pool = getPool();
      await pool.query(
        "INSERT INTO rfq_brain_events(event_type, payload, created_at) VALUES (`$1, `$2, NOW())",
        ['loaf.auction.opened', JSON.stringify({ commodity, quantity, reservePrice, endsAt })]
      );
    } catch (e) { console.warn('[loaf-routes] auction event warn:', e.message); }

    res.json({ ok:true, success:true, kind:'auction', startsAt, endsAt, saved });
  } catch (e) {
    console.error('[loaf-routes] /auction error:', e.message);
    res.status(500).json({ ok:false, error: e.message });
  }
});

// ============== REVERSE BUY - buyer posts a need, growers bid down ==============
router.post('/reverse', async (req, res) => {
  try {
    const { commodity, quantity, unit, targetPrice, needByDate, destination, gradeRequired, notes } = req.body || {};
    if (!commodity || !quantity) return res.status(400).json({ ok:false, error:'commodity and quantity required' });
    let saved = null;
    try {
      saved = await dataEngine.saveSubmission({
        kind: 'reverse',
        payload: { commodity, quantity, unit, targetPrice, needByDate, destination, gradeRequired, notes }
      });
    } catch (e) { console.warn('[loaf-routes] reverse save warn:', e.message); }

    try {
      const { getPool } = require('../db');
      const pool = getPool();
      await pool.query(
        "INSERT INTO rfq_brain_events(event_type, payload, created_at) VALUES (`$1, `$2, NOW())",
        ['loaf.reverse.posted', JSON.stringify({ commodity, quantity, targetPrice, needByDate, destination })]
      );
    } catch (e) { console.warn('[loaf-routes] reverse event warn:', e.message); }

    res.json({ ok:true, success:true, kind:'reverse', saved });
  } catch (e) {
    console.error('[loaf-routes] /reverse error:', e.message);
    res.status(500).json({ ok:false, error: e.message });
  }
});

"@

  $newSrc = $src.Substring(0, $insertAt) + $auctionRoute + $src.Substring($insertAt)
  Set-Content -Path $path -Value $newSrc -NoNewline -Encoding UTF8
  Write-Host "Injected /auction + /reverse handlers" -ForegroundColor Green
}

# Validate JS syntax via node
$nodeCheck = & node --check $path 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "JS syntax OK" -ForegroundColor Green
} else {
  Write-Host "JS syntax FAIL: $nodeCheck" -ForegroundColor Red
  exit 1
}

# Mount /api/loaf in server.js if not already
$serverPath = "C:\AuditDNA\backend\server.js"
$server = Get-Content $serverPath -Raw
if ($server.Contains("loaf-routes")) {
  Write-Host "server.js already mounts loaf-routes" -ForegroundColor Yellow
} else {
  $marker = "// BRAIN-WIRE-MARKER"
  $idx = $server.IndexOf($marker)
  if ($idx -lt 0) { $idx = $server.IndexOf("/api/brain") }
  $eol = $server.IndexOf("`n", $idx)
  $ins = "`n// LOAF-WIRE-MARKER`napp.use('/api/loaf', require('./routes/loaf-routes'));`n"
  $server = $server.Substring(0,$eol+1) + $ins + $server.Substring($eol+1)
  Set-Content $serverPath -Value $server -NoNewline
  Write-Host "Wired /api/loaf into server.js" -ForegroundColor Green
}

# Commit + push
cd C:\AuditDNA\backend
git add routes\loaf-routes.js server.js
git commit -m "LOAF: add /auction + /reverse + mount /api/loaf - BLOAFR mobile flow"
git push origin main
Write-Host "`nBackend pushed" -ForegroundColor Green
