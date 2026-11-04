export interface ResolvedSocialFeed {
  isSocial: boolean;
  platform: 'reddit' | 'x' | 'bluesky' | 'hackernews' | 'telegram' | 'youtube' | 'generic';
  platformName: string;
  feedUrl: string;
  originalInput: string;
  suggestedTitle: string;
  iconType: string;
}

export interface PopularSocialPreset {
  id: string;
  name: string;
  handleOrSub: string;
  platform: 'reddit' | 'x' | 'bluesky' | 'hackernews' | 'telegram';
  feedUrl: string;
  category: string;
  description: string;
}

export const POPULAR_SOCIAL_PRESETS: PopularSocialPreset[] = [
  // Reddit Intelligence
  {
    id: 'reddit_ml',
    name: 'r/MachineLearning',
    handleOrSub: 'r/MachineLearning',
    platform: 'reddit',
    feedUrl: 'https://www.reddit.com/r/MachineLearning/hot.rss',
    category: 'AI & Research',
    description: 'Leading community for academic Machine Learning research and paper discussions.',
  },
  {
    id: 'reddit_localllama',
    name: 'r/LocalLLaMA',
    handleOrSub: 'r/LocalLLaMA',
    platform: 'reddit',
    feedUrl: 'https://www.reddit.com/r/LocalLLaMA/hot.rss',
    category: 'Open Source AI',
    description: 'Cutting-edge local open-weights LLMs, quantizations, and inference setups.',
  },
  {
    id: 'reddit_artificial',
    name: 'r/artificial',
    handleOrSub: 'r/artificial',
    platform: 'reddit',
    feedUrl: 'https://www.reddit.com/r/artificial/hot.rss',
    category: 'AI News',
    description: 'Broad artificial intelligence developments, ethics, and industry updates.',
  },
  {
    id: 'reddit_technology',
    name: 'r/technology',
    handleOrSub: 'r/technology',
    platform: 'reddit',
    feedUrl: 'https://www.reddit.com/r/technology/hot.rss',
    category: 'Tech News',
    description: 'Global technology breakthroughs, industry regulation, and hardware.',
  },
  {
    id: 'reddit_science',
    name: 'r/science',
    handleOrSub: 'r/science',
    platform: 'reddit',
    feedUrl: 'https://www.reddit.com/r/science/hot.rss',
    category: 'Science',
    description: 'Peer-reviewed research and discussions across natural & medical sciences.',
  },

  // Hacker News
  {
    id: 'hn_frontpage',
    name: 'Hacker News Front Page',
    handleOrSub: 'news.ycombinator.com',
    platform: 'hackernews',
    feedUrl: 'https://news.ycombinator.com/rss',
    category: 'Engineering & Startups',
    description: 'Silicon Valley, startup breakthroughs, and hacker community curation.',
  },

  // Bluesky Academic & AI
  {
    id: 'bsky_nature',
    name: 'Nature News (Bluesky)',
    handleOrSub: 'nature.com',
    platform: 'bluesky',
    feedUrl: 'https://bsky.app/profile/nature.com/rss',
    category: 'Science & Medicine',
    description: 'Official journal news and breakthroughs streamed via Bluesky.',
  },

  // X / Twitter AI Pioneers (via Nitter / Public RSS)
  {
    id: 'x_openai',
    name: 'OpenAI Updates (X)',
    handleOrSub: 'OpenAI',
    platform: 'x',
    feedUrl: 'https://nitter.poast.org/OpenAI/rss',
    category: 'AI Frontiers',
    description: 'Official announcements and research releases from OpenAI.',
  },
  {
    id: 'x_ylecun',
    name: 'Yann LeCun (X)',
    handleOrSub: 'ylecun',
    platform: 'x',
    feedUrl: 'https://nitter.poast.org/ylecun/rss',
    category: 'AI Research',
    description: 'Perspectives on World Models, open science, and foundation models.',
  },
];

/**
 * Automatically inspects any user input and converts social handles/URLs
 * into compliant, high-speed RSS/Atom feeds.
 */
export function resolveSocialInput(input: string): ResolvedSocialFeed {
  const clean = input.trim();

  // 1. Reddit Subreddit (e.g. r/technology, /r/MachineLearning, https://reddit.com/r/science)
  const redditSubMatch = clean.match(/(?:https?:\/\/(?:www\.)?reddit\.com\/)?r\/([A-Za-z0-9_]+)(?:\/([a-z]+))?/i);
  if (redditSubMatch) {
    const subName = redditSubMatch[1];
    const sort = redditSubMatch[2] || 'hot';
    return {
      isSocial: true,
      platform: 'reddit',
      platformName: 'Reddit',
      feedUrl: `https://www.reddit.com/r/${subName}/${sort}.rss`,
      originalInput: clean,
      suggestedTitle: `Reddit r/${subName}`,
      iconType: 'reddit',
    };
  }

  // Reddit User (e.g. u/username or reddit.com/user/username)
  const redditUserMatch = clean.match(/(?:https?:\/\/(?:www\.)?reddit\.com\/)?(?:u|user)\/([A-Za-z0-9_]+)/i);
  if (redditUserMatch) {
    const username = redditUserMatch[1];
    return {
      isSocial: true,
      platform: 'reddit',
      platformName: 'Reddit User',
      feedUrl: `https://www.reddit.com/user/${username}/.rss`,
      originalInput: clean,
      suggestedTitle: `Reddit u/${username}`,
      iconType: 'reddit',
    };
  }

  // 2. X / Twitter (e.g. x.com/OpenAI, twitter.com/elonmusk)
  const xMatch = clean.match(/(?:https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/)([A-Za-z0-9_]+)(?:\/.*)?/i);
  if (xMatch) {
    const handle = xMatch[1];
    // Exclude common static pages
    if (!['home', 'explore', 'notifications', 'messages', 'settings', 'i', 'search'].includes(handle.toLowerCase())) {
      return {
        isSocial: true,
        platform: 'x',
        platformName: 'X (Twitter)',
        feedUrl: `https://nitter.poast.org/${handle}/rss`,
        originalInput: clean,
        suggestedTitle: `X / @${handle}`,
        iconType: 'x',
      };
    }
  }

  // 3. Bluesky (e.g. bsky.app/profile/nature.com or @handle.bsky.social)
  const bskyMatch = clean.match(/(?:https?:\/\/bsky\.app\/profile\/([A-Za-z0-9._-]+))|^(?:@)?([A-Za-z0-9._-]+\.bsky\.social)$/i);
  if (bskyMatch) {
    const handle = bskyMatch[1] || bskyMatch[2];
    return {
      isSocial: true,
      platform: 'bluesky',
      platformName: 'Bluesky',
      feedUrl: `https://bsky.app/profile/${handle}/rss`,
      originalInput: clean,
      suggestedTitle: `Bluesky @${handle}`,
      iconType: 'bluesky',
    };
  }

  // 4. Hacker News
  if (clean.toLowerCase().includes('news.ycombinator.com') || clean.toLowerCase() === 'hackernews') {
    return {
      isSocial: true,
      platform: 'hackernews',
      platformName: 'Hacker News',
      feedUrl: 'https://news.ycombinator.com/rss',
      originalInput: clean,
      suggestedTitle: 'Hacker News',
      iconType: 'hackernews',
    };
  }

  // 5. Telegram Public Channel (e.g. t.me/durov or telegram.me/channel)
  const telegramMatch = clean.match(/(?:https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\/s?\/?[@]?([A-Za-z0-9_]+))/i);
  if (telegramMatch) {
    const channel = telegramMatch[1];
    return {
      isSocial: true,
      platform: 'telegram',
      platformName: 'Telegram',
      feedUrl: `https://rsshub.app/telegram/channel/${channel}`,
      originalInput: clean,
      suggestedTitle: `Telegram @${channel}`,
      iconType: 'telegram',
    };
  }

  // Generic RSS URL fallback
  return {
    isSocial: false,
    platform: 'generic',
    platformName: 'RSS Feed',
    feedUrl: clean,
    originalInput: clean,
    suggestedTitle: '',
    iconType: 'rss',
  };
}

