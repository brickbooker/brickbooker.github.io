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

  const lines = [
    '# brickbooker',
    '',
    '> brickbooker는 다소 두꺼운 벽돌책을 읽고 사유를 기록하는 취미 공간입니다. 서로 다른 시선을 맞대어 보거나, 접혀 있던 책의 구조를 펼쳐봅니다.',
    '',
    '## Categories',
    '',
    '- **Brick by Brick**: 책 바깥의 다른 책이나 이론을 또 하나의 벽돌처럼 맞대어 놓고 읽습니다. 서로 다른 관점이 교차하고 대립하거나 보완되는 지점에서 생각을 넓혀봅니다.',
    '- **Book Unfolded**: 단단한 한 권의 책 안으로 들어가 그 속에 접혀 있던 개념과 논리 구조를 한 겹씩 펼쳐 읽습니다. 책이 품은 문제의식을 고유한 틀로 풀어내며 새로운 관점으로 재구성해봅니다.',
    '',
    '## Posts',
    '',
    ...posts.map((post) => {
      const ym = post.data.date.toISOString().slice(0, 7);
      const cat = formatCategory(post.data.category);
      const desc = post.data.description ? ` — ${post.data.description}` : '';
      const bricks =
        post.data.bricks && post.data.bricks.length > 0
          ? ` [${post.data.bricks.join(' × ')}]`
          : '';
      return `- [${post.data.title}](${SITE}/posts/${post.id}/) (${ym}, ${cat})${desc}${bricks}`;
    }),
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
