'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Megaphone, CheckCircle2, Users, ArrowRight, Share2, Check, MessageSquare } from 'lucide-react';
import { formatSubscriberCount } from '@/lib/channelUtils';

export default function ChannelLandingPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    async function loadChannel() {
      try {
        setLoading(true);
        const res = await fetch(`/api/channels/slug/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Channel not found or does not exist.');
          } else {
            setError('Failed to load channel details.');
          }
          return;
        }
        const data = await res.json();
        setChannel(data.channel);
      } catch (err) {
        console.error('Channel fetch error:', err);
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }
    loadChannel();
  }, [slug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard fallback
    }
  };

  const handleOpenChannel = () => {
    if (channel?.id) {
      router.push(`/chat?channelId=${channel.id}`);
    } else {
      router.push('/chat');
    }
  };

  return (
    <div className="min-h-screen bg-[#111b21] text-[#e9edef] flex flex-col items-center justify-between p-4 selection:bg-[#00a884]/30">
      {/* Top Navigation */}
      <header className="w-full max-w-4xl py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <MessageSquare className="w-5 h-5 fill-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-white">WebChat</span>
        </Link>
        <button
          onClick={handleOpenChannel}
          className="text-xs sm:text-sm font-medium text-[#00a884] hover:text-[#008f6f] px-3.5 py-1.5 rounded-lg border border-[#00a884]/30 hover:bg-[#00a884]/10 transition-colors"
        >
          Open WebChat
        </button>
      </header>

      {/* Main Channel Preview Card */}
      <main className="w-full max-w-md my-auto py-8">
        <div className="bg-[#202c33] rounded-2xl p-6 sm:p-8 border border-[#313d45] shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
          {/* Decorative subtle ambient glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00a884]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#00a884]/10 rounded-full blur-3xl pointer-events-none" />

          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-[#00a884] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#8696a0]">Loading broadcast channel...</p>
            </div>
          ) : error ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
                <Megaphone className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-semibold text-white">Channel Unavailable</h2>
              <p className="text-xs text-[#8696a0] max-w-xs">{error}</p>
              <Link
                href="/chat"
                className="mt-4 px-5 py-2 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white font-medium text-xs transition-colors"
              >
                Go to WebChat
              </Link>
            </div>
          ) : (
            <>
              {/* Channel Avatar */}
              <div className="relative mb-4">
                {channel.avatarUrl ? (
                  <img
                    src={channel.avatarUrl}
                    alt={channel.title}
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#00a884] shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00a884] to-[#005c4b] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {channel.title.charAt(0).toUpperCase()}
                  </div>
                )}
                {channel.isVerified && (
                  <div className="absolute bottom-0 right-0 bg-[#202c33] p-1 rounded-full">
                    <CheckCircle2 className="w-5 h-5 text-[#00a884] fill-[#00a884]/20" />
                  </div>
                )}
              </div>

              {/* Channel Title & Slug */}
              <div className="flex items-center gap-1.5 justify-center mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {channel.title}
                </h1>
                {channel.isVerified && (
                  <CheckCircle2 className="w-5 h-5 text-[#00a884] shrink-0" />
                )}
              </div>
              <p className="text-xs text-[#00a884] font-medium mb-3">
                @{channel.publicSlug || slug}
              </p>

              {/* Follower Count */}
              <div className="flex items-center gap-1.5 text-xs text-[#8696a0] bg-[#111b21] px-3 py-1 rounded-full mb-4">
                <Users className="w-3.5 h-3.5 text-[#00a884]" />
                <span>{formatSubscriberCount(channel.subscriberCount)} followers</span>
              </div>

              {/* Description */}
              {channel.description && (
                <p className="text-xs sm:text-sm text-[#d1d7db] line-clamp-4 leading-relaxed mb-6 max-w-sm">
                  {channel.description}
                </p>
              )}

              {/* Action Buttons */}
              <div className="w-full space-y-2.5">
                <button
                  onClick={handleOpenChannel}
                  className="w-full py-3 px-4 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 group"
                >
                  <span>{channel.isSubscribed ? 'Open Channel' : 'Follow in WebChat'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={handleCopyLink}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#111b21] hover:bg-[#182229] border border-[#313d45] text-[#d1d7db] font-medium text-xs transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#00a884]" />
                      <span className="text-[#00a884]">Link copied to clipboard</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-[#8696a0]" />
                      <span>Share Channel</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl py-4 text-center text-xs text-[#8696a0]">
        Powered by WebChat &bull; Enterprise Broadcast Channels &bull; Zero SMS / Phone Friction
      </footer>
    </div>
  );
}
