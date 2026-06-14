'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Edit, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError, blogsApi } from '@/lib/api';
import { uploadToFileService } from '@/lib/upload';
import { ALL_CATEGORIES } from '@/lib/blogs';
import type { BlogPost, BlogPostStatus, UpsertBlogPostDto } from '@/types';
import { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

const EMPTY_FORM: UpsertBlogPostDto = {
  slug: '',
  title: '',
  excerpt: '',
  category: 'Renting Tips',
  readTime: 5,
  publishedAt: new Date().toISOString().slice(0, 10),
  coverImage: '',
  youtubeId: '',
  content: [{ type: 'paragraph', text: '' }],
  tags: [],
  status: 'draft',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractYoutubeId(value?: string) {
  const raw = value?.trim();
  if (!raw) return '';
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&/]+)/,
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/shorts\/([^?&/]+)/,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1];
  }
  return raw;
}

export default function AdminBlogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<UpsertBlogPostDto>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contentJson, setContentJson] = useState(JSON.stringify(EMPTY_FORM.content, null, 2));
  const [tagText, setTagText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== UserRole.ADMIN) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await blogsApi.listAdmin();
      setPosts(res.data);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to load blog posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === UserRole.ADMIN) {
      load();
    }
  }, [authLoading, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    total: posts.length,
    published: posts.filter((post) => post.status === 'published').length,
    draft: posts.filter((post) => post.status !== 'published').length,
  }), [posts]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTagText('');
    setContentJson(JSON.stringify(EMPTY_FORM.content, null, 2));
  };

  const editPost = (post: BlogPost) => {
    setEditingId(post.id ?? null);
    setForm({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      readTime: post.readTime,
      publishedAt: post.publishedAt ? post.publishedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      coverImage: post.coverImage ?? '',
      youtubeId: post.youtubeId ?? '',
      content: post.content,
      tags: post.tags,
      status: post.status ?? 'draft',
    });
    setTagText(post.tags.join(', '));
    setContentJson(JSON.stringify(post.content, null, 2));
  };

  const uploadCover = async (file?: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadToFileService(file);
      setForm((prev) => ({ ...prev, coverImage: uploaded.url }));
      success('Cover uploaded');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Cover upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const content = JSON.parse(contentJson || '[]');
      if (!Array.isArray(content)) throw new Error('Content JSON must be an array');
      const payload: UpsertBlogPostDto = {
        ...form,
        slug: slugify(form.slug || form.title),
        readTime: Number(form.readTime ?? 5),
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
        coverImage: form.coverImage?.trim() || undefined,
        youtubeId: extractYoutubeId(form.youtubeId) || undefined,
        content,
        tags: tagText.split(',').map((tag) => tag.trim()).filter(Boolean),
      };

      const res = editingId
        ? await blogsApi.update(editingId, payload)
        : await blogsApi.create(payload);

      setPosts((prev) => {
        const without = prev.filter((post) => post.id !== res.data.id);
        return [res.data, ...without];
      });
      success(editingId ? 'Blog post updated' : 'Blog post created');
      resetForm();
    } catch (err) {
      toastError(err instanceof SyntaxError ? 'Content must be valid JSON' : err instanceof Error ? err.message : 'Failed to save blog post');
    } finally {
      setIsSaving(false);
    }
  };

  const deletePost = async (post: BlogPost) => {
    if (!post.id || !window.confirm(`Delete "${post.title}"?`)) return;
    try {
      await blogsApi.delete(post.id);
      setPosts((prev) => prev.filter((item) => item.id !== post.id));
      success('Blog post deleted');
      if (editingId === post.id) resetForm();
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to delete post');
    }
  };

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.ADMIN) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Blog Manager</h1>
          <p className="text-sm text-veriq-muted">Create and publish Veriq blog articles.</p>
        </div>
        <button type="button" onClick={load} disabled={isLoading} className="btn-secondary !py-2.5 !text-sm">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-xs text-slate-500">Total</p><p className="text-2xl font-black text-navy-900">{stats.total}</p></div>
        <div className="card p-5"><p className="text-xs text-slate-500">Published</p><p className="text-2xl font-black text-emerald-600">{stats.published}</p></div>
        <div className="card p-5"><p className="text-xs text-slate-500">Drafts</p><p className="text-2xl font-black text-amber-600">{stats.draft}</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-navy-900">
              <BookOpen className="h-4 w-4 text-veriq-secondary" />
              Posts
            </h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center text-sm text-veriq-muted">No blog posts yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {posts.map((post) => (
                <div key={post.id ?? post.slug} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${post.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {post.status}
                      </span>
                      <span className="text-[11px] text-slate-400">{post.category}</span>
                    </div>
                    <p className="font-semibold text-navy-900">{post.title}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">{post.excerpt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.status === 'published' && (
                      <Link href={`/blog/${post.slug}`} target="_blank" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-slate-50">
                        View
                      </Link>
                    )}
                    <button type="button" onClick={() => editPost(post)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => deletePost(post)} className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={save} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-navy-900">
              {editingId ? 'Edit Post' : 'New Post'}
            </h2>
            {editingId ? (
              <button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            ) : (
              <Plus className="h-4 w-4 text-veriq-secondary" />
            )}
          </div>

          <div>
            <label className="label">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value, slug: prev.slug || slugify(e.target.value) }))}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Slug</label>
            <input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))} className="input" required />
          </div>
          <div>
            <label className="label">Excerpt</label>
            <textarea value={form.excerpt} onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))} className="input min-h-[90px] resize-y" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} className="input">
                {ALL_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as BlogPostStatus }))} className="input">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Read Time</label>
              <input type="number" min={1} value={form.readTime ?? 5} onChange={(e) => setForm((prev) => ({ ...prev, readTime: Number(e.target.value) }))} className="input" />
            </div>
            <div>
              <label className="label">Publish Date</label>
              <input type="date" value={form.publishedAt ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, publishedAt: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Cover Image</label>
            <div className="flex gap-2">
              <input value={form.coverImage ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, coverImage: e.target.value }))} className="input" placeholder="https://..." />
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 px-3 text-navy-700 hover:border-veriq-secondary">
                {isUploading ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
                <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => uploadCover(e.target.files?.[0])} />
              </label>
            </div>
          </div>
          <div>
            <label className="label">YouTube Link or ID</label>
            <input value={form.youtubeId ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, youtubeId: e.target.value }))} className="input" placeholder="https://youtu.be/... or video ID" />
          </div>
          <div>
            <label className="label">Tags</label>
            <input value={tagText} onChange={(e) => setTagText(e.target.value)} className="input" placeholder="renting, safety, Port Harcourt" />
          </div>
          <div>
            <label className="label">Content JSON</label>
            <textarea value={contentJson} onChange={(e) => setContentJson(e.target.value)} className="input min-h-[220px] resize-y font-mono text-xs" />
            <p className="mt-1 text-[11px] text-slate-400">Use sections: paragraph, heading, list, callout, youtube.</p>
          </div>
          <button type="submit" disabled={isSaving} className="btn-primary w-full justify-center !py-2.5 !text-sm">
            {isSaving && <LoadingSpinner size="sm" />}
            {editingId ? 'Save Changes' : 'Create Post'}
          </button>
        </form>
      </div>
    </div>
  );
}
