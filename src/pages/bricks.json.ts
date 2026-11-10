import { getCollection } from 'astro:content';

const SITE = 'https://brickbooker.github.io';

function formatCategory(category: string) {
  if (category === 'brick-by-brick') return 'Brick by Brick';
  if (category === 'book-unfolded') return 'Book Unfolded';
  return category;
}

export async function GET() {
  const posts = (await getCollection('posts')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  const nodeMap = new Map<
    string,
    {
      key: string;
      type: string;
      title: string;
      origtitle?: string;
      author?: string[];
      year?: number;
      isbn?: string;
      doi?: string;
      url?: string;
      posts: Array<{
        slug: string;
        title: string;
        url: string;
        role: 'base' | 'cited';
        num: number;
      }>;
    }
  >();

  const edges: Array<{
    postSlug: string;
    bibKey: string;
    role: 'base' | 'cited';
    num: number;
  }> = [];

  const postNodes = posts.map((post) => {
    const bibList = post.data.bib ?? [];
    for (const b of bibList) {
      const role = b.num === 0 ? 'base' : 'cited';
      edges.push({
        postSlug: post.id,
        bibKey: b.key,
        role,
        num: b.num,
      });

      const existing = nodeMap.get(b.key);
      const postRef = {
        slug: post.id,
        title: post.data.title,
        url: `${SITE}/posts/${post.id}/`,
        role: role as 'base' | 'cited',
        num: b.num,
      };
      if (existing) {
        existing.posts.push(postRef);
      } else {
        nodeMap.set(b.key, {
          key: b.key,
          type: b.type,
          title: b.title,
          ...(b.origtitle ? { origtitle: b.origtitle } : {}),
          ...(b.author && b.author.length > 0 ? { author: b.author } : {}),
          ...(b.year ? { year: b.year } : {}),
          ...(b.isbn ? { isbn: b.isbn } : {}),
          ...(b.doi ? { doi: b.doi } : {}),
          ...(b.url ? { url: b.url } : {}),
          posts: [postRef],
        });
      }
    }

    return {
      slug: post.id,
      title: post.data.title,
      date: post.data.date.toISOString().slice(0, 7),
      category: formatCategory(post.data.category),
      description: post.data.description ?? '',
      url: `${SITE}/posts/${post.id}/`,
      markdownUrl: `${SITE}/posts/${post.id}.md`,
      bricks: post.data.bricks ?? [],
      bibKeys: bibList.map((b) => b.key),
    };
  });

  const nodes = Array.from(nodeMap.values());
  const sharedBricks = nodes.filter((n) => n.posts.length > 1);

  const payload = {
    site: SITE,
    name: 'brickbooker Knowledge Graph',
    description:
      'Atomic bibliographic nodes (books, scholarly articles, philosophical concepts, and quotations) and their citation edges across brickbooker essays.',
    totalPosts: postNodes.length,
    totalAtomicNodes: nodes.length,
    sharedBricks,
    nodes,
    posts: postNodes,
    edges,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

