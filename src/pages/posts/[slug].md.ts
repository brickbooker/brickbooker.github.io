import { getCollection, type CollectionEntry } from 'astro:content';

const SITE = 'https://brickbooker.github.io';

function formatCategory(category: string) {
  if (category === 'brick-by-brick') return 'Brick by Brick';
  if (category === 'book-unfolded') return 'Book Unfolded';
  return category;
}

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

export async function GET({ props }: { props: { post: CollectionEntry<'posts'> } }) {
  const { post } = props;
  const ym = post.data.date.toISOString().slice(0, 7);
  const cat = formatCategory(post.data.category);
  const bibList = post.data.bib ?? [];

  const bibLines = bibList.map((b) => {
    const authors = b.author && b.author.length > 0 ? `${b.author.join(', ')}, ` : '';
    const orig = b.origtitle ? ` (${b.origtitle})` : '';
    const year = b.year ? `, ${b.year}` : '';
    const ids: string[] = [];
    if (b.isbn) ids.push(`ISBN: ${b.isbn}`);
    if (b.doi) ids.push(`DOI: https://doi.org/${b.doi}`);
    if (b.url) ids.push(`URL: ${b.url}`);
    const idSuffix = ids.length > 0 ? ` [${ids.join(' | ')}]` : '';
    const role = b.num === 0 ? 'base' : `cite:${b.num}`;
    return `- \`${b.key}\` (${b.type}, ${role}): ${authors}《${b.title}》${orig}${year}${idSuffix}`;
  });

  const lines = [
    `# ${post.data.title}`,
    '',
    `- URL: ${SITE}/posts/${post.id}/`,
    `- Date: ${ym}`,
    `- Category: ${cat}`,
    ...(post.data.description ? [`- Summary: ${post.data.description}`] : []),
    '',
    '---',
    '',
    (post.body ?? '').trim(),
    ...(bibLines.length > 0
      ? [
          '',
          '---',
          '',
          '## Atomic References (BibTeX / Knowledge Graph Nodes)',
          '',
          ...bibLines,
        ]
      : []),
    '',
  ];

  return new Response('\uFEFF' + lines.join('\n'), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}

