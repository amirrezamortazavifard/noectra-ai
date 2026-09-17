'use client';

import { cn } from '@/lib/utils';
import {
  BookOpenText,
  Home,
  MessageSquare,
  Search,
  FileText,
  Plus,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';
import React, { type ReactNode } from 'react';
import Layout from './Layout';
import SettingsButton from './Settings/SettingsButton';

const VerticalIconContainer = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col items-center w-full space-y-3">{children}</div>;
};

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const segments = useSelectedLayoutSegments();

  const navLinks = [
    {
      icon: Home,
      href: '/',
      active: segments.length === 0,
      label: 'Home',
    },
    {
      icon: MessageSquare,
      href: '/chat',
      active: segments.includes('chat') || segments.includes('c'),
      label: 'Chat',
    },
    {
      icon: Search,
      href: '/discover',
      active: segments.includes('discover'),
      label: 'Discover',
    },
    {
      icon: FileText,
      href: '/pdf',
      active: segments.includes('pdf'),
      label: 'PDF',
    },
    {
      icon: BookOpenText,
      href: '/library',
      active: segments.includes('library'),
      label: 'Library',
    },
  ];

  return (
    <div className="relative min-h-screen">
      <aside className="hidden lg:fixed lg:inset-y-3 lg:left-3 lg:z-50 lg:flex lg:w-14 lg:flex-col">
        <div className="relative flex grow flex-col items-center justify-between py-4 px-1.5 rounded-[24px] bg-white/70 dark:bg-[#0c1017]/75 backdrop-blur-[24px] border border-black/[0.06] dark:border-white/[0.06] shadow-[0_16px_40px_rgba(0,0,0,0.3),0_0_1px_rgba(255,255,255,0.06)] overflow-hidden transition-colors duration-300">
          <div
            className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full opacity-35 dark:opacity-50 blur-xl"
            style={{
              background: 'radial-gradient(circle, rgba(79,195,247,0.2) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10 pt-1">
            <Link
              href="/chat"
              title="New Chat"
              className="group flex items-center justify-center w-10 h-10 rounded-2xl bg-black/[0.04] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] text-black/60 dark:text-[rgba(255,255,255,0.6)] hover:text-black dark:hover:text-[#4FC3F7] hover:border-black/20 dark:hover:border-[#4FC3F7]/40 hover:bg-black/[0.08] dark:hover:bg-[#4FC3F7]/10 hover:shadow-[0_0_18px_rgba(79,195,247,0.25)] transition-all duration-300 active:scale-95"
            >
              <Plus
                size={17}
                strokeWidth={1.75}
                className="transition-transform duration-300 group-hover:rotate-90"
              />
              </Link>
          </div>

          <nav className="relative z-10 w-full">
            <VerticalIconContainer>
              {navLinks.map((link, i) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={i}
                    href={link.href}
                    title={link.label}
                    className={cn(
                      'group relative flex flex-col items-center justify-center w-full py-1.5 transition-all duration-200',
                      link.active
                        ? 'text-black dark:text-[#4FC3F7]'
                        : 'text-black/45 dark:text-[rgba(255,255,255,0.45)] hover:text-black/85 dark:hover:text-[rgba(255,255,255,0.85)]',
                    )}
                  >
                    {link.active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#4FC3F7] shadow-[0_0_10px_rgba(79,195,247,0.8)]" />
                    )}

                    <div
                      className={cn(
                        'relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300',
                        link.active
                          ? 'bg-black/[0.06] dark:bg-[#4FC3F7]/[0.10] border border-black/[0.08] dark:border-[#4FC3F7]/25 shadow-[0_0_14px_rgba(79,195,247,0.15)]'
                          : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.03] border border-transparent hover:border-black/[0.05] dark:hover:border-white/[0.05]',
                      )}
                    >
                      <Icon
                        size={18}
                        strokeWidth={link.active ? 2 : 1.5}
                        className={cn(
                          'transition-all duration-200',
                          !link.active && 'group-hover:scale-110',
                          link.active && 'drop-shadow-[0_0_8px_rgba(79,195,247,0.4)]',
                        )}
                      />
                    </div>

                    <span
                      className={cn(
                        'text-[8.5px] tracking-wider uppercase font-medium mt-1 transition-colors duration-200',
                        link.active
                          ? 'text-black/90 dark:text-[#4FC3F7] font-semibold'
                          : 'text-black/45 dark:text-[rgba(255,255,255,0.45)] group-hover:text-black/80 dark:group-hover:text-[rgba(255,255,255,0.85)]',
                      )}
                    >
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </VerticalIconContainer>
          </nav>

          <div className="relative z-10 flex flex-col items-center gap-2.5 pb-1">
            <SettingsButton />

            <div
              className="group relative cursor-pointer"
              title="Account"
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black/[0.05] dark:bg-[#121622] border border-black/[0.08] dark:border-white/[0.08] text-black/60 dark:text-[rgba(255,255,255,0.75)] text-xs font-semibold shadow-inner group-hover:border-[#4FC3F7]/50 group-hover:shadow-[0_0_14px_rgba(79,195,247,0.3)] transition-all duration-300">
                <User size={14} strokeWidth={1.5} />
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#4FC3F7] border-2 border-white dark:border-[#0c1017] shadow-[0_0_6px_rgba(79,195,247,0.9)]" />
            </div>
          </div>
        </div>
      </aside>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xs px-3 py-2 rounded-full bg-white/75 dark:bg-[#0c1017]/80 backdrop-blur-[24px] border border-black/[0.06] dark:border-white/[0.07] shadow-[0_12px_40px_rgba(0,0,0,0.35),0_0_1px_rgba(255,255,255,0.06)] flex items-center justify-around lg:hidden">
        {navLinks.map((link, i) => {
          const Icon = link.icon;
          return (
            <Link
              href={link.href}
              key={i}
              className={cn(
                'relative flex flex-col items-center justify-center px-2.5 py-1 rounded-full transition-all duration-200',
                link.active
                  ? 'text-black dark:text-[#4FC3F7] bg-black/[0.05] dark:bg-[#4FC3F7]/15 shadow-[0_0_10px_rgba(79,195,247,0.18)]'
                  : 'text-black/45 dark:text-[rgba(255,255,255,0.45)] hover:text-black dark:hover:text-[rgba(255,255,255,0.85)]',
              )}
            >
              <Icon size={17} strokeWidth={link.active ? 2 : 1.5} />
              <span className="text-[8.5px] font-medium mt-0.5">{link.label}</span>
            </Link>
          );
        })}
      </div>

      <Layout>{children}</Layout>
    </div>
  );
};

export default Sidebar;
