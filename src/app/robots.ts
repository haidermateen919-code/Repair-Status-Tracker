import type { MetadataRoute } from "next";

/**
 * Belt and braces for privacy (PRD §7.3): customer pages send `noindex` as a
 * header and a meta tag, and crawlers are also told to stay out at the root.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
