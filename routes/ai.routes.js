// ===================================================================
// AI ROUTES - CLAUDE API INTEGRATION
// ===================================================================
// Endpoint: /api/ai/*
// Integrates with Anthropic Claude API for real AI content generation
// Ties into Cowboys (AI Agents) and Intelligence Engine
// ===================================================================

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// ===================================================================
// CLAUDE API CONFIGURATION
// ===================================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

// Company context for all AI generations
const COMPANY_CONTEXT = `
You are an AI assistant for Mexausa Food Group, Inc. and MexaUSA Food Group, Inc.

COMPANY INFO:
- CEO/COO: Saul Garcia (NMLS #337526)
- Industry: Cross-border agricultural trading (Mexico/USA)
- Headquarters: Royal Oaks, CA
- Products: Avocados, berries, tomatoes, lettuce, citrus, peppers
- Services: Invoice factoring, PO financing, USDA loans, mortgage lending
- Platform: AuditDNA (agricultural intelligence & traceability)

SPECIALTIES:
- Fresh produce sourcing from Mexico, Central America, South America
- FSMA 204 compliance and full traceability
- Small grower programs with umbrella compliance
- Competitive financing options

TONE: Professional, knowledgeable, friendly, results-oriented.
Always sign letters as: Saul Garcia, CEO/COO, Mexausa Food Group, Inc., NMLS #337526
`;

// ===================================================================
// GENERATE LETTER - Main endpoint
// ===================================================================

router.post('/generate-letter', async (req, res) => {
  const { topic, tone, contact, category, customPrompt } = req.body;

  if (!topic && !customPrompt) {
    return res.status(400).json({ error: 'Topic or customPrompt required' });
  }

  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      console.log('🤖 [DEMO MODE] No ANTHROPIC_API_KEY - using template fallback');
      return res.json({
        letter: generateFallbackLetter(topic, tone, contact, category),
        mode: 'demo',
        message: 'Add ANTHROPIC_API_KEY to .env for real AI generation'
      });
    }

    // Build the prompt
    const prompt = buildPrompt(topic, tone, contact, category, customPrompt);

    console.log('🤖 Calling Claude API for letter generation...');

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API Error:', errorData);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const letter = data.content[0].text;

    console.log('✅ Claude API response received');

    res.json({
      letter: letter,
      mode: 'live',
      model: CLAUDE_MODEL,
      tokens: data.usage?.output_tokens || 0
    });

  } catch (error) {
    console.error('AI Generation error:', error.message);
    
    // Fallback to template
    res.json({
      letter: generateFallbackLetter(topic, tone, contact, category),
      mode: 'fallback',
      error: error.message
    });
  }
});

// ===================================================================
// GENERATE MARKETING CONTENT
// ===================================================================

router.post('/generate-marketing', async (req, res) => {
  const { prompt, category, contact, type } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      return res.json({
        content: generateMarketingFallback(prompt, category),
        mode: 'demo'
      });
    }

    const marketingPrompt = `${COMPANY_CONTEXT}

TASK: Create ${type || 'marketing'} content for ${category || 'produce'}.

USER REQUEST: ${prompt}

CONTACT INFO (if applicable):
${contact ? JSON.stringify(contact, null, 2) : 'General audience'}

REQUIREMENTS:
- Professional business tone
- Include specific product details
- Add clear call-to-action
- Format for easy reading
- Include relevant certifications/compliance info if applicable

Write the content now:`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: marketingPrompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      content: data.content[0].text,
      mode: 'live',
      model: CLAUDE_MODEL
    });

  } catch (error) {
    console.error('Marketing generation error:', error.message);
    res.json({
      content: generateMarketingFallback(prompt, category),
      mode: 'fallback',
      error: error.message
    });
  }
});

// ===================================================================
// AI COWBOYS - Agent-specific generation
// ===================================================================

router.post('/cowboys/generate', async (req, res) => {
  const { cowboyId, task, context } = req.body;

  const cowboys = {
    'market-intel': 'Market Intelligence Cowboy - Analyze market trends, pricing, competition',
    'compliance': 'Compliance Cowboy - FSMA, USDA, food safety regulations',
    'logistics': 'Logistics Cowboy - Shipping, routing, port conditions',
    'quality': 'Quality Cowboy - Product quality, certifications, inspections',
    'weather': 'Weather Cowboy - Agricultural weather impacts, forecasts',
    'finance': 'Finance Cowboy - Pricing, factoring, payment terms'
  };

  const cowboyRole = cowboys[cowboyId] || 'General Agricultural Advisor';

  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      return res.json({
        response: `[${cowboyRole}] Demo response for: ${task}`,
        mode: 'demo'
      });
    }

    const cowboyPrompt = `${COMPANY_CONTEXT}

YOU ARE: ${cowboyRole}

Your role is to provide expert advice and analysis in your specialty area for Mexausa Food Group, Inc.'s agricultural trading operations.

TASK: ${task}

CONTEXT:
${JSON.stringify(context, null, 2)}

Provide a helpful, actionable response as this specialized AI agent:`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: cowboyPrompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      response: data.content[0].text,
      cowboy: cowboyId,
      mode: 'live'
    });

  } catch (error) {
    res.json({
      response: `[${cowboyRole}] Error: ${error.message}. Task was: ${task}`,
      mode: 'error'
    });
  }
});

// ===================================================================
// SEARCH & RESEARCH (ties to web search)
// ===================================================================

router.post('/search-research', async (req, res) => {
  const { query, searchType } = req.body;

  // This would integrate with external search APIs
  // For now, returns Claude's knowledge + indication to use web search

  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      return res.json({
        results: `Research results for: ${query}`,
        mode: 'demo',
        suggestion: 'Enable ANTHROPIC_API_KEY for real research'
      });
    }

    const researchPrompt = `${COMPANY_CONTEXT}

RESEARCH REQUEST: ${query}
TYPE: ${searchType || 'general'}

Provide relevant information from your knowledge about this topic as it relates to agricultural trading, produce industry, or Mexausa Food Group, Inc.'s services. 

If this requires real-time data (prices, weather, news), indicate that external APIs should be consulted.

Research response:`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: researchPrompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      results: data.content[0].text,
      query: query,
      mode: 'live'
    });

  } catch (error) {
    res.json({
      results: `Unable to complete research for: ${query}`,
      mode: 'error',
      error: error.message
    });
  }
});

// ===================================================================
// HEALTH CHECK
// ===================================================================

router.get('/health', (req, res) => {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  res.json({
    status: 'ok',
    aiEnabled: hasKey,
    model: CLAUDE_MODEL,
    mode: hasKey ? 'live' : 'demo'
  });
});

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function buildPrompt(topic, tone, contact, category, customPrompt) {
  const toneGuide = {
    professional: 'Use a professional, business-like tone',
    friendly: 'Use a warm, friendly tone while remaining professional',
    formal: 'Use a formal, traditional business tone',
    casual: 'Use a conversational, approachable tone',
    urgent: 'Convey urgency while remaining professional',
    persuasive: 'Use persuasive language with clear benefits'
  };

  const contactName = contact?.name || 'Valued Partner';
  const contactCompany = contact?.company || '';

  return `${COMPANY_CONTEXT}

TASK: Write a professional business letter about: ${topic}

RECIPIENT:
- Name: ${contactName}
- Company: ${contactCompany}
- Category: ${category || 'general'}

TONE: ${toneGuide[tone] || toneGuide.professional}

${customPrompt ? `ADDITIONAL INSTRUCTIONS: ${customPrompt}` : ''}

REQUIREMENTS:
- Address the recipient by name
- Be specific about products/services mentioned
- Include relevant details (sizes, volumes, certifications if applicable)
- End with a clear call-to-action
- Sign as Saul Garcia, CEO/COO, Mexausa Food Group, Inc., NMLS #337526

Write the letter now:`;
}

function generateFallbackLetter(topic, tone, contact, category) {
  const name = contact?.name || 'Valued Partner';
  
  // Category-specific content
  const categoryContent = {
    avocados: `We specialize in premium Mexican avocados from Michoacán, Jalisco, and Mexico State.

Available sizes: #32, #36, #40, #48, #60, #70, #84
Packaging: Maya bags (2-6 pack), bulk cartons, clamshells
Volumes: Full truckloads, half loads, LTL shipments`,
    
    berries: `Our berry program includes premium strawberries, blueberries, raspberries, and blackberries from Baja California and beyond.

Packaging: 1lb & 2lb clamshells, flat packs
Quality: Cold chain maintained, Brix tested
Organic options available`,

    lettuce: `Premium leafy greens from Yuma, AZ and Salinas, CA.

Products: Romaine hearts, iceberg, spring mix, baby spinach, kale
Quality: LGMA certified, vacuum-cooled
Full traceability included`,

    default: `We offer a comprehensive range of fresh produce and agricultural services.

Products: Avocados, berries, tomatoes, lettuce, citrus, peppers
Services: Invoice factoring, PO financing, USDA certifications
Compliance: FSMA 204 compliant, full traceability`
  };

  const content = categoryContent[category] || categoryContent.default;

  return `Dear ${name},

I hope this message finds you well. I'm reaching out from Mexausa Food Group, Inc. regarding ${topic || 'our produce programs'}.

${content}

Our services include:
• Competitive FOB and delivered pricing
• Flexible payment terms (Net 15/30)
• Invoice factoring and PO financing available
• Full FSMA 204 compliant traceability
• Quality inspection at origin

I would welcome the opportunity to discuss how we can support your needs.

Would you be available for a brief call this week?

Best regards,
Saul Garcia
CEO/COO, Mexausa Food Group, Inc.
NMLS #337526
📞 (831) 555-0123
📧 saul@cmproducts.com`;
}

function generateMarketingFallback(prompt, category) {
  return `Dear Valued Partner,

${prompt}

At Mexausa Food Group, Inc., we're committed to providing exceptional products and services for all your ${category || 'agricultural'} needs.

Our team is ready to support you with:
• Premium quality products
• Competitive pricing
• Reliable supply
• Full compliance and traceability

Contact us today to learn more!

Best regards,
Saul Garcia
CEO/COO, Mexausa Food Group, Inc.
NMLS #337526`;
}

module.exports = router;