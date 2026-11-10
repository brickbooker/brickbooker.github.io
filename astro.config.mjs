import { defineConfig } from 'astro/config';

function rehypeCite() {
  const SKIP_TAGS = new Set(['pre', 'code', 'script', 'style', 'sup']);
  const CITE_REGEX = /\\cite\{([^}]+)\}/g;

  return (tree, file) => {
    const bibList = file?.data?.astro?.frontmatter?.bib ?? [];
    const bibMap = new Map();
    for (const item of bibList) {
      if (item && typeof item.key === 'string' && typeof item.num === 'number') {
        bibMap.set(item.key.trim(), item.num);
      }
    }

    const citeRefCounts = new Map();
    const endnoteBlocks = [];

    function splitTextWithCite(text) {
      CITE_REGEX.lastIndex = 0;
      if (!CITE_REGEX.test(text)) return null;
      CITE_REGEX.lastIndex = 0;

      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = CITE_REGEX.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (start > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, start) });
        }

        const rawKeys = match[1].split(',').map((k) => k.trim()).filter(Boolean);
        const nums = [];
        for (const k of rawKeys) {
          const n = bibMap.get(k);
          if (typeof n === 'number' && n > 0 && !nums.includes(n)) {
            nums.push(n);
          }
        }
        nums.sort((a, b) => a - b);

        if (nums.length > 0) {
          const supChildren = [];
          nums.forEach((n, idx) => {
            if (idx > 0) {
              supChildren.push({
                type: 'element',
                tagName: 'span',
                properties: { 'aria-hidden': 'true' },
                children: [{ type: 'text', value: '·' }],
              });
            }
            const count = (citeRefCounts.get(n) || 0) + 1;
            citeRefCounts.set(n, count);
            supChildren.push({
              type: 'element',
              tagName: 'a',
              properties: {
                id: `cite-ref-${n}-${count}`,
                href: `#cite-note-${n}`,
                role: 'doc-noteref',
                'aria-label': `각주 ${n}`,
              },
              children: [{ type: 'text', value: String(n) }],
            });
          });

          parts.push({
            type: 'element',
            tagName: 'sup',
            properties: { className: ['cite'] },
            children: supChildren,
          });
        }

        lastIndex = end;
      }

      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }
      return parts;
    }

    function visit(node) {
      if (!node || !Array.isArray(node.children)) return;
      if (node.type === 'element' && SKIP_TAGS.has(node.tagName)) return;

      if (node.type === 'element' && node.tagName === 'blockquote') {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (
            child.type === 'element' &&
            child.tagName === 'p' &&
            Array.isArray(child.children) &&
            child.children.length >= 2 &&
            child.children[0].type === 'element' &&
            child.children[0].tagName === 'strong' &&
            child.children[1].type === 'text' &&
            /^\r?\n0\.\s+/.test(child.children[1].value)
          ) {
            const strongEl = child.children[0];
            const firstText = {
              ...child.children[1],
              value: child.children[1].value.replace(/^\r?\n0\.\s+/, ''),
            };
            const li0Children = [firstText, ...child.children.slice(2)];
            child.children = [strongEl];
            const li0 = {
              type: 'element',
              tagName: 'li',
              properties: {},
              children: li0Children,
            };

            let nextOl = null;
            for (let j = i + 1; j < node.children.length; j++) {
              if (node.children[j].type === 'element') {
                if (node.children[j].tagName === 'ol') {
                  nextOl = node.children[j];
                }
                break;
              }
            }

            if (nextOl) {
              nextOl.properties = { ...(nextOl.properties || {}), start: 0 };
              nextOl.children = [{ type: 'text', value: '\n' }, li0, ...nextOl.children];
              endnoteBlocks.push({ blockquote: node, strongEl, olEl: nextOl });
            } else {
              const newOl = {
                type: 'element',
                tagName: 'ol',
                properties: { start: 0 },
                children: [{ type: 'text', value: '\n' }, li0, { type: 'text', value: '\n' }],
              };
              node.children.splice(i + 1, 0, { type: 'text', value: '\n' }, newOl);
              endnoteBlocks.push({ blockquote: node, strongEl, olEl: newOl });
            }
          }
        }
      }

      const newChildren = [];
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type === 'text') {
          const split = splitTextWithCite(child.value);
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

    visit(tree);

    for (const { blockquote, strongEl, olEl } of endnoteBlocks) {
      strongEl.properties = { ...(strongEl.properties || {}), id: 'bib-heading' };
      blockquote.properties = {
        ...(blockquote.properties || {}),
        role: 'doc-endnotes',
        'aria-labelledby': 'bib-heading',
      };
      olEl.properties = {
        ...(olEl.properties || {}),
        className: ['brick-list'],
        start: 0,
      };

      let liIndex = 0;
      for (const child of olEl.children) {
        if (child.type === 'element' && child.tagName === 'li') {
          const idx = liIndex++;
          child.properties = { ...(child.properties || {}), id: `cite-note-${idx}` };
          child.children.unshift({
            type: 'element',
            tagName: 'span',
            properties: { className: ['brick-num'] },
            children: [{ type: 'text', value: `${idx}. ` }],
          });
          if (idx >= 1 && (citeRefCounts.get(idx) || 0) >= 1) {
            child.children.push({
              type: 'element',
              tagName: 'a',
              properties: {
                href: `#cite-ref-${idx}-1`,
                className: ['cite-backlink'],
                role: 'doc-backlink',
                'aria-label': `본문 각주 ${idx} 위치로 돌아가기`,
              },
              children: [],
            });
          }
        }
      }
    }
  };
}

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
    rehypePlugins: [rehypeCite, rehypeSoftWrap],
  },
});
