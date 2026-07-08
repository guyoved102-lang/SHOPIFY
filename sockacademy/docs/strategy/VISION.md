# SockAcademy — Brand Vision & Operating Standards

## Brand DNA
SockAcademy = האקדמיה הראשונה בעולם לגרביים פרמיום.
מוצר מינימלי. פרזנטציה מקסימלית. כל מילה, כל פיקסל — מכוונים.

## Tone of Voice — חוק בל יעבור
- **קצר. סמכותי. לא חופר.**
- אין מילות מילוי. אין ביטויים ילדותיים. אין סמלי אימוג'י בפרסום.
- כל שורת קופי נבדקת: "האם זה נשמע כמו מותג $250+ ?"
- דגם: Loro Piana, Sunspel, Falke — לא H&M, לא AliExpress.

## Omnichannel Ad Architecture — רמת פלטפורמות
| פלטפורמה | API | סטטוס |
|---|---|---|
| Meta Ads | Marketing API v25 | ✅ מחובר |
| Instagram | Graph API | ✅ הוגדר |
| TikTok for Business | TikTok Ads API | 🔜 Phase 2 |
| Google Ads | Google Ads API | 🔜 Phase 2 |
| Pinterest | Pinterest API | 🔜 Phase 3 |

## Server-Side Data Layer — CAPI (Phase 2)
כשיש traffic אמיתי → נבנה Meta Conversions API server-side:
- Events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase
- Hash: email/phone/IP → SHA256 לפני שליחה
- Deduplication: event_id משותף בין pixel + CAPI
- אפס תלות ב-browser, אפס ad-blockers

## Price Floor — קשיח
| קטגוריה | מינימום |
|---|---|
| Single Pair | $22 |
| Premium | $28 |
| Merino/Tactical | $35 |
| Gift Set | $65 |
| SockAcademy Club (Monthly) | $45/month (2 pairs) — TBD Phase 3 |

## Blocked — לכל הסוכנים לעולם
- גרביים לכלבים / חיות מחמד
- גרביים לילדים / תינוקות
- נובלטי / פאני / קריקטורים
- תמונות Higgsfield ללא רפרנס מגיא
- humor זול על "גרביים נעלמות" — BLOCKED. הניסוח היחיד המותר: "cyclical replenishment", "wardrobe continuity"

## A28 — SockAcademy Club | Brand Standards

**Concept:** Automated wardrobe replenishment programme for the discerning gentleman.
Not a subscription. A protocol.

**Value Proposition (Approved Language):**
- "Your wardrobe, maintained. Automatically."
- "The SockAcademy Replenishment Programme — curated pairs, delivered on your cycle."
- "Wardrobe continuity, without the friction."

**Forbidden Framings:**
- "Never run out of socks" — too casual
- "Socks disappear" — cheap
- "Hassle-free" — generic

**Club Tiers (Draft — to be finalized):**
| Tier | Frequency | Pairs | Price/Month |
|---|---|---|---|
| Essential | Monthly | 2 pairs | $45 |
| Curator | Monthly | 4 pairs | $80 |
| Atelier | Bi-monthly | 6 pairs (curated by SockAcademy) | $140 |

## Agent Fleet Status (18/06/2026)
| Agent | Function | Status |
|---|---|---|
| A0 | Orchestrator | ✅ Live (Monday 09:00 IL) |
| A1 | Product Research | ✅ Live |
| A2 | Product Upload | ✅ Live |
| A3 | Content & Blog | ✅ Live (A1 context feed active) |
| A4 | Meta Ads | ✅ DRY-RUN (awaiting Meta credentials) |
| A5 | Instagram Social | ⚠️ DRY-RUN (awaiting IG publish permission) |
| A6 | Email / Klaviyo | ✅ Live (Welcome + Abandoned Cart flows) |
| A7 | Supplier Monitor | ⚠️ MOCK products (awaiting real CJ IDs) |
| A9 | Legal Compliance | ✅ (attorney review required before traffic) |
| A10 | Trend Scout | ✅ |
| A11 | Price Intelligence | ✅ |
| A12 | Review Collector | ✅ |
| A14 | COO Agent | 🔜 Phase 2 (trigger: 25 orders / $1K MRR) |
| A15 | CFO Agent | 🔜 Phase 2 |
| A16 | Customer Experience | 🔜 Phase 2 |
| A17 | IP Protection | 🔜 Phase 3 |
| A18 | Fraud & Cybersecurity | 🔜 Phase 3 |
| A19 | Returns Intelligence | 🔜 Phase 3 |
| A20 | Inventory Intelligence | 🔜 Phase 3 |
| A21 | Affiliate & Influencer | 🔜 Phase 3 |
| A22 | Supply Chain Intel | 🔜 Scale |
| A23 | Factory Relations | 🔜 Scale |
| A24 | CRO Agent | 🔜 Phase 3 |
| A26 | Regulatory Watch | 🔜 Phase 3 |
| A27 | PR & Media | 🔜 Scale |
| A28 | SockAcademy Club | 🔜 Scale ($15K MRR) |

## Build Phases — System-First Mandate
**Zero sales until the entire machine is built, tested, and fully synchronized.**

**Phase numbering below follows `PHASE_ARCHITECTURE_SKELETON.md` — the canonical SA-Cluster Phase sequence (see `feedback_enterprise_rules.md` → Phase-Numbering Disambiguation). Decided 08/07/2026 (Keystone 3.5): where this doc and the skeleton ever disagree, the skeleton wins and this doc is updated to match.**

### Phase 1 — Core Machine (Current)
Complete: A0, A1, A2, A3, A4, A5, A6, A7, A9, A10, A11, A12
Immediate next: A15 CFO skeleton, A14 COO skeleton, A13 Global Competitive

### Phase 2 — C-Suite Activation (25 orders / $1K MRR)
A14 COO, A15 CFO, A8 Analytics, A16 CX Director
Accounting: Google Sheets → Wave (free)

### Phase 3 — Enterprise Protection ($5K MRR × 2 consecutive months)
A17 IP, A18 Fraud, A19 Returns, A20 Inventory, A21 Affiliate, A24 CRO, A26 Regulatory Watch

### Phase 4 — Scale / Brand Elevation ($15K MRR × 2 consecutive months)
A23 Factory (Private Label), A28 SockAcademy Club, A27 PR
Accounting: Wave → QuickBooks
Notion workspace activation

## Private Label — Ultimate Goal
SockAcademy begins as a curated dropshipping authority.
The machine is built from day one to support the future pivot:
- A1 tracks factory pricing (not just dropship)
- A15 CFO models private label margins vs. dropship
- A23 Factory Relations begins Alibaba intelligence at Phase 4 (Scale, $15K MRR × 2 months)
- Target: First private label SKU by Year 2
