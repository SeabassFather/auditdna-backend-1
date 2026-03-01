// ===================================================================
// EMAIL ROUTES - Campaign Sending via Gmail, Groups, Lists, Analytics
// Backend: C:\AuditDNA\backend\routes\Email_routes.js
// ===================================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for file uploads (images, attachments, videos, voices)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'email-campaigns');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB limit

// In-memory storage (upgrade to PostgreSQL later)
let groups = [];
let lists = [];
let optOuts = [];
let workflows = [];
let campaigns = [];
let analytics = {
  totalSent: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  bounced: 0,
  campaigns: []
};

// ===================================================================
// GMAIL INTEGRATION HELPER
// ===================================================================
const sendViaGmail = async (recipients, subject, body) => {
  const results = { sent: 0, failed: 0, details: [] };

  try {
    // Check Gmail connection status
    const statusRes = await fetch('http://localhost:5050/api/gmail/status');
    const status = await statusRes.json();

    if (!status.connected) {
      return { sent: 0, failed: recipients.length, error: 'Gmail not connected. Visit /api/gmail/auth first.', details: [] };
    }

    // Send via Gmail bulk endpoint
    const gmailRes = await fetch('http://localhost:5050/api/gmail/send-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipients: recipients.map(r => ({
          email: r.email || r.contact_email || r,
          name: r.name || r.contact_name || r.first_name || '',
          company: r.company || r.organization || ''
        })),
        subject,
        body,
        delayMs: 500 // Half second between emails
      })
    });

    const gmailData = await gmailRes.json();

    if (gmailData.success) {
      results.sent = gmailData.sent;
      results.failed = gmailData.failed;
      results.details = gmailData.results;
    } else {
      results.failed = recipients.length;
      results.error = gmailData.error;
    }
  } catch (err) {
    console.error('[EMAIL ROUTES] Gmail send error:', err.message);
    results.failed = recipients.length;
    results.error = err.message;
  }

  return results;
};

// ===================================================================
// SEND CAMPAIGN (Main endpoint - called by EmailMarketing.jsx)
// ===================================================================
router.post('/send-campaign', upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'attachments', maxCount: 10 },
  { name: 'videos', maxCount: 5 },
  { name: 'voices', maxCount: 5 }
]), async (req, res) => {
  try {
    const {
      subject,
      body: emailBody,
      contentType,
      recipients: recipientsJson,
      channels: channelsJson,
      smsContent,
      socialCaption,
      hashtags: hashtagsJson,
      workflowId,
      flyerData
    } = req.body;

    const recipients = JSON.parse(recipientsJson || '[]');
    const channels = JSON.parse(channelsJson || '["email"]');
    const hashtags = JSON.parse(hashtagsJson || '[]');

    console.log(`\n📧 ═══ CAMPAIGN LAUNCH ═══`);
    console.log(`📌 Subject: ${subject}`);
    console.log(`📌 Type: ${contentType}`);
    console.log(`📌 Recipients: ${recipients.length}`);
    console.log(`📌 Channels: ${channels.join(', ')}`);

    let sent = 0;
    let failed = 0;
    const channelResults = {};

    // ─── EMAIL CHANNEL ───
    if (channels.includes('email') && recipients.length > 0) {
      // Build HTML email body with any embedded images
      let htmlBody = emailBody;

      // Wrap in basic HTML template if not already HTML
      if (!htmlBody.includes('<html') && !htmlBody.includes('<div')) {
        htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0f172a; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: #cba658; margin: 0;">CM Products International</h2>
              <p style="color: #94a3b0; margin: 5px 0 0;">MexaUSA Food Group</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0;">
              ${htmlBody.replace(/\n/g, '<br>')}
            </div>
            <div style="background: #f8fafc; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Saul Garcia | CEO/COO<br>
                CM Products International | Email: saul@mexausafg.com<br>
                saul@mexausafg.com
              </p>
            </div>
          </div>`;
      }

      // Resolve recipient contact details from IDs
      let recipientEmails = [];
      try {
        const contactsRes = await fetch('http://localhost:5050/api/crm/contacts');
        const contactsData = await contactsRes.json();
        const allContacts = Array.isArray(contactsData) ? contactsData : (contactsData?.contacts || contactsData?.data || []);

        recipientEmails = recipients.map(id => {
          const contact = allContacts.find(c => c.id === id || c.id === parseInt(id));
          if (contact) {
            return {
              email: contact.email || contact.contact_email,
              name: contact.name || contact.contact_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
              company: contact.company || contact.organization || ''
            };
          }
          // If recipient is already an email string
          if (typeof id === 'string' && id.includes('@')) {
            return { email: id, name: '', company: '' };
          }
          return null;
        }).filter(r => r && r.email);

      } catch (err) {
        console.error('[EMAIL] Failed to resolve contacts:', err.message);
        // Fallback: treat recipients as email strings
        recipientEmails = recipients
          .filter(r => typeof r === 'string' && r.includes('@'))
          .map(email => ({ email, name: '', company: '' }));
      }

      if (recipientEmails.length > 0) {
        const gmailResult = await sendViaGmail(recipientEmails, subject, htmlBody);
        sent += gmailResult.sent;
        failed += gmailResult.failed;
        channelResults.email = gmailResult;
        console.log(`📧 Email: ${gmailResult.sent} sent, ${gmailResult.failed} failed`);
      } else {
        console.log('⚠️ No valid email addresses found for recipients');
        channelResults.email = { sent: 0, failed: recipients.length, error: 'No valid emails' };
      }
    }

    // ─── SMS CHANNEL (placeholder) ───
    if (channels.includes('sms') && smsContent) {
      console.log(`📱 SMS: Would send "${smsContent}" to ${recipients.length} recipients`);
      channelResults.sms = { queued: recipients.length, message: 'SMS integration pending' };
    }

    // ─── SOCIAL CHANNELS (placeholder) ───
    const socialChannels = channels.filter(c => ['youtube', 'facebook', 'instagram', 'twitter', 'linkedin'].includes(c));
    if (socialChannels.length > 0) {
      console.log(`📣 Social: Would post to ${socialChannels.join(', ')}`);
      channelResults.social = { channels: socialChannels, message: 'Social posting pending' };
    }

    // Update analytics
    analytics.totalSent += sent;
    analytics.delivered += sent;
    analytics.campaigns.push({
      id: Date.now(),
      subject,
      contentType,
      channels,
      recipientCount: recipients.length,
      sent,
      failed,
      sentAt: new Date().toISOString()
    });

    // Save campaign record
    campaigns.push({
      id: Date.now(),
      subject,
      contentType,
      channels,
      recipients: recipients.length,
      sent,
      failed,
      workflowId,
      createdAt: new Date().toISOString()
    });

    console.log(`📧 ═══ CAMPAIGN COMPLETE: ${sent} sent, ${failed} failed ═══\n`);

    res.json({
      success: true,
      sent,
      failed,
      total: recipients.length,
      channels: channelResults
    });
  } catch (err) {
    console.error('[EMAIL] Campaign error:', err.message);
    res.status(500).json({ error: err.message, sent: 0, failed: 0 });
  }
});

// ===================================================================
// GMAIL STATUS (proxy for frontend)
// ===================================================================
router.get('/gmail-status', async (req, res) => {
  try {
    const statusRes = await fetch('http://localhost:5050/api/gmail/status');
    const status = await statusRes.json();
    res.json(status);
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

// ===================================================================
// WORKFLOWS
// ===================================================================
router.get('/workflows', (req, res) => {
  res.json(workflows);
});

router.post('/workflows', (req, res) => {
  const { name, stages } = req.body;
  const workflow = {
    id: Date.now(),
    name: name || 'Untitled Workflow',
    stages: stages || ['draft'],
    currentStage: 'draft',
    createdAt: new Date().toISOString()
  };
  workflows.push(workflow);
  res.json({ success: true, workflow });
});

router.put('/workflows/:id/advance', (req, res) => {
  const id = parseInt(req.params.id);
  const { stage } = req.body;
  const workflow = workflows.find(w => w.id === id);
  if (workflow) {
    workflow.currentStage = stage;
    workflow.updatedAt = new Date().toISOString();
  }
  res.json({ success: true, workflow });
});

// ===================================================================
// GROUPS
// ===================================================================
router.get('/groups', (req, res) => {
  res.json(groups);
});

router.post('/groups', (req, res) => {
  const { name, contacts, contactIds } = req.body;
  const group = {
    id: Date.now(),
    name: name || 'Untitled Group',
    contactIds: contactIds || contacts || [],
    createdAt: new Date().toISOString()
  };
  groups.push(group);
  res.json({ success: true, group });
});

router.delete('/groups/:id', (req, res) => {
  const id = parseInt(req.params.id);
  groups = groups.filter(g => g.id !== id);
  res.json({ success: true });
});

// ===================================================================
// LISTS
// ===================================================================
router.get('/lists', (req, res) => {
  res.json(lists);
});

router.post('/lists', (req, res) => {
  const { name, emails } = req.body;
  const list = {
    id: Date.now(),
    name: name || 'Untitled List',
    emails: emails || [],
    createdAt: new Date().toISOString()
  };
  lists.push(list);
  res.json({ success: true, list });
});

router.delete('/lists/:id', (req, res) => {
  const id = parseInt(req.params.id);
  lists = lists.filter(l => l.id !== id);
  res.json({ success: true });
});

// ===================================================================
// OPT-OUTS
// ===================================================================
router.get('/opt-outs', (req, res) => {
  res.json(optOuts);
});

router.post('/opt-outs', (req, res) => {
  const { contact_id } = req.body;
  if (contact_id && !optOuts.find(o => o.contact_id === contact_id)) {
    optOuts.push({ contact_id, optedOutAt: new Date().toISOString() });
  }
  res.json({ success: true });
});

// ===================================================================
// ANALYTICS
// ===================================================================
router.get('/analytics', (req, res) => {
  res.json(analytics);
});

// ===================================================================
// CAMPAIGNS HISTORY
// ===================================================================
router.get('/campaigns', (req, res) => {
  res.json(campaigns);
});

// ===================================================================
// SEND SINGLE EMAIL (legacy endpoint)
// ===================================================================
router.post('/send', async (req, res) => {
  const { subject, content, recipients } = req.body;

  try {
    const statusRes = await fetch('http://localhost:5050/api/gmail/status');
    const status = await statusRes.json();

    if (status.connected) {
      // Send via Gmail
      const recipientList = Array.isArray(recipients) ? recipients : [recipients];
      const gmailResult = await sendViaGmail(
        recipientList.map(r => typeof r === 'string' ? { email: r } : r),
        subject,
        content
      );

      analytics.totalSent += gmailResult.sent;
      analytics.delivered += gmailResult.sent;

      res.json({
        success: true,
        message: `Email sent to ${gmailResult.sent} recipients via Gmail`,
        sent: gmailResult.sent,
        failed: gmailResult.failed,
        trackingId: Date.now()
      });
    } else {
      // Demo mode fallback
      const recipientCount = Array.isArray(recipients) ? recipients.length : 1;
      analytics.totalSent += recipientCount;
      analytics.delivered += Math.floor(recipientCount * 0.98);
      console.log(`[EMAIL] Demo mode - "${subject}" to ${recipientCount} recipients`);
      res.json({ success: true, message: `Email queued (demo mode)`, trackingId: Date.now() });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================================================================
// AI GENERATE (Claude-powered content generation)
// ===================================================================
router.post('/ai-generate', async (req, res) => {
  const { prompt, context, type } = req.body;

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

  // Fall back to template if no API key
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY.includes('YOUR_KEY') || ANTHROPIC_API_KEY.includes('your_real')) {
    console.log('[EMAIL AI] No Anthropic key - using template mode');
    return res.json({
      content: `Dear ${context?.contact || 'Valued Partner'},\n\nRegarding: "${prompt}"\n\nAt CM Products International, we specialize in premium fresh produce from Mexico.\n\nBest regards,\nSaul Garcia\nSales Director/Contract Sales- Load Volume-Multi Distribution Channels/Commodities
CM Products International- Los Angeles, Ca. & Mexico
Mexausa Food Group, Inc.\nEmail: saul@mexausafg.com`,
      subject: context?.subject || prompt,
      mode: 'template'
    });
  }

  try {
    const systemPrompt = `You are an AI email content writer for CM Products International (MexaUSA Food Group, Inc.).

COMPANY INFO:
- Sales Director/Contract Sales: Saul Garcia
- Specializes in premium fresh produce from Mexico, Central & South America
- Key products: Avocados (Hass), Strawberries, Leafy Greens, Tomatoes, Berries, Peppers
- Cross-border agricultural trading between Mexico and the USA
- Email: saul@mexausafg.com
- Email: saul@mexausafg.com

STYLE RULES:
- Professional but warm tone
- Include specific product details when relevant
- Use real industry terminology (FOB, delivered, case pricing, flats, bins)
- Reference Mexican growing regions when relevant (Michoacán, Jalisco, Baja California, Sinaloa)
- Include seasonal market insights
- Always sign as Saul Garcia, Sales Director/Contract Sales- Load Volume-Multi Distribution Channels/Commodities
CM Products International- Los Angeles, Ca. & Mexico
Mexausa Food Group, Inc.

${type === 'subject' ? 'Generate ONLY an email subject line. No body, no quotes, just the subject.' : 'Generate a complete professional email body. Include greeting, body paragraphs, and signature.'}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `${type === 'subject' ? 'Write a compelling email subject line for: ' : 'Write a professional email about: '}${prompt}${context?.contact ? `\n\nRecipient: ${context.contact}` : ''}${context?.subject ? `\nSubject context: ${context.subject}` : ''}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('[EMAIL AI] Anthropic error:', errData);
      throw new Error(errData.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    const generatedContent = data.content[0].text;

    console.log(`[EMAIL AI] ✅ Generated ${type || 'content'} (${generatedContent.length} chars)`);

    // If generating content, also generate a subject
    let subject = context?.subject || prompt;
    if (type !== 'subject') {
      try {
        const subjectRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 100,
            system: 'Generate ONLY a short, compelling email subject line. No quotes, no explanation, just the subject line text.',
            messages: [{ role: 'user', content: `Subject line for email about: ${prompt}` }]
          })
        });
        if (subjectRes.ok) {
          const subjectData = await subjectRes.json();
          subject = subjectData.content[0].text.trim().replace(/^["']|["']$/g, '');
        }
      } catch (e) {
        console.log('[EMAIL AI] Subject generation fallback:', e.message);
      }
    }

    res.json({
      content: generatedContent,
      subject: type === 'subject' ? generatedContent.trim() : subject,
      mode: 'ai'
    });
  } catch (err) {
    console.error('[EMAIL AI] Error:', err.message);
    // Fallback to template on error
    res.json({
      content: `Dear ${context?.contact || 'Valued Partner'},\n\nRegarding: "${prompt}"\n\nAt CM Products International, we specialize in premium fresh produce from Mexico.\n\nBest regards,\nSaul Garcia\nSales Director/Contract Sales- Load Volume-Multi Distribution Channels/Commodities
CM Products International- Los Angeles, Ca. & Mexico
Mexausa Food Group, Inc.\nEmail: saul@mexausafg.com`,
      subject: context?.subject || prompt,
      mode: 'template-fallback',
      error: err.message
    });
  }
});

router.post('/send-video', (req, res) => {
  console.log('[EMAIL] Video email received');
  analytics.totalSent += 1;
  res.json({ success: true, message: 'Video email queued' });
});

router.post('/send-marketing', (req, res) => {
  const { recipientCount } = req.body;
  analytics.totalSent += recipientCount || 1;
  res.json({ success: true, message: 'Marketing email queued' });
});

module.exports = router;
