'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Clock, Tag, CheckCircle, AlertTriangle, Lightbulb,
  BookOpen, Play, Share2,
} from 'lucide-react';
import {
  getPublishedBlogPost,
  getPublishedBlogPosts,
  CATEGORY_COLORS,
  type BlogPostView,
} from '@/lib/blogs';
import type { BlogSection } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// ─── Section renderers ────────────────────────────────────────────────────────

function renderSection(section: BlogSection, idx: number) {
  switch (section.type) {
    case 'paragraph':
      return (
        <p key={idx} className="text-slate-700 leading-relaxed text-[15px]">
          {section.text}
        </p>
      );

    case 'heading':
      return (
        <h2 key={idx} className="font-display text-lg font-bold text-navy-900 mt-2">
          {section.text}
        </h2>
      );

    case 'list':
      return (
        <ul key={idx} className="space-y-2.5">
          {section.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-veriq-secondary flex-shrink-0 mt-0.5" />
              <span className="text-slate-700 text-[15px] leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'callout':
      const variants = {
        warning: { cls: 'bg-red-50 border-red-200', icon: AlertTriangle, iconCls: 'text-red-500' },
        tip: { cls: 'bg-emerald-50 border-emerald-200', icon: Lightbulb, iconCls: 'text-emerald-600' },
        info: { cls: 'bg-blue-50 border-blue-200', icon: BookOpen, iconCls: 'text-blue-500' },
      };
      const v = variants[section.variant ?? 'info'];
      const Icon = v.icon;
      return (
        <div key={idx} className={`rounded-xl border ${v.cls} px-5 py-4 flex items-start gap-3`}>
          <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${v.iconCls}`} />
          <p className="text-sm leading-relaxed text-slate-700">{section.text}</p>
        </div>
      );

    case 'youtube':
      return (
        <div key={idx} className="rounded-2xl overflow-hidden aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${section.youtubeId}?rel=0`}
            title="Embedded video"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );

    default:
      return null;
  }
}

// ─── Gradient pool ────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostView | null>(null);
  const [related, setRelated] = useState<BlogPostView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([getPublishedBlogPost(slug), getPublishedBlogPosts()])
      .then(([current, posts]) => {
        if (!mounted) return;
        setPost(current);
        setRelated(
          current
            ? posts
                .filter((p) => p.slug !== slug && (p.category === current.category || p.tags.some((t) => current.tags.includes(t))))
                .slice(0, 3)
            : [],
        );
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-24">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-navy-900 mb-2">Article Not Found</h1>
          <p className="text-slate-500 mb-6">This article may have been moved or removed.</p>
          <Link href="/blog" className="btn-primary">Back to Blog</Link>
        </div>
      </div>
    );
  }

  const gradient = COVER_GRADIENTS[0];

  const publishDate = new Date(post.publishedAt).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: post.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Cover hero ── */}
      <div className={`relative h-64 sm:h-80 bg-gradient-to-br ${gradient} pt-16 overflow-hidden`}>
        {post.coverImage && (
          <img src={post.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/30" />
        {post.youtubeId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <a
              href={`https://youtube.com/watch?v=${post.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all"
            >
              <Play className="h-7 w-7 text-white ml-1" />
            </a>
          </div>
        )}
        <div className="absolute bottom-6 left-0 right-0 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <span className={`inline-block mb-3 rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_COLORS[post.category]}`}>
              {post.category}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
              {post.title}
            </h1>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">

          {/* ── Main content ── */}
          <article className="lg:col-span-2">
            {/* Back + meta */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-veriq-muted hover:text-navy-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Blog
              </Link>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {post.readTime} min read
                </span>
                <span>{publishDate}</span>
                <button
                  onClick={share}
                  className="flex items-center gap-1 text-veriq-secondary hover:text-veriq-secondary/80 font-semibold transition-colors"
                >
                  <Share2 className="h-3 w-3" /> Share
                </button>
              </div>
            </div>

            {/* Excerpt */}
            <p className="text-base text-slate-600 leading-relaxed border-l-4 border-veriq-secondary pl-4 mb-8 italic">
              {post.excerpt}
            </p>

            {/* Inline YouTube embed if post has one */}
            {post.youtubeId && (
              <div className="rounded-2xl overflow-hidden aspect-video mb-8">
                <iframe
                  src={`https://www.youtube.com/embed/${post.youtubeId}?rel=0`}
                  title={post.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Body sections */}
            <div className="space-y-6">
              {post.content.map((section, idx) => renderSection(section, idx))}
            </div>

            {/* Tags */}
            <div className="mt-10 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog?q=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 transition-colors capitalize"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Veriq CTA */}
            <div className="mt-10 rounded-2xl bg-navy-900 p-6">
              <p className="font-display text-base font-bold text-white mb-1">Know Before You Go</p>
              <p className="text-slate-400 text-sm mb-4">
                Browse verified property listings with detailed intelligence reports — electricity, flood risk, road access, and more.
              </p>
              <Link href="/properties" className="btn-gold !text-sm inline-flex">
                Browse Verified Properties
              </Link>
            </div>
          </article>

          {/* ── Sidebar ── */}
          <aside className="space-y-8">
            {/* About Veriq */}
            <div className="card p-5">
              <h3 className="font-display text-sm font-bold text-navy-900 mb-3">About Veriq Property</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Veriq Property is a trust-focused property intelligence platform. We verify listings, publish detailed environmental and condition reports, and connect users with accountable agents.
              </p>
              <p className="text-xs font-bold text-veriq-secondary mt-3">Know Before You Go.</p>
            </div>

            {/* Related articles */}
            {related.length > 0 && (
              <div>
                <h3 className="font-display text-sm font-bold text-navy-900 uppercase tracking-wider mb-4">Related Articles</h3>
                <div className="space-y-4">
                  {related.map((rel, i) => (
                    <Link key={rel.slug} href={`/blog/${rel.slug}`} className="group flex items-start gap-3">
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${COVER_GRADIENTS[i % COVER_GRADIENTS.length]} flex-shrink-0`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-navy-900 leading-snug line-clamp-2 group-hover:text-veriq-secondary transition-colors">
                          {rel.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {rel.readTime} min
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter teaser */}
            <div className="rounded-2xl bg-veriq-surface border border-slate-200 p-5">
              <BookOpen className="h-6 w-6 text-veriq-secondary mb-3" />
              <h3 className="font-display text-sm font-bold text-navy-900 mb-2">More Property Intelligence</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Our blog publishes new guides every week — inspection tips, location reviews, and scam awareness.
              </p>
              <Link href="/blog" className="btn-primary !text-xs !py-2 w-full text-center">
                Read More Articles
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
