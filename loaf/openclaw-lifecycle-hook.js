// ================================================================================
// OpenClaw WhatsApp → LOAF Lifecycle Intelligence Hook
// Place this require() in your OpenClaw agent message handler
// ================================================================================
'use strict';
const { parseLifecycleMessage } = require('./whatsapp-lifecycle-parser');

// Call this from your OpenClaw onMessage handler:
// const handled = await handleLoafMessage(msg.body, msg.from);
// if (handled) return; // stop further processing

async function handleLoafMessage(messageBody, from) {
  const text = (messageBody || '').trim().toUpperCase();
  // Only handle LOAF-prefixed messages OR messages with lot patterns
  const isLoafMsg = /\b(LOAF|LOT-|LC-|STATUS\s+LOT|HARVEST|COSECHA|SALIDA|DEPARTURE|RECEIVED|RECIBIDO|BUYERRECEIVED|COMPRADOR)\b/.test(text);
  if (!isLoafMsg) return false;

  try {
    const result = await parseLifecycleMessage(messageBody, from);
    return result; // caller uses result.reply to respond via WhatsApp
  } catch (err) {
    console.error('LOAF WhatsApp handler error:', err.message);
    return { reply: 'Error processing LOAF data. Try again or visit loaf.mexausafg.com/submit', action:'error' };
  }
}

module.exports = { handleLoafMessage };
