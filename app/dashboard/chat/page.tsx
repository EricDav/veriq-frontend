'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, Send, Home, Inbox, RefreshCw } from 'lucide-react';
import { chatApi, ApiError } from '@/lib/api';
import type { ChatConversation, ChatMessage } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getAccessToken } from '@/lib/auth';

function initials(name?: string | null) {
  return name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
}

function formatTime(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export default function ChatPage() {
  const params = useSearchParams();
  const requestedConversationId = params.get('conversation');
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(requestedConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations],
  );

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingConversations(true);
    try {
      const res = await chatApi.conversations();
      setConversations(res.data);
      setActiveId((current) => current ?? requestedConversationId ?? res.data[0]?.id ?? null);
    } catch (err) {
      if (!silent) toastError(err instanceof ApiError ? err.message : 'Failed to load chats');
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, [requestedConversationId, toastError]);

  const loadMessages = useCallback(async (conversationId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await chatApi.messages(conversationId);
      setMessages(res.data.messages);
      setConversations((items) =>
        items.map((item) => (item.id === conversationId ? { ...item, unread: 0 } : item)),
      );
    } catch (err) {
      if (!silent) toastError(err instanceof ApiError ? err.message : 'Failed to load messages');
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [toastError]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const events = new EventSource(chatApi.eventsUrl(token));
    const refresh = () => {
      loadConversations(true);
      if (activeId) loadMessages(activeId, true);
    };

    events.addEventListener('message', refresh);
    events.addEventListener('unread', refresh);

    return () => {
      events.removeEventListener('message', refresh);
      events.removeEventListener('unread', refresh);
      events.close();
    };
  }, [activeId, loadConversations, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, activeId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!activeId || !body) return;
    setSending(true);
    try {
      const res = await chatApi.sendMessage(activeId, body);
      setMessages((items) => [...items, res.data]);
      setDraft('');
      await loadConversations(true);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const showMobileList = !activeConversation;

  return (
    <div className="mx-auto flex h-[calc(100dvh-6.5rem)] max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:h-[calc(100vh-7rem)] lg:flex-row">
      <aside className={`${showMobileList ? 'flex' : 'hidden'} min-h-0 w-full flex-col border-b border-slate-200 lg:flex lg:w-80 lg:border-b-0 lg:border-r`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div>
            <h1 className="font-display text-lg font-bold text-navy-900">Chats</h1>
            <p className="text-xs text-veriq-muted">Live property conversations</p>
          </div>
          <button type="button" onClick={() => loadConversations()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Refresh chats">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div>
          ) : conversations.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center px-6 text-center">
              <Inbox className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-navy-900">No conversations yet</p>
              <p className="mt-1 text-xs text-veriq-muted">Unlock a report and start an in-app chat with the agent.</p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const active = conversation.id === activeId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveId(conversation.id)}
                  className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors ${active ? 'bg-veriq-secondary/5' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-veriq-secondary text-xs font-bold text-white">
                      {initials(conversation.otherParticipant?.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-navy-900">{conversation.otherParticipant?.name ?? 'Conversation'}</p>
                        {conversation.unread > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-veriq-secondary px-1.5 text-[10px] font-bold text-white">
                            {conversation.unread}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-veriq-muted">{conversation.property?.title ?? 'Property chat'}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">{conversation.lastMessagePreview ?? 'No messages yet'}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className={`${activeConversation ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col lg:flex`}>
        {activeConversation ? (
          <>
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                  aria-label="Back to chats"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                  {initials(activeConversation.otherParticipant?.name)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-navy-900">{activeConversation.otherParticipant?.name}</h2>
                  <p className="flex items-center gap-1 truncate text-xs text-veriq-muted">
                    <Home className="h-3 w-3" /> {activeConversation.property?.title}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-veriq-surface px-4 py-5">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center"><LoadingSpinner /></div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageCircle className="mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm font-semibold text-navy-900">Start the conversation</p>
                  <p className="mt-1 text-xs text-veriq-muted">Ask about inspection times, availability, or next steps.</p>
                </div>
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-3">
                  {messages.map((message) => {
                    const mine = message.senderId === user?.id;
                    return (
                      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 sm:max-w-[78%] ${mine ? 'bg-veriq-secondary text-white' : 'bg-white text-navy-900 shadow-sm'}`}>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                          <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>{formatTime(message.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <form onSubmit={send} className="border-t border-slate-100 bg-white p-3 sm:p-4">
              <div className="mx-auto flex max-w-3xl items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={1}
                  className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-veriq-secondary focus:ring-2 focus:ring-veriq-secondary/10"
                  placeholder="Type your message..."
                />
                <button type="submit" disabled={sending || !draft.trim()} className="btn-primary flex h-11 shrink-0 items-center gap-2 !px-3 !py-0 disabled:opacity-60 sm:!px-5">
                  {sending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MessageCircle className="mb-4 h-12 w-12 text-slate-300" />
            <h2 className="font-display text-lg font-bold text-navy-900">Select a chat</h2>
            <p className="mt-1 max-w-sm text-sm text-veriq-muted">Your property conversations and real-time notifications will appear here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
