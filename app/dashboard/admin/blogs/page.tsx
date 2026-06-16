'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Archive,
  Bold,
  BookOpen,
  CalendarClock,
  Code2,
  Edit,
  Eye,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Search,
  Strikethrough,
  Table,
  Tags,
  Trash2,
  Underline,
  Upload,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError, blogsApi } from '@/lib/api';
import { uploadToFileService } from '@/lib/upload';
import { ALL_CATEGORIES } from '@/lib/blogs';
import type { BlogPost, BlogPostStatus, UpsertBlogPostDto } from '@/types';
import { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM: UpsertBlogPostDto = {
  slug: '',
  title: '',
  excerpt: '',
  category: 'Renting Tips',
  authorName: 'Veriq Editorial Team',
  authorAvatar: '',
  readTime: 5,
  publishedAt: today(),
  scheduledAt: '',
  coverImage: '',
  youtubeId: '',
  content: [],
  contentHtml: '<h2>Start with a strong opening</h2><p>Write your article here...</p>',
  tags: [],
  seoTitle: '',
  seoDescription: '',
  canonicalUrl: '',
  status: 'draft',
};

const STATUS_OPTIONS: BlogPostStatus[] = ['draft', 'scheduled', 'published', 'archived'];

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

function sectionsToHtml(content: BlogPost['content'] = []) {
  if (!content.length) return EMPTY_FORM.contentHtml ?? '';
  return content
    .map((section) => {
      if (section.type === 'heading') return `<h2>${section.text ?? ''}</h2>`;
      if (section.type === 'list') {
        return `<ul>${(section.items ?? []).map((item) => `<li>${item}</li>`).join('')}</ul>`;
      }
      if (section.type === 'callout') return `<blockquote>${section.text ?? ''}</blockquote>`;
      if (section.type === 'youtube' && section.youtubeId) {
        return `<p><a href="https://youtube.com/watch?v=${section.youtubeId}">YouTube: ${section.youtubeId}</a></p>`;
      }
      return `<p>${section.text ?? ''}</p>`;
    })
    .join('');
}

function statusBadge(status?: BlogPostStatus) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-700';
  if (status === 'scheduled') return 'bg-blue-100 text-blue-700';
  if (status === 'archived') return 'bg-slate-200 text-slate-600';
  return 'bg-amber-100 text-amber-700';
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-veriq-secondary hover:bg-emerald-50 hover:text-veriq-secondary"
    >
      {children}
    </button>
  );
}

export default function AdminBlogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const hasSeededEditor = useRef(false);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<UpsertBlogPostDto>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagText, setTagText] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'write' | 'preview' | 'seo' | 'revisions'>('write');
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
      const res = await blogsApi.listAdmin({
        q: query || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
      });
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

  useEffect(() => {
    if (!hasSeededEditor.current && editorRef.current) {
      editorRef.current.innerHTML = form.contentHtml ?? '';
      hasSeededEditor.current = true;
    }
  }, [form.contentHtml]);

  const currentPost = useMemo(
    () => posts.find((post) => post.id === editingId),
    [posts, editingId],
  );

  const stats = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((post) => post.status === 'published').length,
      scheduled: posts.filter((post) => post.status === 'scheduled').length,
      drafts: posts.filter((post) => post.status === 'draft').length,
    }),
    [posts],
  );

  const wordCount = useMemo(() => {
    const plain = (form.contentHtml ?? '').replace(/<[^>]+>/g, ' ').trim();
    return plain ? plain.split(/\s+/).length : 0;
  }, [form.contentHtml]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTagText('');
    setActiveTab('write');
    if (editorRef.current) editorRef.current.innerHTML = EMPTY_FORM.contentHtml ?? '';
  };

  const syncEditor = () => {
    const html = editorRef.current?.innerHTML ?? '';
    setForm((prev) => (prev.contentHtml === html ? prev : { ...prev, contentHtml: html }));
    return html;
  };

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditor();
  };

  const setBlock = (tag: string) => runCommand('formatBlock', tag);

  const insertLink = () => {
    const url = window.prompt('Paste the link URL');
    if (!url) return;
    runCommand('createLink', url);
  };

  const insertImageByUrl = () => {
    const url = window.prompt('Paste the image URL');
    if (!url) return;
    runCommand('insertImage', url);
  };

  const insertMedia = () => {
    const raw = window.prompt('Paste a YouTube link, embed URL, or iframe code');
    if (!raw) return;
    const id = extractYoutubeId(raw);
    const html = raw.includes('<iframe')
      ? raw
      : `<div class="cms-embed"><iframe src="https://www.youtube.com/embed/${id}" title="Embedded media" allowfullscreen></iframe></div>`;
    runCommand('insertHTML', html);
  };

  const insertTable = () => {
    runCommand(
      'insertHTML',
      '<table><thead><tr><th>Column</th><th>Column</th></tr></thead><tbody><tr><td>Value</td><td>Value</td></tr><tr><td>Value</td><td>Value</td></tr></tbody></table><p></p>',
    );
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadToFileService(file);
      runCommand('insertImage', uploaded.url);
      success('Image inserted');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadCover = async (file?: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadToFileService(file);
      setForm((prev) => ({ ...prev, coverImage: uploaded.url }));
      success('Featured image uploaded');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Featured image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const editPost = (post: BlogPost) => {
    const contentHtml = post.contentHtml || sectionsToHtml(post.content);
    setEditingId(post.id ?? null);
    setForm({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      authorName: post.authorName ?? 'Veriq Editorial Team',
      authorAvatar: post.authorAvatar ?? '',
      readTime: post.readTime,
      publishedAt: post.publishedAt ? post.publishedAt.slice(0, 10) : today(),
      scheduledAt: post.scheduledAt ? post.scheduledAt.slice(0, 16) : '',
      coverImage: post.coverImage ?? '',
      youtubeId: post.youtubeId ?? '',
      content: post.content ?? [],
      contentHtml,
      tags: post.tags,
      seoTitle: post.seoTitle ?? '',
      seoDescription: post.seoDescription ?? '',
      canonicalUrl: post.canonicalUrl ?? '',
      status: post.status ?? 'draft',
    });
    setTagText(post.tags.join(', '));
    setActiveTab('write');
    requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.innerHTML = contentHtml;
    });
  };

  const save = async (e?: React.FormEvent, statusOverride?: BlogPostStatus) => {
    e?.preventDefault();
    const html = editorRef.current?.innerHTML ?? form.contentHtml ?? '';
    const status = statusOverride ?? form.status ?? 'draft';
    setIsSaving(true);
    try {
      const payload: UpsertBlogPostDto = {
        ...form,
        status,
        slug: slugify(form.slug || form.title),
        readTime: Math.max(1, Number(form.readTime ?? (Math.ceil(wordCount / 220) || 5))),
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        coverImage: form.coverImage?.trim() || undefined,
        authorAvatar: form.authorAvatar?.trim() || undefined,
        youtubeId: extractYoutubeId(form.youtubeId) || undefined,
        content: [],
        contentHtml: html,
        tags: tagText.split(',').map((tag) => tag.trim()).filter(Boolean),
        seoTitle: form.seoTitle?.trim() || form.title,
        seoDescription: form.seoDescription?.trim() || form.excerpt,
        canonicalUrl: form.canonicalUrl?.trim() || undefined,
      };

      const res = editingId
        ? await blogsApi.update(editingId, payload)
        : await blogsApi.create(payload);

      setPosts((prev) => {
        const without = prev.filter((post) => post.id !== res.data.id);
        return [res.data, ...without];
      });
      success(status === 'published' ? 'Blog post published' : editingId ? 'Blog post saved' : 'Blog post created');
      editPost(res.data);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to save blog post');
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-veriq-secondary">
            <BookOpen className="h-3.5 w-3.5" />
            Content studio
          </p>
          <h1 className="font-display text-2xl font-bold text-navy-900">Blog Management</h1>
          <p className="text-sm text-veriq-muted">
            Draft, schedule, optimize, preview, and publish editorial content from one workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={resetForm} className="btn-outline !py-2.5 !text-sm">
            <Plus className="h-4 w-4" />
            New post
          </button>
          <button type="button" onClick={load} disabled={isLoading} className="btn-secondary !py-2.5 !text-sm">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card p-4"><p className="text-xs text-slate-500">Total</p><p className="text-2xl font-black text-navy-900">{stats.total}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Published</p><p className="text-2xl font-black text-emerald-600">{stats.published}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Scheduled</p><p className="text-2xl font-black text-blue-600">{stats.scheduled}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Drafts</p><p className="text-2xl font-black text-amber-600">{stats.drafts}</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="card overflow-hidden">
          <div className="space-y-3 border-b border-slate-100 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="input !py-2.5 pl-9" placeholder="Search posts..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BlogPostStatus | 'all')} className="input !py-2.5">
                <option value="all">All status</option>
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input !py-2.5">
                <option value="all">All categories</option>
                {ALL_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <button type="button" onClick={load} className="btn-primary w-full !py-2.5 !text-xs">Apply filters</button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center text-sm text-veriq-muted">No blog posts found.</div>
          ) : (
            <div className="max-h-[760px] divide-y divide-slate-100 overflow-y-auto">
              {posts.map((post) => (
                <button
                  key={post.id ?? post.slug}
                  type="button"
                  onClick={() => editPost(post)}
                  className={`block w-full p-4 text-left transition hover:bg-slate-50 ${editingId === post.id ? 'bg-emerald-50/70' : ''}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(post.status)}`}>
                      {post.status}
                    </span>
                    <span className="truncate text-[11px] text-slate-400">{post.category}</span>
                  </div>
                  <p className="line-clamp-2 text-sm font-bold text-navy-900">{post.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{post.excerpt}</p>
                </button>
              ))}
            </div>
          )}
        </aside>

        <form onSubmit={(event) => save(event)} className="space-y-6">
          <section className="card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-navy-900">{editingId ? 'Edit Article' : 'Create Article'}</h2>
                <p className="text-xs text-slate-500">{wordCount} words · suggested read time {Math.max(1, Math.ceil(wordCount / 220))} min</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingId && form.status === 'published' && (
                  <Link href={`/blog/${form.slug}`} target="_blank" className="btn-outline !py-2.5 !text-xs">
                    <Eye className="h-4 w-4" />
                    Public view
                  </Link>
                )}
                <button type="button" onClick={() => save(undefined, 'draft')} disabled={isSaving} className="btn-outline !py-2.5 !text-xs">
                  <Save className="h-4 w-4" />
                  Save draft
                </button>
                <button type="button" onClick={() => save(undefined, 'published')} disabled={isSaving} className="btn-primary !py-2.5 !text-xs">
                  {isSaving ? <LoadingSpinner size="sm" /> : <CalendarClock className="h-4 w-4" />}
                  Publish
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                      slug: prev.slug || slugify(e.target.value),
                      seoTitle: prev.seoTitle || e.target.value,
                    }))}
                    className="input text-base font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="label">Excerpt</label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      excerpt: e.target.value,
                      seoDescription: prev.seoDescription || e.target.value,
                    }))}
                    className="input min-h-[92px] resize-y"
                    required
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
                    <ToolbarButton title="Bold" onClick={() => runCommand('bold')}><Bold className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Italic" onClick={() => runCommand('italic')}><Italic className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Underline" onClick={() => runCommand('underline')}><Underline className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Strikethrough" onClick={() => runCommand('strikeThrough')}><Strikethrough className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="H1" onClick={() => setBlock('h1')}><Heading1 className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="H2" onClick={() => setBlock('h2')}><Heading2 className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Bullet list" onClick={() => runCommand('insertUnorderedList')}><List className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Numbered list" onClick={() => runCommand('insertOrderedList')}><ListOrdered className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Blockquote" onClick={() => setBlock('blockquote')}><Quote className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Code block" onClick={() => setBlock('pre')}><Code2 className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Align left" onClick={() => runCommand('justifyLeft')}><AlignLeft className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Align center" onClick={() => runCommand('justifyCenter')}><AlignCenter className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Align right" onClick={() => runCommand('justifyRight')}><AlignRight className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Add link" onClick={insertLink}><LinkIcon className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Image URL" onClick={insertImageByUrl}><ImageIcon className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Embed media" onClick={insertMedia}><Video className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Insert table" onClick={insertTable}><Table className="h-4 w-4" /></ToolbarButton>
                    <ToolbarButton title="Text color" onClick={() => runCommand('foreColor', window.prompt('Hex color', '#10B981') || '#10B981')}><Palette className="h-4 w-4" /></ToolbarButton>
                    <label title="Upload inline image" className="inline-grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-veriq-secondary hover:bg-emerald-50 hover:text-veriq-secondary">
                      {isUploading ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
                      <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => uploadImage(e.target.files?.[0])} />
                    </label>
                  </div>

                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={syncEditor}
                    className="cms-editor min-h-[560px] p-6 outline-none"
                  />
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900"><Archive className="h-4 w-4 text-veriq-secondary" /> Publishing</p>
                  <div className="space-y-3">
                    <div>
                      <label className="label">Status</label>
                      <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as BlogPostStatus }))} className="input">
                        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Publish date</label>
                      <input type="date" value={form.publishedAt ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, publishedAt: e.target.value }))} className="input" />
                    </div>
                    <div>
                      <label className="label">Schedule for later</label>
                      <input type="datetime-local" value={form.scheduledAt ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value, status: e.target.value ? 'scheduled' : prev.status }))} className="input" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900"><Tags className="h-4 w-4 text-veriq-secondary" /> Organization</p>
                  <div className="space-y-3">
                    <div>
                      <label className="label">Slug</label>
                      <input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))} className="input" required />
                    </div>
                    <div>
                      <label className="label">Category</label>
                      <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} className="input">
                        {ALL_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Tags</label>
                      <input value={tagText} onChange={(e) => setTagText(e.target.value)} className="input" placeholder="renting, safety, Port Harcourt" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900"><ImageIcon className="h-4 w-4 text-veriq-secondary" /> Media</p>
                  <div className="space-y-3">
                    {form.coverImage && <img src={form.coverImage} alt="" className="h-32 w-full rounded-lg object-cover" />}
                    <div className="flex gap-2">
                      <input value={form.coverImage ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, coverImage: e.target.value }))} className="input" placeholder="Featured image URL" />
                      <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 px-3 text-navy-700 hover:border-veriq-secondary">
                        <Upload className="h-4 w-4" />
                        <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => uploadCover(e.target.files?.[0])} />
                      </label>
                    </div>
                    <input value={form.youtubeId ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, youtubeId: e.target.value }))} className="input" placeholder="Featured YouTube URL or ID" />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900"><UserRound className="h-4 w-4 text-veriq-secondary" /> Author</p>
                  <div className="space-y-3">
                    <input value={form.authorName ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, authorName: e.target.value }))} className="input" placeholder="Author name" />
                    <input value={form.authorAvatar ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, authorAvatar: e.target.value }))} className="input" placeholder="Author avatar URL" />
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
              {(['write', 'preview', 'seo', 'revisions'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    syncEditor();
                    setActiveTab(tab);
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-bold capitalize ${activeTab === tab ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'preview' && (
              <article className="cms-preview mx-auto max-w-3xl p-6">
                {form.coverImage && <img src={form.coverImage} alt="" className="mb-6 h-72 w-full rounded-xl object-cover" />}
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-veriq-secondary">{form.category}</p>
                <h1>{form.title || 'Untitled article'}</h1>
                <p className="lead">{form.excerpt}</p>
                <div dangerouslySetInnerHTML={{ __html: form.contentHtml ?? '' }} />
              </article>
            )}

            {activeTab === 'seo' && (
              <div className="grid gap-5 p-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="label">SEO title</label>
                    <input value={form.seoTitle ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))} className="input" maxLength={180} />
                    <p className="mt-1 text-[11px] text-slate-400">{form.seoTitle?.length ?? 0}/180</p>
                  </div>
                  <div>
                    <label className="label">Meta description</label>
                    <textarea value={form.seoDescription ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, seoDescription: e.target.value }))} className="input min-h-[120px]" maxLength={300} />
                    <p className="mt-1 text-[11px] text-slate-400">{form.seoDescription?.length ?? 0}/300</p>
                  </div>
                  <div>
                    <label className="label">Canonical URL</label>
                    <input value={form.canonicalUrl ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, canonicalUrl: e.target.value }))} className="input" placeholder="https://veriq.ng/blog/article-slug" />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Search preview</p>
                  <p className="text-lg font-semibold text-blue-700">{form.seoTitle || form.title || 'SEO title'}</p>
                  <p className="mt-1 text-xs text-emerald-700">veriq.ng/blog/{form.slug || 'article-slug'}</p>
                  <p className="mt-2 text-sm text-slate-600">{form.seoDescription || form.excerpt || 'Meta description appears here.'}</p>
                </div>
              </div>
            )}

            {activeTab === 'revisions' && (
              <div className="p-6">
                {!currentPost?.revisionHistory?.length ? (
                  <p className="text-sm text-slate-500">Revision history will appear after the first saved update.</p>
                ) : (
                  <div className="space-y-3">
                    {currentPost.revisionHistory.slice().reverse().map((revision, index) => (
                      <div key={index} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-navy-900">Version {String(revision.version ?? currentPost.revisionHistory!.length - index)}</p>
                          <p className="text-xs text-slate-400">{String(revision.savedAt ?? '')}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{String(revision.title ?? 'Untitled')} · {String(revision.status ?? 'draft')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'write' && (
              <div className="flex items-center justify-between gap-3 p-6 text-sm text-slate-500">
                <span>Use the editor above to compose rich articles with images, tables, embeds, links, and formatting.</span>
                {editingId && (
                  <button type="button" onClick={() => deletePost(currentPost!)} className="inline-flex items-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </section>
        </form>
      </div>
    </div>
  );
}
