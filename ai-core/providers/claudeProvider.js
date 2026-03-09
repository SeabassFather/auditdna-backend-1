const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

class ClaudeProvider {
  async runAgent(agentId, payload) {
    const prompt = `
You are the ${agentId} AI agent inside AuditDNA.

Task Data:
${JSON.stringify(payload, null, 2)}

Respond in structured JSON:
{
  "analysis": "...",
  "action": "...",
  "confidence": 0.0 - 1.0
}
`;

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    });

    return {
      agentId,
      output: response.content[0].text,
      confidence: 0.85
    };
  }
}

module.exports = new ClaudeProvider();
