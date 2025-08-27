/// <reference path="../.astro/types.d.ts" />

declare global {
	interface ImportMetaEnv {
		readonly BLOG_BASE?: string;                 // `/blog/` (default) or `/guides/`
		readonly MIN_REVIEWS_FOR_AGG?: string;      // numeric string
		readonly ALLOW_LOCALBUSINESS_RATINGS?: string; // "0" | "1"
		readonly REVIEWS_MODE?: "seed" | "live" | "seed+live";
	}
	interface ImportMeta { readonly env: ImportMetaEnv }
}

export {};