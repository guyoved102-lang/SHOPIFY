'use strict';

// Category/material retail price ceilings — single source of truth for
// A1 (product research pricing) and A2.5 (QC price-ceiling gate).
// Previously duplicated identically in both agent.js files (Fable 5 audit M4/F8) —
// edit only here; both agents require this module.

const RETAIL_CEILING = {
  'Merino Wool': 75, 'Cashmere': 85, 'Egyptian Cotton': 75,
  'Premium Materials': 70, 'Gift Sets': 90, 'Tactical & Outdoor': 65,
  'Athletic': 55, 'Casual & No-Show': 45, 'General': 55,
};

const DEFAULT_CEILING = 65;

// Single-pair price floor — single source of truth for A2.5 (QC gate) and A7 (auto-reprice clamp).
// Decided by Guy (Keystone 3.3, 08/07/2026).
const PRICE_FLOOR = 22;

// True contribution-margin model — Fable 5 Stage 20 (FABLE5_STAGE20_UNIT_ECONOMICS_AND_FULFILLMENT.md).
// Formula: True CM = P - C - S - (fee% x P + fee$) - refund_allowance(REFUND_ALLOWANCE_PCT x P)
// All figures below are [EST]/[EXT] per that doc until the sample-order calibration task (tracker
// item K) replaces them with measured values from a real CJ invoice + Shopify payout.
const PAYMENT_FEE_PCT = 0.029;               // Shopify Payments standard rate — best case [EXT]
const PAYMENT_FEE_FIXED = 0.30;
const THIRD_PARTY_PAYMENT_FEE_PCT = 0.055;   // Shopify Payments unavailable in Israel; if the live
const THIRD_PARTY_PAYMENT_FEE_FIXED = 0.49;  // gateway is 3rd-party, Shopify adds ~2% on top [EXT]
const EST_SHIPPING_COST_USD = 5.00;          // CJ economy single-pair, China->US [EST]
const REFUND_ALLOWANCE_PCT = 0.05;           // socks = low-return apparel category [EST]

/**
 * @param {{retailPrice:number, supplierCost:number, shippingCost?:number, thirdPartyGateway?:boolean}} p
 * @returns {{trueCM:number, trueCMPct:number}}
 */
function trueContributionMargin({ retailPrice, supplierCost, shippingCost = EST_SHIPPING_COST_USD, thirdPartyGateway = false }) {
  if (!retailPrice || retailPrice <= 0) return { trueCM: 0, trueCMPct: 0 };
  const feePct = thirdPartyGateway ? THIRD_PARTY_PAYMENT_FEE_PCT : PAYMENT_FEE_PCT;
  const feeFixed = thirdPartyGateway ? THIRD_PARTY_PAYMENT_FEE_FIXED : PAYMENT_FEE_FIXED;
  const fees = feePct * retailPrice + feeFixed;
  const refundAllowance = REFUND_ALLOWANCE_PCT * retailPrice;
  const trueCM = retailPrice - supplierCost - shippingCost - fees - refundAllowance;
  const trueCMPct = (trueCM / retailPrice) * 100;
  return { trueCM: Math.round(trueCM * 100) / 100, trueCMPct: Math.round(trueCMPct * 10) / 10 };
}

/**
 * Clamp a raw markup calculation into [PRICE_FLOOR, category ceiling] — used by A7 before any
 * auto-reprice reaches Shopify. Stage 20 finding: A7's 2.5x auto-markup can set retail below the
 * price floor (e.g. supplier $5 -> retail $12.50), and was inert only because PRICE_WARN_PCT/
 * PRICE_CRITICAL_PCT were unset; this clamp must exist before those env vars are ever configured.
 */
function clampRetailPrice(rawPrice, category) {
  const ceiling = RETAIL_CEILING[category] ?? DEFAULT_CEILING;
  return Math.min(Math.max(rawPrice, PRICE_FLOOR), ceiling);
}

module.exports = {
  RETAIL_CEILING, DEFAULT_CEILING, PRICE_FLOOR,
  PAYMENT_FEE_PCT, PAYMENT_FEE_FIXED, THIRD_PARTY_PAYMENT_FEE_PCT, THIRD_PARTY_PAYMENT_FEE_FIXED,
  EST_SHIPPING_COST_USD, REFUND_ALLOWANCE_PCT, trueContributionMargin, clampRetailPrice,
};
