import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const bibItemSchema = z.object({
  key: z.string(),
  num: z.number().int().nonnegative(),
  type: z.enum(['book', 'article', 'concept', 'quote']).default('book'),
  title: z.string(),
  origtitle: z.string().optional(),
  author: z.array(z.string()).optional(),
  year: z.number().int().optional(),
  isbn: z.string().optional(),
  doi: z.string().optional(),
  url: z.string().optional(),
});

const posts = defineCollection({
  loader: glob({
    pattern: '[0-9a-f]*.md',
    base: process.env.POSTS_DIR || './src/content/posts',
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.string().default('brick-by-brick'),
    bricks: z.array(z.string()).default([]),
    bib: z.array(bibItemSchema).default([]),
    description: z.string().optional(),
  }),
});

export const collections = { posts };
