import { z, defineCollection } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    description: z.string().optional(),
    heroImage: z.string().optional(),
  }),
});

const cv = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    order: z.number(),
    date: z.string().optional(),
  }),
});

export const collections = { blog, cv };
