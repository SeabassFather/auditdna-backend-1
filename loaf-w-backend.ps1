# Adds GET /api/loaf/auctions/open and POST /api/loaf/auctions/:id/bid to loaf-routes.js
# Run from C:\AuditDNA\backend

$ErrorActionPreference = 'Stop'
$path = "C:\AuditDNA\backend\routes\loaf-routes.js"
$src = Get-Content $path -Raw

if ($src.Contains("router.get('/auctions/open'")) {
  Write-Host "Auction list/bid routes already present - skipping" -ForegroundColor Yellow
} else {
  # Anchor: end of /reverse handler. Inject after it.
  $anchor = "router.post('/reverse'"
  $idx = $src.IndexOf($anchor)
  if ($idx -lt 0) { throw "Could not find /reverse route in loaf-routes.js (run W backend after the BLOAFR backend)" }
  $rest = $src.Substring($idx)
  $endRel = $rest.IndexOf("`n});")
  if ($endRel -lt 0) { throw "Could not find end of /reverse handler" }
  $insertAt = $idx + $endRel + 4

  $newRoutes = @"


// ============== GET OPEN AUCTIONS - feeds W panel auction list ==============
router.get('/auctions/open', async (req, res) => {
  try {
    const { getPool } = require('../db');
    const pool = getPool();

    // Pull auctions from rfq_needs that are status='auction'
    // Plus any LOAF-originated auctions stored via dataEngine (loaf_submissions table)
    let auctions = [];

    try {
      const r = await pool.query(``
        SELECT id, rfq_code, commodity_category AS commodity, quantity, quantity_unit AS unit,
               target_price AS reserve_price, auction_starts_at, auction_ends_at,
               estimated_gmv, destination_state, destination_country
        FROM rfq_needs
        WHERE status='auction' AND auction_ends_at > NOW()
        ORDER BY auction_ends_at ASC
        LIMIT 50
      ``);
      auctions = r.rows.map(row => ({
        id: row.id,
        commodity: row.commodity,
        quantity: parseFloat(row.quantity),
        unit: row.unit,
        reservePrice: parseFloat(row.reserve_price || 0),
        endsAt: row.auction_ends_at,
        startsAt: row.auction_starts_at,
        origin: [row.destination_state, row.destination_country].filter(Boolean).join(', ')
      }));
    } catch (e) { console.warn('[loaf-routes] auctions/open rfq_needs warn:', e.message); }

    // Also pull LOAF /auction submissions (table created by data engine)
    try {
      const lr = await pool.query(``
        SELECT id, payload, created_at
        FROM loaf_submissions
        WHERE kind='auction' AND (payload->>'endsAt')::timestamptz > NOW()
        ORDER BY (payload->>'endsAt')::timestamptz ASC
        LIMIT 50
      ``);
      for (const row of lr.rows) {
        const p = row.payload || {};
        auctions.push({
          id: 'loaf-' + row.id,
          commodity: p.commodity,
          quantity: parseFloat(p.quantity || 0),
          unit: p.unit,
          reservePrice: parseFloat(p.reservePrice || 0),
          currentBid: parseFloat(p.currentBid || p.reservePrice || 0),
          endsAt: p.endsAt,
          startsAt: p.startsAt,
          origin: 'LOAF'
        });
      }
    } catch (e) { console.warn('[loaf-routes] auctions/open loaf_submissions warn:', e.message); }

    // Compute current high bid per auction by checking loaf_bids table
    try {
      const ids = auctions.map(a => String(a.id).replace('loaf-','')).filter(Boolean);
      if (ids.length) {
        const br = await pool.query(``
          SELECT auction_id, MAX(bid_amount)::NUMERIC(14,2) AS current_high
          FROM loaf_bids
          WHERE auction_id = ANY($1::text[])
          GROUP BY auction_id
        ``, [ids]);
        const bidMap = {};
        for (const row of br.rows) { bidMap[row.auction_id] = parseFloat(row.current_high); }
        for (const a of auctions) {
          const k = String(a.id).replace('loaf-','');
          if (bidMap[k] !== undefined) a.currentBid = bidMap[k];
        }
      }
    } catch (e) { console.warn('[loaf-routes] auctions/open bids warn:', e.message); }

    res.json({ ok: true, auctions });
  } catch (e) {
    console.error('[loaf-routes] /auctions/open error:', e.message);
    res.status(500).json({ ok:false, error: e.message });
  }
});

// ============== POST BID on a specific auction ==============
router.post('/auctions/:id/bid', async (req, res) => {
  try {
    const { id } = req.params;
    const { bidder, bidderPhone, bidAmount, gps } = req.body || {};
    if (!bidAmount || isNaN(parseFloat(bidAmount))) {
      return res.status(400).json({ ok:false, error:'bidAmount required' });
    }
    const amt = parseFloat(bidAmount);
    const auctionId = String(id).replace('loaf-','');

    const { getPool } = require('../db');
    const pool = getPool();

    // Ensure loaf_bids table exists (idempotent)
    try {
      await pool.query(``
        CREATE TABLE IF NOT EXISTS loaf_bids (
          id BIGSERIAL PRIMARY KEY,
          auction_id TEXT NOT NULL,
          bidder TEXT,
          bidder_phone TEXT,
          bid_amount NUMERIC NOT NULL,
          gps JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_loaf_bids_auction ON loaf_bids(auction_id, bid_amount DESC);
      ``);
    } catch (e) { console.warn('[loaf-routes] loaf_bids ensure warn:', e.message); }

    // Validate beats current high
    try {
      const cr = await pool.query(``SELECT MAX(bid_amount)::NUMERIC(14,2) AS cur FROM loaf_bids WHERE auction_id=$1``, [auctionId]);
      const cur = parseFloat((cr.rows[0] && cr.rows[0].cur) || 0);
      if (amt <= cur) {
        return res.status(400).json({ ok:false, error: ``Bid must beat current high `$`${cur.toFixed(2)}`` });
      }
    } catch (e) { console.warn('[loaf-routes] high check warn:', e.message); }

    await pool.query(
      ``INSERT INTO loaf_bids(auction_id, bidder, bidder_phone, bid_amount, gps) VALUES ($1, $2, $3, $4, $5)``,
      [auctionId, bidder || null, bidderPhone || null, amt, gps ? JSON.stringify(gps) : null]
    );

    // Fire brain event
    try {
      await pool.query(
        ``INSERT INTO rfq_brain_events(event_type, payload, created_at) VALUES ($1, $2, NOW())``,
        ['loaf.auction.bid_placed', JSON.stringify({ auctionId, bidder, bidAmount: amt })]
      );
    } catch (e) { console.warn('[loaf-routes] bid event warn:', e.message); }

    res.json({ ok:true, success:true, auctionId, bidAmount: amt });
  } catch (e) {
    console.error('[loaf-routes] /auctions/:id/bid error:', e.message);
    res.status(500).json({ ok:false, error: e.message });
  }
});

"@

  $newSrc = $src.Substring(0, $insertAt) + $newRoutes + $src.Substring($insertAt)
  Set-Content -Path $path -Value $newSrc -NoNewline -Encoding UTF8
  Write-Host "Injected /auctions/open + /auctions/:id/bid handlers" -ForegroundColor Green
}

# Validate JS
$nodeCheck = & node --check $path 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "JS syntax OK" -ForegroundColor Green
} else {
  Write-Host "JS syntax FAIL: $nodeCheck" -ForegroundColor Red
  exit 1
}

# Commit + push
cd C:\AuditDNA\backend
git add routes\loaf-routes.js
git commit -m "LOAF W: add /auctions/open + /auctions/:id/bid - mobile bid-receiving"
git push origin main
Write-Host "`nBackend pushed" -ForegroundColor Green
