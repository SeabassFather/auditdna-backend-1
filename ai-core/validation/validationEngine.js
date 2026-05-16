// =============================================================================
// ai-core/validation/validationEngine.js
// Save to: C:\AuditDNA\backend\ai-core\validation\validationEngine.js
// =============================================================================
// Real JSON + schema validation for Claude agent responses
// =============================================================================
'use strict';

// Required fields per task type
const SCHEMAS = {
  'grower-match':       ['analysis', 'action', 'confidence'],
  'buyer-match':        ['analysis', 'action', 'confidence'],
  'price-alert':        ['analysis', 'confidence'],
  'commodity-analysis': ['analysis', 'confidence'],
  'compliance-check':   ['analysis', 'action', 'confidence'],
  'lead-scoring':       ['confidence'],
  'deal-analysis':      ['analysis', 'confidence'],
  'risk-assessment':    ['analysis', 'confidence'],
  'default':            ['confidence'],
};

const CONFIDENCE_FLOOR = 0.0;   // structural floor — confidence must be a number
const CONFIDENCE_WARN  = 0.5;   // below this we flag as LOW_CONFIDENCE

class ValidationEngine {

  async run(agentId, response) {
    const result = {
      passed:   false,
      warnings: [],
      errors:   [],
      score:    0,
    };

    if (!response) {
      result.errors.push('Null response from agent');
      return result;
    }

    // ------------------------------------------------------------------
    // 1. Output must exist
    // ------------------------------------------------------------------
    const output = response.output || response;
    if (!output) {
      result.errors.push('Response has no output field');
      return result;
    }

    // ------------------------------------------------------------------
    // 2. Parse text if output is a raw string
    // ------------------------------------------------------------------
    let parsed = output;
    if (typeof output === 'string') {
      try {
        parsed = JSON.parse(output.replace(/```json|```/g, '').trim());
      } catch {
        // Not JSON — still valid if it has text content
        if (output.trim().length < 10) {
          result.errors.push('Output string too short to be meaningful');
          return result;
        }
        result.warnings.push('Output is plain text (not JSON) — schema validation skipped');
        result.passed = true;
        result.score  = 60;
        return result;
      }
    }

    // ------------------------------------------------------------------
    // 3. Confidence check
    // ------------------------------------------------------------------
    const confidence = parsed.confidence ?? response.confidence ?? null;
    if (confidence === null || typeof confidence !== 'number') {
      result.warnings.push('Missing or non-numeric confidence field');
    } else {
      if (confidence < CONFIDENCE_FLOOR) {
        result.errors.push(`Confidence ${confidence} below structural floor ${CONFIDENCE_FLOOR}`);
        return result;
      }
      if (confidence < CONFIDENCE_WARN) {
        result.warnings.push(`Low confidence: ${confidence}`);
      }
    }

    // ------------------------------------------------------------------
    // 4. Schema field check
    // ------------------------------------------------------------------
    const taskType  = response.taskType || 'default';
    const required  = SCHEMAS[taskType] || SCHEMAS['default'];
    const missing   = required.filter(f => !(f in parsed));
    if (missing.length > 0) {
      result.warnings.push(`Missing schema fields: ${missing.join(', ')}`);
    }

    // ------------------------------------------------------------------
    // 5. Analysis must be meaningful if present
    // ------------------------------------------------------------------
    if (parsed.analysis && parsed.analysis.trim().length < 20) {
      result.warnings.push('Analysis field is too short to be meaningful');
    }

    // ------------------------------------------------------------------
    // Score
    // ------------------------------------------------------------------
    let score = 100;
    score -= result.errors.length   * 30;
    score -= result.warnings.length * 10;
    score -= missing.length         * 5;
    result.score  = Math.max(0, score);
    result.passed = result.errors.length === 0 && result.score >= 50;

    return result;
  }
}

module.exports = new ValidationEngine();
