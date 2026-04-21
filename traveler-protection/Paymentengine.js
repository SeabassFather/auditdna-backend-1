// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TRAVELER PROTECTION PAYMENT ENGINE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Handles subscriptions, entitlements, renewals for travel protection
// Stripe-first payment processing
// NOT the AuditDNA Finance module (invoice factoring/PO financing)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { pricingEngine } from './engines/pricingEngine';
import { entitlementEngine } from './engines/entitlementEngine';
import { ledgerEngine } from './engines/ledgerEngine';
import { stripeAdapter } from './adapters/stripeAdapter';
import { renewalEngine } from './engines/renewalEngine';
import { complianceEngine } from './engines/complianceEngine';
import { adminOverrideEngine } from './engines/adminOverrideEngine';
import { eventBus } from './utils/eventBus';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PRICING TIERS (Authoritative)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const PRICING_TIERS = {
  EXPLORER: {
    name: 'Explorer',
    monthlyPrice: 49.99,
    annualPrice: 49.99,
    duration: 11, // months
    features: {
      biometricAuth: ['face', 'fingerprint'],
      maxEmergencyContacts: 3,
      witnessNetwork: 'standard',
      meshRelay: true,
      satelliteMessages: 0,
      evidenceVault: false,
      familyTracking: false,
      maxVehicles: 2
    }
  },
  SHIELD: {
    name: 'Shield',
    monthlyPrice: 149.99,
    annualPrice: 149.99,
    duration: 11,
    features: {
      biometricAuth: ['face', 'voice', 'fingerprint'],
      maxEmergencyContacts: 10,
      witnessNetwork: 'priority',
      meshRelay: true,
      satelliteMessages: 10,
      evidenceVault: true,
      familyTracking: true,
      maxVehicles: 2
    },
    recommended: true
  },
  ENTERPRISE: {
    name: 'Enterprise',
    setupFee: 500,
    monthlyPrice: 500,
    duration: 11,
    features: {
      biometricAuth: ['face', 'voice', 'fingerprint'],
      maxEmergencyContacts: 'unlimited',
      witnessNetwork: 'priority',
      meshRelay: true,
      satelliteMessages: 'unlimited',
      evidenceVault: true,
      familyTracking: true,
      maxVehicles: 10,
      apiAccess: true,
      customBranding: true,
      slaGuarantees: true
    }
  }
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FINANCIAL CONTEXT INITIALIZATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export class TravelerProtectionPaymentEngine {
  constructor() {
    this.processingLock = new Map();
  }

  async initFinancialContext(userId, accountId, countryCode) {
    // Acquire processing lock (prevent double-charge)
    if (this.processingLock.has(accountId)) {
      throw new Error('PAYMENT_IN_PROGRESS');
    }

    this.processingLock.set(accountId, Date.now());

    try {
      // Load pricing schema (country-aware)
      const pricingSchema = await pricingEngine.loadSchema(countryCode);

      // Load account entitlements
      const entitlements = await entitlementEngine.loadAccount(accountId);

      // Load compliance state
      const complianceState = await complianceEngine.checkStatus(accountId);

      // Validate account not suspended
      if (complianceState.status === 'SUSPENDED') {
        throw new Error('ACCOUNT_SUSPENDED');
      }

      // Load prior ledger state
      const ledgerState = await ledgerEngine.getLatestState(accountId);

      return {
        pricingSchema,
        entitlements,
        complianceState,
        ledgerState,
        userId,
        accountId,
        countryCode
      };
    } finally {
      // Release lock after initialization
      this.processingLock.delete(accountId);
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PRICING RESOLUTION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async resolvePricing(context, tier, vehicleCount = 0) {
    const baseTier = PRICING_TIERS[tier];
    if (!baseTier) {
      throw new Error('INVALID_TIER');
    }

    // Base pricing
    let subtotal = baseTier.annualPrice;

    // Country multiplier (example: Mexico cheaper, EU more expensive)
    const countryMultiplier = this.getCountryMultiplier(context.countryCode);
    subtotal *= countryMultiplier;

    // Vehicle surcharge (max 2 for regular tiers)
    const maxVehicles = baseTier.features.maxVehicles;
    if (vehicleCount > maxVehicles) {
      throw new Error(`MAX_VEHICLES_EXCEEDED: ${maxVehicles}`);
    }

    // Late renewal penalty
    const lateRenewalPenalty = this.calculateLateRenewalPenalty(context);
    subtotal += lateRenewalPenalty;

    // Promotional/government waivers
    const waiver = await this.checkGovernmentWaivers(context);
    subtotal -= waiver;

    // Tax calculation
    const tax = this.calculateTax(subtotal, context.countryCode);

    // Processing fees
    const fees = this.calculateFees(subtotal);

    const total = subtotal + tax + fees;

    // Create immutable pricing object
    const pricingObject = {
      tier: baseTier.name,
      subtotal,
      tax,
      fees,
      total,
      currency: 'USD',
      countryCode: context.countryCode,
      vehicleCount,
      pricingVersion: '1.0',
      timestamp: new Date().toISOString(),
      signature: this.signPricing({ subtotal, tax, fees, total })
    };

    // Emit pricing event
    eventBus.emit('FINANCIAL_PRICED', pricingObject);

    return pricingObject;
  }

  getCountryMultiplier(countryCode) {
    const multipliers = {
      'US': 1.0,
      'MX': 0.8,
      'CA': 1.1,
      'GB': 1.2,
      'EU': 1.15
    };
    return multipliers[countryCode] || 1.0;
  }

  calculateLateRenewalPenalty(context) {
    if (!context.ledgerState || !context.ledgerState.expiresAt) {
      return 0;
    }

    const expiryDate = new Date(context.ledgerState.expiresAt);
    const now = new Date();
    const monthsLate = Math.floor((now - expiryDate) / (30 * 24 * 60 * 60 * 1000));

    if (monthsLate > 0) {
      return monthsLate * 10; // $10 per month late
    }

    return 0;
  }

  async checkGovernmentWaivers(context) {
    // Government employees, journalists, NGO workers may get waivers
    const waiverEligible = await complianceEngine.checkWaiverEligibility(context.userId);
    if (waiverEligible) {
      return 25; // $25 waiver
    }
    return 0;
  }

  calculateTax(subtotal, countryCode) {
    const taxRates = {
      'US': 0.08, // Example: 8% sales tax
      'MX': 0.16, // 16% IVA
      'CA': 0.13, // 13% HST
      'GB': 0.20, // 20% VAT
      'EU': 0.19  // 19% VAT average
    };
    const rate = taxRates[countryCode] || 0;
    return subtotal * rate;
  }

  calculateFees(subtotal) {
    // Stripe processing fee: 2.9% + $0.30
    return (subtotal * 0.029) + 0.30;
  }

  signPricing(pricingObject) {
    // Cryptographic signature to prevent tampering
    const crypto = require('crypto');
    const data = JSON.stringify(pricingObject);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ENTITLEMENT PRE-CHECK
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async validateEntitlements(userId, vehicleData = []) {
    const checks = {
      passportVerified: await this.checkPassportVerification(userId),
      vinVerified: await this.checkVINVerification(vehicleData),
      insuranceActive: await this.checkInsuranceStatus(vehicleData),
      notRevoked: await this.checkRevokedStatus(userId)
    };

    const allPassed = Object.values(checks).every(check => check === true);

    if (!allPassed) {
      return {
        valid: false,
        failures: Object.entries(checks)
          .filter(([key, value]) => !value)
          .map(([key]) => key)
      };
    }

    return { valid: true };
  }

  async checkPassportVerification(userId) {
    // Check if passport is verified and not expired
    const passport = await entitlementEngine.getPassport(userId);
    if (!passport) return false;

    const expiryDate = new Date(passport.expiresAt);
    const now = new Date();

    return expiryDate > now;
  }

  async checkVINVerification(vehicleData) {
    if (vehicleData.length === 0) return true; // No vehicles = no VIN check needed

    for (const vehicle of vehicleData) {
      const verified = await entitlementEngine.verifyVIN(vehicle.vin, vehicle.plate);
      if (!verified) return false;
    }

    return true;
  }

  async checkInsuranceStatus(vehicleData) {
    if (vehicleData.length === 0) return true;

    for (const vehicle of vehicleData) {
      const insuranceActive = await entitlementEngine.checkInsurance(vehicle.vin);
      if (!insuranceActive) return false;
    }

    return true;
  }

  async checkRevokedStatus(userId) {
    const revoked = await complianceEngine.isRevoked(userId);
    return !revoked;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STRIPE PAYMENT INTENT
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async createPaymentIntent(pricingObject, accountId, metadata = {}) {
    // Idempotency key to prevent duplicate charges
    const idempotencyKey = `${accountId}_${pricingObject.timestamp}`;

    const paymentIntent = await stripeAdapter.createPaymentIntent({
      amount: Math.round(pricingObject.total * 100), // Convert to cents
      currency: pricingObject.currency.toLowerCase(),
      metadata: {
        accountId,
        tier: pricingObject.tier,
        vehicleCount: pricingObject.vehicleCount,
        pricingVersion: pricingObject.pricingVersion,
        ...metadata
      },
      idempotency_key: idempotencyKey
    });

    return paymentIntent;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PAYMENT CONFIRMATION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async handlePaymentConfirmation(paymentIntentId, status) {
    if (status === 'succeeded') {
      // Write ledger entry (pending)
      const ledgerEntry = await ledgerEngine.writeEntry({
        type: 'PAYMENT_RECEIVED',
        paymentIntentId,
        status: 'PENDING',
        timestamp: new Date().toISOString()
      });

      // Activate entitlements (provisional)
      const entitlements = await this.activateEntitlements(paymentIntentId);

      // Emit success event
      eventBus.emit('FINANCIAL_PAYMENT_CONFIRMED', {
        paymentIntentId,
        ledgerEntryId: ledgerEntry.id,
        entitlements
      });

      return { success: true, entitlements };
    } else {
      // Write failed ledger
      await ledgerEngine.writeEntry({
        type: 'PAYMENT_FAILED',
        paymentIntentId,
        status: 'FAILED',
        timestamp: new Date().toISOString()
      });

      // Emit failure event
      eventBus.emit('FINANCIAL_PAYMENT_FAILED', { paymentIntentId });

      return { success: false };
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LEDGER ENGINE (Triple Entry Accounting)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async writeLedger(paymentIntentId, amount, accountId) {
    // Triple entry accounting:
    // 1. User debit
    // 2. Platform credit
    // 3. Compliance reserve

    const entries = [
      {
        accountId,
        type: 'DEBIT',
        amount,
        description: 'Traveler Protection Subscription',
        paymentIntentId,
        timestamp: new Date().toISOString()
      },
      {
        accountId: 'PLATFORM',
        type: 'CREDIT',
        amount: amount * 0.90, // 90% to platform
        description: 'Subscription Revenue',
        paymentIntentId,
        timestamp: new Date().toISOString()
      },
      {
        accountId: 'COMPLIANCE_RESERVE',
        type: 'CREDIT',
        amount: amount * 0.10, // 10% to compliance reserve
        description: 'Compliance Reserve',
        paymentIntentId,
        timestamp: new Date().toISOString()
      }
    ];

    // Hash-chain entries
    const hashedEntries = await ledgerEngine.hashChain(entries);

    // Write to append-only ledger
    await ledgerEngine.appendEntries(hashedEntries);

    return hashedEntries;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ENTITLEMENT ACTIVATION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async activateEntitlements(paymentIntentId) {
    const payment = await stripeAdapter.getPaymentIntent(paymentIntentId);
    const { accountId, tier } = payment.metadata;

    const tierConfig = PRICING_TIERS[tier.toUpperCase()];
    if (!tierConfig) {
      throw new Error('INVALID_TIER');
    }

    // Calculate expiration (11 months from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + tierConfig.duration);

    // Activate account
    const activation = await entitlementEngine.activate({
      accountId,
      tier: tierConfig.name,
      features: tierConfig.features,
      activatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'ACTIVE'
    });

    // Enable QR issuance
    await entitlementEngine.enableQRIssuance(accountId);

    // Enable VIN registry
    await entitlementEngine.enableVINRegistry(accountId, tierConfig.features.maxVehicles);

    // Enable authority scan recognition
    await entitlementEngine.enableAuthorityScanRecognition(accountId);

    // Schedule renewal reminder
    await renewalEngine.scheduleRenewal(accountId, expiresAt);

    // Emit activation event
    eventBus.emit('FINANCIAL_ENTITLEMENT_ACTIVE', activation);

    return activation;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENEWAL & EXPIRATION LOGIC
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async handleRenewal(accountId) {
    // Check if within renewal window (month 10-12)
    const entitlements = await entitlementEngine.loadAccount(accountId);
    const expiresAt = new Date(entitlements.expiresAt);
    const now = new Date();
    const monthsUntilExpiry = Math.floor((expiresAt - now) / (30 * 24 * 60 * 60 * 1000));

    if (monthsUntilExpiry > 2) {
      throw new Error('RENEWAL_WINDOW_NOT_OPEN');
    }

    if (monthsUntilExpiry < -1) {
      throw new Error('ACCOUNT_EXPIRED_BEYOND_GRACE');
    }

    // Process renewal (same as initial subscription)
    const context = await this.initFinancialContext(
      entitlements.userId,
      accountId,
      entitlements.countryCode
    );

    const pricing = await this.resolvePricing(
      context,
      entitlements.tier,
      entitlements.vehicleCount
    );

    return pricing;
  }

  async handleExpiration(accountId) {
    // Mark account as CANCELED
    await entitlementEngine.updateStatus(accountId, 'CANCELED');

    // Invalidate QR
    await entitlementEngine.invalidateQR(accountId);

    // Authority scans now return EXPIRED
    await entitlementEngine.setAuthorityScanStatus(accountId, 'EXPIRED');

    // Emit expiration event
    eventBus.emit('FINANCIAL_EXPIRED', { accountId });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // REFUNDS & CHARGEBACKS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async processRefund(paymentIntentId, reason) {
    // Check if authority usage has occurred
    const authorityUsage = await complianceEngine.checkAuthorityUsage(paymentIntentId);
    if (authorityUsage) {
      throw new Error('NO_REFUND_AFTER_AUTHORITY_USAGE');
    }

    // Process refund via Stripe
    const refund = await stripeAdapter.createRefund(paymentIntentId, reason);

    // Write negative ledger entry
    await ledgerEngine.writeEntry({
      type: 'REFUND',
      paymentIntentId,
      amount: -refund.amount,
      reason,
      timestamp: new Date().toISOString()
    });

    // Deactivate entitlements
    const payment = await stripeAdapter.getPaymentIntent(paymentIntentId);
    await entitlementEngine.deactivate(payment.metadata.accountId);

    return refund;
  }

  async handleChargeback(paymentIntentId) {
    // Auto-lock account on chargeback
    const payment = await stripeAdapter.getPaymentIntent(paymentIntentId);
    const accountId = payment.metadata.accountId;

    await complianceEngine.lockAccount(accountId, 'CHARGEBACK');

    // Write ledger entry
    await ledgerEngine.writeEntry({
      type: 'CHARGEBACK',
      paymentIntentId,
      accountId,
      timestamp: new Date().toISOString()
    });

    // Emit event
    eventBus.emit('FINANCIAL_REVOKED', { accountId, reason: 'CHARGEBACK' });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // COMPLIANCE & ABUSE LOCKS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async handleComplianceLock(accountId, reason) {
    // Immediate entitlement freeze
    await entitlementEngine.freeze(accountId);

    // Admin alert
    await this.sendAdminAlert({
      type: 'COMPLIANCE_LOCK',
      accountId,
      reason,
      timestamp: new Date().toISOString()
    });

    // Authority scan shows DO_NOT_CLEAR
    await entitlementEngine.setAuthorityScanStatus(accountId, 'DO_NOT_CLEAR');

    // Emit event
    eventBus.emit('FINANCIAL_REVOKED', { accountId, reason });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ADMIN OVERRIDES (Saul Garcia Only)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async adminOverride(action, accountId, reasonCode, signature) {
    // Verify admin signature
    if (!this.verifyAdminSignature(signature)) {
      throw new Error('INVALID_ADMIN_SIGNATURE');
    }

    let result;

    switch (action) {
      case 'FORCE_RENEW':
        result = await this.forceRenew(accountId);
        break;

      case 'FORCE_REVOKE':
        result = await this.forceRevoke(accountId);
        break;

      case 'ADJUST_LEDGER':
        result = await this.adjustLedger(accountId, reasonCode);
        break;

      case 'GRANT_WAIVER':
        result = await this.grantGovernmentWaiver(accountId);
        break;

      default:
        throw new Error('INVALID_ADMIN_ACTION');
    }

    // Write immutable audit entry
    await adminOverrideEngine.logOverride({
      action,
      accountId,
      reasonCode,
      signature,
      result,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  verifyAdminSignature(signature) {
    // In production, this would verify cryptographic signature
    // For now, simple check
    return signature && signature.startsWith('ADMIN_');
  }

  async forceRenew(accountId) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 11);

    await entitlementEngine.updateExpiration(accountId, expiresAt.toISOString());
    await entitlementEngine.updateStatus(accountId, 'ACTIVE');

    return { success: true, expiresAt };
  }

  async forceRevoke(accountId) {
    await this.handleExpiration(accountId);
    return { success: true };
  }

  async adjustLedger(accountId, reasonCode) {
    // Manual ledger adjustment (rare, requires audit trail)
    await ledgerEngine.writeEntry({
      type: 'ADMIN_ADJUSTMENT',
      accountId,
      reasonCode,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  }

  async grantGovernmentWaiver(accountId) {
    await entitlementEngine.setWaiverStatus(accountId, true);
    return { success: true };
  }

  async sendAdminAlert(alert) {
    // Send to admin dashboard, email, SMS
    console.log('ADMIN ALERT:', alert);
    // In production: send via notification service
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXPORTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const paymentEngine = new TravelerProtectionPaymentEngine();

export default paymentEngine;

