import { getCollection } from 'astro:content';

const SITE = 'https://brickbooker.github.io';

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = (await getCollection('posts')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  const items = posts
    .map((post) => {
      const link = `${SITE}/posts/${post.id}/`;
      const desc = post.data.description || (post.data.bricks ?? []).join(', ');
      const categories = [
        post.data.category === 'brick-by-brick' ? 'Brick by Brick' : 'Book Unfolded',
        ...(post.data.bricks ?? []),
      ]
        .map((c) => `      <category>${escapeXml(c)}</category>`)
        .join('\n');

      return [
        '    <item>',
        `      <title>${escapeXml(post.data.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <pubDate>${post.data.date.toUTCString()}</pubDate>`,
        `      <description>${escapeXml(desc)}</description>`,
        categories,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>brickbooker</title>',
    `    <link>${SITE}/</link>`,
    '    <description>브릭부커(brickbooker) — 벽돌 같은 책을 읽고 사유를 기록하는 취미 공간</description>',
    '    <language>ko</language>',
    `    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
