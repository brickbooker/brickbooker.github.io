import { defineConfig } from 'astro/config';

function rehypeSoftWrap() {
  const SKIP_TAGS = new Set(['pre', 'code', 'script', 'style']);

  function splitTextWithWbr(text, precededByElement) {
    const parts = [];
    let lastIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '(') {
        const hasPrevNonSpace = i > 0 ? !/\s/.test(text[i - 1]) : precededByElement;
        if (hasPrevNonSpace) {
          if (i > lastIndex) {
            parts.push({ type: 'text', value: text.slice(lastIndex, i) });
          }
          parts.push({ type: 'element', tagName: 'wbr', properties: {}, children: [] });
          lastIndex = i;
        }
      } else if (ch === '/') {
        const hasPrevNonSpace = i > 0 && !/\s/.test(text[i - 1]);
        const hasNextNonSpace = i + 1 < text.length && !/\s/.test(text[i + 1]);
        if (hasPrevNonSpace && hasNextNonSpace) {
          parts.push({ type: 'text', value: text.slice(lastIndex, i + 1) });
          parts.push({ type: 'element', tagName: 'wbr', properties: {}, children: [] });
          lastIndex = i + 1;
        }
      }
    }

    if (parts.length === 0) return null;
    if (lastIndex < text.length) {
      parts.push({ type: 'text', value: text.slice(lastIndex) });
    }
    return parts;
  }

  function visit(node) {
    if (!node || !Array.isArray(node.children)) return;
    if (node.type === 'element' && SKIP_TAGS.has(node.tagName)) return;

    const newChildren = [];
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type === 'text') {
        const prev = i > 0 ? node.children[i - 1] : null;
        const precededByElement = Boolean(prev && prev.type === 'element');
        const split = splitTextWithWbr(child.value, precededByElement);
        if (split) {
          newChildren.push(...split);
        } else {
          newChildren.push(child);
        }
      } else {
        visit(child);
        newChildren.push(child);
      }
    }
    node.children = newChildren;
  }

  return (tree) => {
    visit(tree);
  };
}

export default defineConfig({
  site: 'https://brickbooker.github.io',
  output: 'static',
  markdown: {
    rehypePlugins: [rehypeSoftWrap],
  },
});
