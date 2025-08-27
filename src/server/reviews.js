// src/server/reviews.js — SSR-only reviews loader with seed/live/receipts and PII safety
import fs from "node:fs";
import path from "node:path";

// ---------- config (env-driven, with sensible defaults) ----------
const MODE = (process.env.REVIEWS_MODE || "seed").toLowerCase(); // seed | live | seed+live
const ROOT = process.cwd();

const SEED_PATH = path.join(ROOT, "src/data/seed-reviews.json");
const LIVE_PATH = path.join(ROOT, process.env.LIVE_REVIEWS_PATH || "src/data/reviews.json");
const RECEIPTS_PATH = path.join(ROOT, process.env.RECEIPTS_PATH || "src/data/review-receipts.json");

const MIN_FOR_AGG = Number(process.env.MIN_REVIEWS_FOR_AGG || "5"); // >= N to show AggregateRating
const ALLOW_LOCALBUSINESS_RATINGS = String(process.env.ALLOW_LOCALBUSINESS_RATINGS || "0") === "1";

// ---------- shared helpers ----------
export const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const makeKey = (service, suburb) => `${String(service)}:${slugify(suburb)}`;

const safeReadJSON = (p) => {
  try {
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
  } catch {
    return {};
  }
};

// Normalize legacy keys like "bond-cleaning:Redbank Plains" → "bond-cleaning:redbank-plains"
const normalizeKeys = (obj) => {
  const out = {};
  for (const [key, arr] of Object.entries(obj || {})) {
    const [service, suburbRaw = ""] = String(key).split(":");
    const k = makeKey(service, suburbRaw);
    out[k] = (out[k] || []).concat((arr || []).map((r) => ({ ...r })));
  }
  return out;
};

const dedupeAndSort = (arr = []) => {
  const seen = new Set();
  const out = [];
  for (const r of arr) {
    const sig = `${r?.author || ""}|${r?.title || ""}|${r?.date || ""}|${r?.stars || ""}|${(r?.body || "").slice(0, 60)}`;
    if (!seen.has(sig)) {
      seen.add(sig);
      out.push(r);
    }
  }
  // newest first if date present
  return out.sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")));
};

// Strip PII / internal fields before sending to UI/LD
const sanitize = (r) => {
  const { author, title, body, stars, date, source, receiptId } = r || {};
  return { author, title, body, stars: Number(stars) || null, date, source, receiptId };
};

// ---------- load sources ----------
const seedNorm = normalizeKeys(safeReadJSON(SEED_PATH));
const liveNorm = normalizeKeys(MODE !== "seed" ? safeReadJSON(LIVE_PATH) : {});
const receipts = MODE !== "seed" ? safeReadJSON(RECEIPTS_PATH) : {};

// Tag sources + attach receipt proof (if receiptId matches)
function mergeSources(seedObj, liveObj) {
  const keys = new Set([...Object.keys(seedObj), ...Object.keys(liveObj)]);
  const map = {};
  for (const k of keys) {
    const a = (seedObj[k] || []).map((r) => ({ ...r, source: r?.source || "seed" }));
    const b = (liveObj[k] || []).map((r) => ({ ...r, source: r?.source || "live" }));
    // attach receipt meta (channel, sentAt) for live entries when available
    for (const x of b) {
      if (x.receiptId && receipts[x.receiptId]) {
        const { channel, sentAt, suburb, service } = receipts[x.receiptId];
        x.receipt = { channel, sentAt, suburb, service };
      }
    }
    map[k] = dedupeAndSort(a.concat(b));
  }
  return map;
}

const reviewMap =
  MODE === "seed"
    ? Object.fromEntries(Object.entries(seedNorm).map(([k, list]) => [k, dedupeAndSort(list)]))
    : MODE === "live"
    ? Object.fromEntries(Object.entries(liveNorm).map(([k, list]) => [k, dedupeAndSort(list)]))
    : mergeSources(seedNorm, liveNorm); // seed+live default

// ---------- public API ----------
export function getReviews({ service, suburb, limit } = {}) {
  const key = makeKey(service, suburb);
  const list = (reviewMap[key] || []).map(sanitize);
  return typeof limit === "number" ? list.slice(0, Math.max(0, limit)) : list;
}

export function getAggregate({ service, suburb }) {
  const list = getReviews({ service, suburb });
  const valid = list.filter((r) => Number.isFinite(r.stars) && r.stars > 0);
  if (valid.length < MIN_FOR_AGG) return null;
  const sum = valid.reduce((acc, r) => acc + Number(r.stars), 0);
  const ratingValue = Math.round((sum / valid.length) * 10) / 10;
  return { ratingValue, reviewCount: valid.length };
}

export function allowLocalBusinessAggregate() {
  return ALLOW_LOCALBUSINESS_RATINGS;
}
