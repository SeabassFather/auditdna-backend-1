# MFG Google Workspace Setup — Inbox B (Real @mfginc.com Mailboxes)

This document covers provisioning real email mailboxes for all MFG employees so they can send and receive at their @mfginc.com addresses (not just display-only).

---

## CURRENT STATE

- Domain `mfginc.com` exists
- Email addresses (saul@, palt@, ogut@, etc.) are configured in the AuditDNA login system
- All outgoing email currently goes through `sgarcia1911@gmail.com` via Gmail SMTP (from-header is overridden)
- No actual mailboxes exist at @mfginc.com — incoming email to those addresses goes nowhere

---

## TARGET STATE

- 7 real mailboxes provisioned (saul, palt, ogut, jlgz, hmar, ecor, denisse)
- 1 alias mailbox: `bienesraices@mfginc.com` (for RE_BAJA campaign — points to saul)
- 1 alias mailbox: `devan@mfginc.com` (for DEVAN_INC campaign — points to saul + hmar)
- 1 alias mailbox: `factoring@mfginc.com` (group → saul + ogut)
- 1 alias mailbox: `pofinance@mfginc.com` (group → saul + ogut)
- 1 alias mailbox: `sourcing@mfginc.com` (group → saul + ogut + jlgz)

Each user logs into Gmail with their @mfginc.com address. AuditDNA still sends outgoing on their behalf via SMTP, but replies arrive at the real mailbox.

---

## STEP-BY-STEP PROVISIONING (do this once at workspace.google.com)

### 1. Sign up for Google Workspace Business Starter
- URL: https://workspace.google.com/pricing.html
- Plan: **Business Starter** ($6/user/month) — 7 users = $42/mo
- Or **Business Standard** ($12/user/month) if you want 2TB storage + Meet recording
- Sign up with `mfginc.com` as the primary domain
- Verify domain ownership (TXT record at Cloudflare DNS)

### 2. Add MX records to Cloudflare for mfginc.com
```
Priority   Mail server
1          ASPMX.L.GOOGLE.COM
5          ALT1.ASPMX.L.GOOGLE.COM
5          ALT2.ASPMX.L.GOOGLE.COM
10         ALT3.ASPMX.L.GOOGLE.COM
10         ALT4.ASPMX.L.GOOGLE.COM
```

### 3. Add SPF, DKIM, DMARC for deliverability
```
SPF (TXT @):           v=spf1 include:_spf.google.com include:smtp.gmail.com ~all
DKIM (TXT google._domainkey): generated in Workspace admin, paste value
DMARC (TXT _dmarc):    v=DMARC1; p=quarantine; rua=mailto:dmarc@mfginc.com
```

### 4. Provision 7 user mailboxes in Workspace Admin Console
Navigate to Directory → Users → Add new user. Create:

| Username | Display Name | Title |
|----------|--------------|-------|
| saul | Saul Garcia | Founder & CEO |
| palt | Pablo Alatorre | Admin - Internal Operations |
| ogut | Osvaldo Gutierrez | Admin - Sales & Marketing |
| jlgz | Jose Luis Gonzales | Admin - Sales |
| hmar | Hector Mariscal | Admin - Sales |
| ecor | Eliott Cordova | Admin - Sales |
| denisse | Denisse | Admin - Administrative |

### 5. Add aliases (Directory → Users → click user → Add alias)
- saul@mfginc.com → add alias `bienesraices@mfginc.com`
- saul@mfginc.com → add alias `devan@mfginc.com` (or assign to hmar@ if Hector is the lead)

### 6. Create groups (Directory → Groups)
- `factoring@mfginc.com` → members: saul, ogut
- `pofinance@mfginc.com` → members: saul, ogut
- `sourcing@mfginc.com` → members: saul, ogut, jlgz

### 7. Enable App Passwords for each user (one-time)
For each user that needs SMTP from AuditDNA:
- User logs into Gmail → Account → Security → App Passwords → Generate
- Copy the 16-char app password → store in `mfg_employees.smtp_user` column
- Allows AuditDNA to send "as" them via SMTP

### 8. Update AuditDNA to use per-user SMTP (optional, advanced)
Currently AuditDNA uses a single SMTP account. After provisioning, each employee can have their own:

```sql
UPDATE mfg_employees SET workspace_active=true, smtp_user='saul@mfginc.com'      WHERE username='saul';
UPDATE mfg_employees SET workspace_active=true, smtp_user='palt@mfginc.com'      WHERE username='palt@mfginc.com';
-- etc for each
```

In `campaigns-engine.js`, swap the master transporter for per-user transporter when employee.workspace_active=true.

---

## CHEAPER ALTERNATIVE: Email Forwarding (no Workspace cost)

If $42/mo is too much right now, use Cloudflare Email Routing (FREE):

1. Cloudflare Dashboard → Email → Email Routing → Enable
2. Add forwarding rule for each address:
   - saul@mfginc.com → sgarcia1911@gmail.com
   - palt@mfginc.com → pablo's personal gmail
   - etc

Pros: Free, instant setup
Cons: Each user receives @mfginc.com email at their personal Gmail, not at a separate mailbox. They can reply but the "from" will be their personal address unless they configure Gmail "Send mail as" with SMTP credentials.

This is the recommended starting point. Upgrade to full Workspace later when revenue justifies.

---

## TIMELINE

- **Today**: Phase 1 backend deployed (this commit)
- **This week**: Decide between Workspace ($42/mo) vs Cloudflare forwarding (free)
- **Next week**: Provision mailboxes + update mfg_employees.workspace_active
- **2 weeks**: Phase 2 UI (Campaigns tab + Internal Inbox tab) deployed
