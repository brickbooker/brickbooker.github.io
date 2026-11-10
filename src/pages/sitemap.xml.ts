import { getCollection } from 'astro:content';

const SITE = 'https://brickbooker.github.io';

export async function GET() {
  const posts = (await getCollection('posts')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  const latestPostDate =
    posts.length > 0
      ? posts[0].data.date.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  const urls = [
    { loc: `${SITE}/`, lastmod: latestPostDate },
    { loc: `${SITE}/about/`, lastmod: latestPostDate },
    ...posts.map((post) => ({
      loc: `${SITE}/posts/${post.id}/`,
      lastmod: post.data.date.toISOString().slice(0, 10),
    })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`
    ),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
