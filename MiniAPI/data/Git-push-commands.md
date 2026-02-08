# AuditDNA - MAJOR UPDATE: Zadarma CRM + Google Calendar + 15,379 Contacts

## Run these commands in PowerShell:

```powershell
cd C:\AuditDNA\frontend

# Stage all changes
git add -A

# Commit with detailed message
git commit -m "🚀 MAJOR: Zadarma CRM + Google Calendar + 15,379 Contacts Integration

## New Features:
- Zadarma VoIP CRM with click-to-call, SMS, WhatsApp
- Google Calendar integration with auto-scheduling
- Invoice auto-calendar events with 3-day reminders
- Sales inquiry auto-creation (calendar + CRM lead)
- 15,379 contacts loaded (National Shippers + USDA Organic)
- Full bilingual support (EN/ES)
- Dashboard with charts: status, region, commodity breakdown

## Backend API Endpoints:
- POST /api/zadarma/call - Initiate outbound calls
- POST /api/zadarma/sms - Send SMS messages
- GET /api/zadarma/leads - Get/filter contacts
- POST /api/zadarma/leads/import - Bulk import
- GET /api/zadarma/metrics - Dashboard metrics
- POST /api/calendar/invoice - Auto-create invoice event
- POST /api/calendar/inquiry - Auto-create inquiry + lead
- GET /api/calendar/events - View calendar events

## Data Sources:
- National Shippers Contact List: 2,270 contacts
- USDA Organic Integrity Database: 20,001 operations
- Merged unique contacts: 15,379

## Files Added/Modified:
- src/modules/ZadarmaCRM.jsx (Frontend CRM component)
- src/App.js (Added CRM & Communications category)
- backend/MiniAPI/server.js (Full backend with all routes)
- backend/MiniAPI/data/shipper-contacts.json (15,379 contacts)

## Zadarma Credentials:
- API Key: a2aaea04d645d80e739c
- WhatsApp: +52-646-340-2686

Author: Saul Garcia / CM Products International
Date: January 13, 2026"

# Push to GitHub
git push origin main
```

## If you need to set up Git first:

```powershell
# Configure Git (if not done)
git config --global user.name "Saul Garcia"
git config --global user.email "your-email@example.com"

# If repo not initialized
git init
git remote add origin https://github.com/YOUR_USERNAME/AuditDNA.git
git branch -M main
```

## Verify the push:
```powershell
git log --oneline -5
git status
```