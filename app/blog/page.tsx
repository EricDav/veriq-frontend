'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Clock, ArrowRight, TrendingUp } from 'lucide-react';
import {
  ALL_CATEGORIES,
  CATEGORY_COLORS,
  getPublishedBlogPosts,
  type BlogCategory,
  type BlogPostView,
} from '@/lib/blogs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const COVER_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-purple-600 to-pink-700',
  'from-red-600 to-rose-700',
  'from-cyan-600 to-blue-700',
  'from-slate-600 to-slate-800',
  'from-teal-600 to-emerald-700',
];

function gradient(idx: number) {
  return COVER_GRADIENTS[idx % COVER_GRADIENTS.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function Cover({ post, idx, className }: { post: BlogPostView; idx: number; className: string }) {
  if (post.coverImage) {
    return (
      <div className={`${className} relative overflow-hidden bg-slate-200`}>
        <img src={post.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/20" />
      </div>
    );
  }
  return <div className={`${className} bg-gradient-to-br ${gradient(idx)} relative overflow-hidden`} />;
}

function FeaturedPost({ post, idx }: { post: BlogPostView; idx: number }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="relative mb-5">
        <Cover post={post} idx={idx} className="h-72 rounded-2xl" />
        <div className="absolute bottom-0 inset-x-0 p-6">
          <span className={`inline-block mb-2 rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_COLORS[post.category]}`}>
            {post.category}
          </span>
          <h2 className="font-display text-xl font-bold text-white leading-snug group-hover:text-white/90 transition-colors line-clamp-2">
            {post.title}
          </h2>
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">{post.excerpt}</p>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readTime} min read</span>
        <span>{formatDate(post.publishedAt)}</span>
      </div>
    </Link>
  );
}

function PostCard({ post, idx }: { post: BlogPostView; idx: number }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block card overflow-hidden hover:shadow-card-hover transition-shadow">
      <div className="relative">
        <Cover post={post} idx={idx} className="h-44" />
        {post.youtubeId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <div className="h-0 w-0 border-t-[8px] border-b-[8px] border-l-[14px] border-t-transparent border-b-transparent border-l-white ml-1" />
            </div>
          </div>
        )}
      </div>
      <div className="p-5">
        <span className={`inline-block mb-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CATEGORY_COLORS[post.category]}`}>
          {post.category}
        </span>
        <h3 className="font-display text-sm font-bold text-navy-900 leading-snug mb-2 line-clamp-2 group-hover:text-veriq-secondary transition-colors">
          {post.title}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readTime} min</span>
          <span className="flex items-center gap-1 text-veriq-secondary font-semibold group-hover:gap-2 transition-all">
            Read <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPostView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<BlogCategory | 'All'>('All');

  useEffect(() => {
    getPublishedBlogPosts()
      .then(setPosts)
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = posts.filter((p) => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-hero-pattern pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 mb-6">
            <BookOpen className="h-3.5 w-3.5 text-gold-400" />
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Veriq Property Blog</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Property Intelligence,<br />Before You Inspect
          </h1>
          <p className="text-white/70 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
            Guides, tips, and market intelligence to help you make smarter property decisions in Nigeria.
          </p>

          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10"
              placeholder="Search articles..."
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-2 overflow-x-auto pb-3 mb-10 scrollbar-hide">
          {(['All', ...ALL_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as typeof activeCategory)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="font-display text-lg font-bold text-navy-900 mb-2">No articles found</h3>
            <p className="text-slate-500 text-sm">Try a different search term or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-12">
              {featured && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <TrendingUp className="h-4 w-4 text-veriq-secondary" />
                    <h2 className="font-display text-sm font-bold text-navy-900 uppercase tracking-wider">
                      {activeCategory === 'All' ? 'Latest Article' : activeCategory}
                    </h2>
                  </div>
                  <FeaturedPost post={featured} idx={0} />
                </div>
              )}

              {rest.length > 0 && (
                <div>
                  <h2 className="font-display text-sm font-bold text-navy-900 uppercase tracking-wider mb-5">More Articles</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {rest.map((post, i) => (
                      <PostCard key={post.slug} post={post} idx={i + 1} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="font-display text-sm font-bold text-navy-900 uppercase tracking-wider mb-4">Browse By Topic</h3>
                <div className="space-y-1.5">
                  {ALL_CATEGORIES.map((cat) => {
                    const count = posts.filter((p) => p.category === cat).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-all ${
                          activeCategory === cat
                            ? 'bg-navy-900 text-white'
                            : 'text-navy-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cat}</span>
                        <span className={`text-xs font-bold ${activeCategory === cat ? 'text-white/60' : 'text-slate-400'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-navy-900 p-6 text-center">
                <BookOpen className="h-8 w-8 text-gold-400 mx-auto mb-3" />
                <h3 className="font-display text-base font-bold text-white mb-2">Know Before You Go</h3>
                <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                  Browse verified properties with full intelligence reports.
                </p>
                <Link href="/properties" className="btn-gold !text-xs !py-2.5 w-full">
                  Browse Properties
                </Link>
              </div>

              <div>
                <h3 className="font-display text-sm font-bold text-navy-900 uppercase tracking-wider mb-3">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(posts.flatMap((p) => p.tags))).slice(0, 16).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearch(tag)}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 transition-colors capitalize"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
