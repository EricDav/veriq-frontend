import { blogsApi } from '@/lib/api';
import {
  ALL_CATEGORIES,
  BLOG_POSTS,
  CATEGORY_COLORS,
  type BlogCategory,
  type BlogPost as StaticBlogPost,
} from '@/lib/blog-data';
import type { BlogPost } from '@/types';

export { ALL_CATEGORIES, CATEGORY_COLORS };
export type { BlogCategory };

export type BlogPostView = Omit<StaticBlogPost, 'category'> & {
  id?: string;
  category: BlogCategory;
  status?: BlogPost['status'];
  scheduledAt?: string;
  contentHtml?: string;
  authorName?: string;
  authorAvatar?: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
};

const FALLBACK_CATEGORY: BlogCategory = 'Property Intelligence';

export function toBlogView(post: BlogPost | StaticBlogPost): BlogPostView {
  return {
    ...post,
    id: 'id' in post ? post.id : undefined,
    category: ALL_CATEGORIES.includes(post.category as BlogCategory)
      ? (post.category as BlogCategory)
      : FALLBACK_CATEGORY,
    publishedAt: post.publishedAt ?? new Date().toISOString(),
    scheduledAt: 'scheduledAt' in post ? post.scheduledAt ?? undefined : undefined,
    coverImage: post.coverImage ?? undefined,
    youtubeId: post.youtubeId ?? undefined,
    content: post.content ?? [],
    contentHtml: 'contentHtml' in post ? post.contentHtml ?? undefined : undefined,
    tags: post.tags ?? [],
    status: 'status' in post ? post.status : 'published',
    authorName: 'authorName' in post ? post.authorName ?? undefined : undefined,
    authorAvatar: 'authorAvatar' in post ? post.authorAvatar ?? undefined : undefined,
    seoTitle: 'seoTitle' in post ? post.seoTitle ?? undefined : undefined,
    seoDescription: 'seoDescription' in post ? post.seoDescription ?? undefined : undefined,
    canonicalUrl: 'canonicalUrl' in post ? post.canonicalUrl ?? undefined : undefined,
  };
}

export async function getPublishedBlogPosts(): Promise<BlogPostView[]> {
  try {
    const res = await blogsApi.listPublished();
    if (res.data.length) return res.data.map(toBlogView);
  } catch {}

  return BLOG_POSTS.map(toBlogView);
}

export async function getPublishedBlogPost(slug: string): Promise<BlogPostView | null> {
  try {
    const res = await blogsApi.getBySlug(slug);
    return toBlogView(res.data);
  } catch {}

  const fallback = BLOG_POSTS.find((post) => post.slug === slug);
  return fallback ? toBlogView(fallback) : null;
}
