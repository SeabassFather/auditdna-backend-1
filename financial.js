// ═══════════════════════════════════════════════════════════════
// FINANCIAL.JS - TRAVELER PROTECTION PAYMENT ENGINE
// ═══════════════════════════════════════════════════════════════
// Handles: Subscriptions, Entitlements, QR Issuance, Renewals
// Stripe Integration | Ledger | Compliance | Authority Permissions
// ═══════════════════════════════════════════════════════════════

const pricingEngine = require('./pricing-engine');
const entitlementEngine = require('./entitlement-engine');
const ledgerEngine = require('./ledger-engine');
const stripeAdapter = require('./stripe-adapter');
const renewalEngine = require('./renewal-engine');
const complianceEngine = require('./compliance-engine');
const adminOverrideEngine = require('./admin-override-engine');
const eventBus = require('./event-bus');

// ═══════════════════════════════════════════════════════════════
// SECTION 0: FILE ROLE & CONTRACT
// ═══════════════════════════════════════════════════════════════

/**
 * financial.js is the canonical money brain for Traveler Protection.
 * 
 * OWNS:
 * - Pricing resolution
 * - Entitlement state (QR, VIN, Authority scan permissions)
 * - Ledger entries (append-only, hash-chained)
 * - Renewal & expiration (11-month active, month 12 renewal)
 * - Refunds / chargebacks
 * - Compliance locks
 * - Admin overrides
 * - External payment provider abstraction (Stripe-first)
 * 
 * DOES NOT:
 * - Render UI
 * - Store documents
 * - Call embassies directly
 * - Decide legal outcomes
 * 
 * All state changes emit signed events only.
 */

// ═══════════════════════════════════════════════════════════════
// SECTION 1: INPUTS (AUTHORITATIVE)
// ═══════════════════════════════════════════════════════════════

class FinancialContext {
  constructor({
    userId,
    accountId,
    countryCode,
    currency,
    serviceType, // 'travel_registry', 'vehicle_addon'
    vehicleCount = 0,
    travelerCount = 1,
    authorityContext = 'civilian', // civilian | authority | embassy | admin
    paymentIntentId = null
  }) {
    this.userId = userId;
    this.accountId = accountId;
    this.countryCode = countryCode;
    this.currency = currency;
    this.serviceType = serviceType;
    this.vehicleCount = vehicleCount;
    this.travelerCount = travelerCount;
    this.authorityContext = authorityContext;
    this.paymentIntentId = paymentIntentId;
    
    // Internal state
    this.pricingVersion = null;
    this.entitlements = null;
    this.complianceStatus = null;
    this.ledgerState = null;
    this.processingMutex = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: INITIALIZATION PHASE
// ═══════════════════════════════════════════════════════════════

async function initFinancialContext(context) {
  try {
    // Lock processing mutex (anti-double-charge)
    if (context.processingMutex) {
      throw new Error('FINANCIAL_PROCESSING_LOCKED');
    }
    context.processingMutex = true;

    // Load pricing schema (country + service aware)
    const pricingSchema = await pricingEngine.loadPricingSchema({
      countryCode: context.countryCode,
      serviceType: context.serviceType
    });
    context.pricingVersion = pricingSchema.version;

    // Load account entitlements
    const entitlements = await entitlementEngine.loadEntitlements(context.accountId);
    context.entitlements = entitlements;

    // Load compliance state
    const complianceStatus = await complianceEngine.checkCompliance(context.accountId);
    context.complianceStatus = complianceStatus;

    // Validate account not suspended
    if (complianceStatus.suspended) {
      throw new Error('ACCOUNT_SUSPENDED');
    }

    // Load prior ledger state
    const ledgerState = await ledgerEngine.loadLedgerState(context.accountId);
    context.ledgerState = ledgerState;

    return {
      success: true,
      context
    };
  } catch (error) {
    context.processingMutex = false;
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: PRICING RESOLUTION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * 3.1 BASE PRICING
 * - Annual membership: $49.99 / person / 11 months
 * - Vehicle registry: max 2 VINs per account
 * - Authority accounts: zero-fee, issuance-bound
 * 
 * 3.2 MODIFIERS
 * - Country multiplier
 * - Vehicle surcharge
 * - Late renewal penalty
 * - Promotional / government waivers
 */

async function resolvePricing(context) {
  const pricing = {
    baseFee: 0,
    vehicleFee: 0,
    tax: 0,
    fees: 0,
    discount: 0,
    total: 0,
    pricingVersion: context.pricingVersion
  };

  // Authority accounts are zero-fee
  if (context.authorityContext === 'authority' || context.authorityContext === 'embassy') {
    pricing.total = 0;
    pricing.waived = true;
    pricing.waiverReason = 'GOVERNMENT_ISSUANCE';
    return pricing;
  }

  // Base annual fee
  pricing.baseFee = 49.99 * context.travelerCount;

  // Vehicle surcharge (max 2 vehicles)
  const vehicleCount = Math.min(context.vehicleCount, 2);
  pricing.vehicleFee = vehicleCount * 15.00; // $15 per vehicle

  // Country multiplier
  const countryMultiplier = pricingEngine.getCountryMultiplier(context.countryCode);
  pricing.baseFee *= countryMultiplier;

  // Tax calculation
  const taxRate = pricingEngine.getTaxRate(context.countryCode);
  const subtotal = pricing.baseFee + pricing.vehicleFee;
  pricing.tax = subtotal * taxRate;

  // Processing fees
  pricing.fees = pricingEngine.getProcessingFees(context.currency);

  // Promotional discounts
  const discount = await pricingEngine.getDiscount(context.accountId);
  pricing.discount = discount;

  // Calculate total
  pricing.total = subtotal + pricing.tax + pricing.fees - pricing.discount;

  // Emit pricing event
  await eventBus.emit('FINANCIAL_PRICED', {
    accountId: context.accountId,
    pricing,
    timestamp: new Date().toISOString()
  });

  return pricing;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: ENTITLEMENT PRE-CHECK
// ═══════════════════════════════════════════════════════════════

async function validateEntitlements(context) {
  const validation = {
    passportVerified: false,
    vinVerified: false,
    insuranceActive: false,
    priorTermNotRevoked: false,
    errors: []
  };

  // Passport verified
  const passport = await entitlementEngine.checkPassport(context.userId);
  if (!passport.verified || passport.expired) {
    validation.errors.push('PASSPORT_INVALID');
  } else {
    validation.passportVerified = true;
  }

  // VIN + plate verified (if vehicles registered)
  if (context.vehicleCount > 0) {
    const vehicles = await entitlementEngine.checkVehicles(context.accountId);
    if (!vehicles.allVerified) {
      validation.errors.push('VIN_VERIFICATION_FAILED');
    } else {
      validation.vinVerified = true;
    }

    // Insurance active
    const insurance = await entitlementEngine.checkInsurance(context.accountId);
    if (!insurance.active) {
      validation.errors.push('INSURANCE_LAPSED');
    } else {
      validation.insuranceActive = true;
    }
  } else {
    validation.vinVerified = true; // N/A
    validation.insuranceActive = true; // N/A
  }

  // Prior term not revoked for abuse
  const abuseCheck = await complianceEngine.checkAbuseHistory(context.accountId);
  if (abuseCheck.revoked) {
    validation.errors.push('PRIOR_TERM_REVOKED');
  } else {
    validation.priorTermNotRevoked = true;
  }

  validation.valid = validation.errors.length === 0;

  return validation;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: PAYMENT INTENT ORCHESTRATION
// ═══════════════════════════════════════════════════════════════

/**
 * 5.1 PROVIDER SELECTION
 * - Stripe (primary)
 * - Gov escrow (authority issuance)
 * - Offline deferred (embassy desks)
 */

async function createPaymentIntent(context, pricing) {
  // Authority accounts skip payment
  if (pricing.waived) {
    return {
      provider: 'GOVERNMENT_WAIVER',
      intentId: null,
      status: 'succeeded'
    };
  }

  // Create Stripe payment intent
  const intent = await stripeAdapter.createPaymentIntent({
    amount: Math.round(pricing.total * 100), // cents
    currency: context.currency.toLowerCase(),
    metadata: {
      accountId: context.accountId,
      userId: context.userId,
      serviceType: context.serviceType,
      pricingVersion: pricing.pricingVersion
    },
    idempotencyKey: `${context.accountId}_${Date.now()}`
  });

  return {
    provider: 'STRIPE',
    intentId: intent.id,
    clientSecret: intent.client_secret,
    status: intent.status
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: PAYMENT CONFIRMATION HANDLER
// ═══════════════════════════════════════════════════════════════

async function handlePaymentConfirmation(context, paymentIntent) {
  try {
    if (paymentIntent.status === 'succeeded') {
      // Write ledger entry (pending → confirmed)
      await ledgerEngine.writeEntry({
        accountId: context.accountId,
        type: 'PAYMENT_RECEIVED',
        amount: paymentIntent.amount / 100,
        currency: context.currency,
        provider: 'STRIPE',
        intentId: paymentIntent.id,
        status: 'CONFIRMED',
        timestamp: new Date().toISOString()
      });

      // Activate entitlements (provisional → active)
      await activateAccount(context);

      // Emit success event
      await eventBus.emit('FINANCIAL_PAYMENT_CONFIRMED', {
        accountId: context.accountId,
        amount: paymentIntent.amount / 100,
        currency: context.currency,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        accountStatus: 'ACTIVE'
      };
    } else {
      // Write failed ledger
      await ledgerEngine.writeEntry({
        accountId: context.accountId,
        type: 'PAYMENT_FAILED',
        amount: paymentIntent.amount / 100,
        currency: context.currency,
        provider: 'STRIPE',
        intentId: paymentIntent.id,
        status: 'FAILED',
        timestamp: new Date().toISOString()
      });

      // Emit failure event
      await eventBus.emit('FINANCIAL_PAYMENT_FAILED', {
        accountId: context.accountId,
        reason: paymentIntent.last_payment_error?.message || 'UNKNOWN',
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: 'PAYMENT_FAILED'
      };
    }
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    context.processingMutex = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: LEDGER ENGINE (CORE)
// ═══════════════════════════════════════════════════════════════

/**
 * Every transaction produces 3 entries:
 * 1. User debit
 * 2. Platform credit
 * 3. Compliance reserve
 * 
 * Ledger properties:
 * - Append-only
 * - Hash-chained
 * - Admin-auditable
 */

// Implementation delegated to ledger-engine.js

// ═══════════════════════════════════════════════════════════════
// SECTION 8: ENTITLEMENT ACTIVATION
// ═══════════════════════════════════════════════════════════════

async function activateAccount(context) {
  const activationDate = new Date();
  const expirationDate = new Date(activationDate);
  expirationDate.setMonth(expirationDate.getMonth() + 11); // 11 months active

  // Start 11-month validity timer
  await entitlementEngine.setAccountValidity({
    accountId: context.accountId,
    status: 'ACTIVE',
    activatedAt: activationDate.toISOString(),
    expiresAt: expirationDate.toISOString()
  });

  // Enable QR issuance
  await entitlementEngine.enableQRIssuance(context.accountId);

  // Enable VIN registry
  if (context.vehicleCount > 0) {
    await entitlementEngine.enableVINRegistry(context.accountId);
  }

  // Enable authority scan recognition
  await entitlementEngine.enableAuthorityScanRecognition(context.accountId);

  // Emit activation event
  await eventBus.emit('FINANCIAL_ENTITLEMENT_ACTIVE', {
    accountId: context.accountId,
    expiresAt: expirationDate.toISOString(),
    timestamp: new Date().toISOString()
  });

  // Schedule renewal reminder (month 10)
  await renewalEngine.scheduleRenewalReminder({
    accountId: context.accountId,
    reminderDate: new Date(activationDate.setMonth(activationDate.getMonth() + 10))
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9: RENEWAL & EXPIRATION LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * 9.1 RENEWAL WINDOW
 * - Opens at month 10
 * - Grace until end of month 12
 * 
 * 9.2 EXPIRATION
 * If not renewed:
 * - Account status → CANCELED
 * - QR invalidated
 * - Authority scan returns EXPIRED
 * - No silent grace beyond policy
 */

async function handleRenewal(accountId) {
  const account = await entitlementEngine.getAccount(accountId);
  
  if (account.status !== 'ACTIVE') {
    throw new Error('ACCOUNT_NOT_RENEWABLE');
  }

  // Check if within renewal window
  const now = new Date();
  const expiresAt = new Date(account.expiresAt);
  const renewalWindowStart = new Date(expiresAt);
  renewalWindowStart.setMonth(renewalWindowStart.getMonth() - 2); // Month 10

  if (now < renewalWindowStart) {
    throw new Error('RENEWAL_WINDOW_NOT_OPEN');
  }

  // Create renewal context
  const context = new FinancialContext({
    userId: account.userId,
    accountId: accountId,
    countryCode: account.countryCode,
    currency: account.currency,
    serviceType: 'travel_registry',
    vehicleCount: account.vehicleCount,
    travelerCount: 1
  });

  // Process renewal (same as new purchase)
  return await processPayment(context);
}

async function handleExpiration(accountId) {
  // Set account status to CANCELED
  await entitlementEngine.setAccountStatus(accountId, 'CANCELED');

  // Invalidate QR
  await entitlementEngine.invalidateQR(accountId);

  // Authority scan returns EXPIRED
  await entitlementEngine.setAuthorityScanResponse(accountId, 'EXPIRED');

  // Emit expiration event
  await eventBus.emit('FINANCIAL_EXPIRED', {
    accountId: accountId,
    timestamp: new Date().toISOString()
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10: REFUNDS & CHARGEBACKS
// ═══════════════════════════════════════════════════════════════

/**
 * RULES:
 * - No refunds after authority usage
 * - Partial refunds allowed before scan
 * - Chargebacks auto-lock account
 * - All refunds write negative ledger entries
 */

async function processRefund({ accountId, paymentIntentId, amount, reason }) {
  // Check if authority has scanned
  const usage = await entitlementEngine.getAuthorityUsage(accountId);
  if (usage.scanned) {
    throw new Error('REFUND_DENIED_AFTER_AUTHORITY_USAGE');
  }

  // Process refund via Stripe
  const refund = await stripeAdapter.createRefund({
    payment_intent: paymentIntentId,
    amount: Math.round(amount * 100), // cents
    reason: reason
  });

  // Write negative ledger entry
  await ledgerEngine.writeEntry({
    accountId: accountId,
    type: 'REFUND',
    amount: -amount,
    currency: refund.currency.toUpperCase(),
    provider: 'STRIPE',
    refundId: refund.id,
    reason: reason,
    status: 'COMPLETED',
    timestamp: new Date().toISOString()
  });

  return refund;
}

async function handleChargeback({ accountId, paymentIntentId, amount }) {
  // Auto-lock account
  await complianceEngine.lockAccount({
    accountId: accountId,
    reason: 'CHARGEBACK_RECEIVED',
    lockedAt: new Date().toISOString()
  });

  // Write ledger entry
  await ledgerEngine.writeEntry({
    accountId: accountId,
    type: 'CHARGEBACK',
    amount: -amount,
    provider: 'STRIPE',
    paymentIntentId: paymentIntentId,
    status: 'LOCKED',
    timestamp: new Date().toISOString()
  });

  // Emit event
  await eventBus.emit('FINANCIAL_CHARGEBACK', {
    accountId: accountId,
    amount: amount,
    timestamp: new Date().toISOString()
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 11: COMPLIANCE & ABUSE LOCKS
// ═══════════════════════════════════════════════════════════════

/**
 * TRIGGERS:
 * - Fraud flags
 * - Stolen VIN
 * - Passport mismatch
 * - Government revocation
 * 
 * EFFECTS:
 * - Immediate entitlement freeze
 * - Admin alert
 * - Authority scan shows DO NOT CLEAR
 */

async function handleComplianceLock({ accountId, reason, evidence }) {
  // Immediate entitlement freeze
  await entitlementEngine.freezeEntitlements(accountId);

  // Admin alert
  await adminOverrideEngine.alertAdmin({
    accountId: accountId,
    type: 'COMPLIANCE_LOCK',
    reason: reason,
    evidence: evidence,
    timestamp: new Date().toISOString()
  });

  // Authority scan shows DO NOT CLEAR
  await entitlementEngine.setAuthorityScanResponse(accountId, 'DO_NOT_CLEAR');

  // Emit event
  await eventBus.emit('FINANCIAL_COMPLIANCE_LOCK', {
    accountId: accountId,
    reason: reason,
    timestamp: new Date().toISOString()
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 12: ADMIN OVERRIDES
// ═══════════════════════════════════════════════════════════════

/**
 * CAPABILITIES:
 * - Force renew
 * - Force revoke
 * - Adjust ledger (with reason)
 * - Grant government waivers
 * 
 * All overrides require:
 * - Reason code
 * - Signature
 * - Immutable audit entry
 */

async function adminForceRenew({ accountId, adminId, reason, signature }) {
  // Verify admin signature
  const verified = await adminOverrideEngine.verifySignature(adminId, signature);
  if (!verified) {
    throw new Error('INVALID_ADMIN_SIGNATURE');
  }

  // Force renew
  await handleRenewal(accountId);

  // Write audit entry
  await ledgerEngine.writeAuditEntry({
    accountId: accountId,
    action: 'FORCE_RENEW',
    adminId: adminId,
    reason: reason,
    signature: signature,
    timestamp: new Date().toISOString()
  });
}

async function adminForceRevoke({ accountId, adminId, reason, signature }) {
  const verified = await adminOverrideEngine.verifySignature(adminId, signature);
  if (!verified) {
    throw new Error('INVALID_ADMIN_SIGNATURE');
  }

  // Revoke account
  await entitlementEngine.setAccountStatus(accountId, 'REVOKED');
  await entitlementEngine.invalidateQR(accountId);
  await entitlementEngine.setAuthorityScanResponse(accountId, 'REVOKED');

  // Write audit entry
  await ledgerEngine.writeAuditEntry({
    accountId: accountId,
    action: 'FORCE_REVOKE',
    adminId: adminId,
    reason: reason,
    signature: signature,
    timestamp: new Date().toISOString()
  });

  // Emit event
  await eventBus.emit('FINANCIAL_REVOKED', {
    accountId: accountId,
    reason: reason,
    timestamp: new Date().toISOString()
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 13: EVENT EMISSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * financial.js emits only signed events:
 * - FINANCIAL_PRICED
 * - FINANCIAL_PAYMENT_CONFIRMED
 * - FINANCIAL_ENTITLEMENT_ACTIVE
 * - FINANCIAL_RENEWAL_DUE
 * - FINANCIAL_EXPIRED
 * - FINANCIAL_REVOKED
 * 
 * No downstream mutation allowed.
 */

// Implementation delegated to event-bus.js

// ═══════════════════════════════════════════════════════════════
// SECTION 14: SECURITY MODEL
// ═══════════════════════════════════════════════════════════════

/**
 * - No PII logged
 * - Tokenized identifiers only
 * - PSP secrets isolated
 * - Read-only replicas for analytics
 */

// ═══════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR FUNCTION
// ═══════════════════════════════════════════════════════════════

async function processPayment(context) {
  // 1. Initialize context
  const initResult = await initFinancialContext(context);
  if (!initResult.success) {
    return { success: false, error: initResult.error };
  }

  // 2. Resolve pricing
  const pricing = await resolvePricing(context);

  // 3. Validate entitlements
  const validation = await validateEntitlements(context);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  // 4. Create payment intent
  const paymentIntent = await createPaymentIntent(context, pricing);

  // 5. Return for frontend confirmation
  if (paymentIntent.status !== 'succeeded') {
    return {
      success: true,
      requiresConfirmation: true,
      clientSecret: paymentIntent.clientSecret,
      amount: pricing.total
    };
  }

  // 6. Handle payment confirmation (if already succeeded)
  const confirmation = await handlePaymentConfirmation(context, {
    status: 'succeeded',
    amount: pricing.total * 100,
    id: paymentIntent.intentId
  });

  return confirmation;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  FinancialContext,
  processPayment,
  handleRenewal,
  handleExpiration,
  processRefund,
  handleChargeback,
  handleComplianceLock,
  adminForceRenew,
  adminForceRevoke
};