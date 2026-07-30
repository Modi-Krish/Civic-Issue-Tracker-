import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/issue/', '/department/', '/tasks/', '/admin/'],
    },
    sitemap: 'https://civictracker.com/sitemap.xml',
  };
}
