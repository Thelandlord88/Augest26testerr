// Minimal JS version of siteConfig (based on authoritative TS copy)
export const BLOG_BASE = (() => {
  const base = (process?.env?.BLOG_BASE || '/blog/').trim();
  const withEdge = `/${base.replace(/^\/+/g, '').replace(/\/+$/g, '')}/`.replace(/\/{2,}/g, '/');
  return withEdge;
})();
export const BLOG_BASE_NO_TRAIL = BLOG_BASE.replace(/\/$/, '');

export const siteConfig = {
  business: {
    name:    'One N Done Bond Clean',
    tagline: 'Bond Cleaning Experts',
    phone:   '+61405779420',
    email:   'info@onendonebondclean.com.au',
    url:     'https://onendonebondclean.com.au',
  },
  nav: {
    quickLinks: [
      { label: 'The Difference', href: '/#difference' },
      { label: 'Services',       href: '/#services'   },
      { label: 'About Us',       href: '/#about'      },
      { label: 'Contact',        href: '/#quote'      },
    ],
    legalLinks: [
      { label: 'Privacy Policy',    href: '/privacy/' },
      { label: 'Terms of Service',  href: '/terms/'   },
    ],
  },
};
