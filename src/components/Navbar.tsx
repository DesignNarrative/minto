'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mic, Wifi, WifiOff, Lock, User, LogOut, CheckCircle2 } from 'lucide-react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase-browser';

interface NavbarProps {
  wakeLockActive?: boolean;
}

export default function Navbar({ wakeLockActive = false }: NavbarProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const configured = isSupabaseConfigured();
    setSupabaseReady(configured);

    if (configured) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setUser(session?.user || null);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            setUser(session?.user || null);
          }
        );

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          authListener?.subscription.unsubscribe();
        };
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignIn = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      alert('To enable Google Login, please add your Supabase credentials to .env.local.');
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-red-600 to-amber-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white">
              Minto
            </span>
            <span className="text-xs px-1.5 py-0.5 ml-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
              v1.0
            </span>
          </div>
        </Link>

        {/* Status badges & User Auth */}
        <div className="flex items-center gap-3">
          {/* Wake Lock Active Indicator */}
          {wakeLockActive && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Lock className="w-3.5 h-3.5" />
              <span>Screen Awake</span>
            </div>
          )}

          {/* Network Status */}
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 animate-pulse'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline (Queuing)</span>
              </>
            )}
          </div>

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {user.email ? user.email.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-800 dark:text-zinc-200"
            >
              <User className="w-3.5 h-3.5" />
              <span>{supabaseReady ? 'Sign in with Google' : 'Guest Mode'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
