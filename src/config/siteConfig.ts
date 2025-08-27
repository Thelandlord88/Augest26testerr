// src/config/siteConfig.ts
// Canonical base for the editorial section (e.g., `/blog/` or `/guides/`)
// Always normalized to leading + trailing slash.
export const BLOG_BASE = (() => {
  // Access via any to avoid typing issues if env.d.ts isn't picked up in some tools
  const base = (((import.meta as any).env?.BLOG_BASE) ?? '/blog/').trim();
  const withEdge = `/${base.replace(/^\/+|\/+$/g, "")}/`.replace(/\/{2,}/g, "/");
  return withEdge;
})();
export const BLOG_BASE_NO_TRAIL = BLOG_BASE.replace(/\/$/, "");
// src/config/siteConfig.ts
// ------------------------------------------------------------------
// Single‑Source‑of‑Truth for all “global” site data.
// Import anywhere with:  import { siteConfig } from "~/config/siteConfig";
// ------------------------------------------------------------------
// Removed circular import of siteConfig
export interface BusinessInfo {
  name:     string;
  tagline?: string;
  phone:    string;   // International format: +614...
  email:    string;
  url:      string;   // Canonical full URL (no "www")
}

export interface NavSection {
  quickLinks: { label: string; href: string }[];
  legalLinks: { label: string; href: string }[];
}

export interface SiteConfig {
  business: BusinessInfo;
  nav:      NavSection;
  // Add "socials", "seo", etc. here if you need later
}

// ------------------------------------------------------------------
// EDIT THESE VALUES ONCE – they flow everywhere.
// ------------------------------------------------------------------
export const siteConfig: SiteConfig = {
  business: {
    name:    "One N Done Bond Clean",
    tagline: "Bond Cleaning Experts",
    phone:   "+61405779420",
    email:   "info@onendonebondclean.com.au",
    url:     "https://onendonebondclean.com.au",
  },

  nav: {
    quickLinks: [
      { label: "The Difference", href: "/#difference" },
      { label: "Services",       href: "/#services"   },
      { label: "About Us",       href: "/#about"      },
      { label: "Contact",        href: "/#quote"      },
    ],
    legalLinks: [
      { label: "Privacy Policy",    href: "/privacy/" },
      { label: "Terms of Service",  href: "/terms/"   },
    ],
  },
} as const;