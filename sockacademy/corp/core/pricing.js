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

module.exports = { RETAIL_CEILING, DEFAULT_CEILING };
