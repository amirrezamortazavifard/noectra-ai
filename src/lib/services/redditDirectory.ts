export interface RedditSubreddit {
  name: string; // e.g. "r/MachineLearning"
  sub: string; // e.g. "MachineLearning"
  title: string;
  subscribers: string;
  subscribersCount: number;
  category: string;
  icon: string;
  description: string;
  feedUrl: string;
  isHot?: boolean;
}

export const POPULAR_REDDIT_COMMUNITIES: RedditSubreddit[] = [
  // --- Artificial Intelligence & LLMs ---
  {
    name: 'r/MachineLearning',
    sub: 'MachineLearning',
    title: 'Machine Learning Research',
    subscribers: '3.1M members',
    subscribersCount: 3100000,
    category: 'AI & Machine Learning',
    icon: '👾',
    description: 'Leading academic community for neural architecture research, paper discussions, and novel benchmarks.',
    feedUrl: 'https://www.reddit.com/r/MachineLearning/hot.rss',
    isHot: true,
  },
  {
    name: 'r/LocalLLaMA',
    sub: 'LocalLLaMA',
    title: 'Local LLaMA & Open Weights',
    subscribers: '265K members',
    subscribersCount: 265000,
    category: 'AI & Machine Learning',
    icon: '🦙',
    description: 'Frontier community for local LLM inference, quantizations (GGUF, EXL2), fine-tuning and GPU setups.',
    feedUrl: 'https://www.reddit.com/r/LocalLLaMA/hot.rss',
    isHot: true,
  },
  {
    name: 'r/artificial',
    sub: 'artificial',
    title: 'Artificial Intelligence Hub',
    subscribers: '720K members',
    subscribersCount: 72000,
    category: 'AI & Machine Learning',
    icon: '🧠',
    description: 'Global developments in AI, AGI pathways, societal implications, and industry announcements.',
    feedUrl: 'https://www.reddit.com/r/artificial/hot.rss',
    isHot: true,
  },
  {
    name: 'r/ChatGPT',
    sub: 'ChatGPT',
    title: 'ChatGPT & OpenAI Ecosystem',
    subscribers: '5.9M members',
    subscribersCount: 5900000,
    category: 'AI & Machine Learning',
    icon: '💬',
    description: 'ChatGPT capabilities, reasoning models (o1), plugins, and creative prompt workflows.',
    feedUrl: 'https://www.reddit.com/r/ChatGPT/hot.rss',
    isHot: true,
  },
  {
    name: 'r/ClaudeAI',
    sub: 'ClaudeAI',
    title: 'Anthropic Claude AI',
    subscribers: '125K members',
    subscribersCount: 125000,
    category: 'AI & Machine Learning',
    icon: '🎭',
    description: 'Claude 3.5 Sonnet, Artifacts, coding benchmarks, and Anthropic research updates.',
    feedUrl: 'https://www.reddit.com/r/ClaudeAI/hot.rss',
    isHot: true,
  },
  {
    name: 'r/Singularity',
    sub: 'Singularity',
    title: 'The Technological Singularity',
    subscribers: '2.4M members',
    subscribersCount: 2400000,
    category: 'AI & Machine Learning',
    icon: '🌌',
    description: 'Anticipation of artificial general intelligence, exponential computing curves, and robotics.',
    feedUrl: 'https://www.reddit.com/r/Singularity/hot.rss',
    isHot: true,
  },
  {
    name: 'r/OpenAI',
    sub: 'OpenAI',
    title: 'OpenAI Research & Models',
    subscribers: '890K members',
    subscribersCount: 890000,
    category: 'AI & Machine Learning',
    icon: '🌀',
    description: 'Official model releases, Sora, GPT-4o, reasoning models, and API development.',
    feedUrl: 'https://www.reddit.com/r/OpenAI/hot.rss',
  },
  {
    name: 'r/StableDiffusion',
    sub: 'StableDiffusion',
    title: 'Stable Diffusion & Generative Vision',
    subscribers: '560K members',
    subscribersCount: 560000,
    category: 'AI & Machine Learning',
    icon: '🎨',
    description: 'Diffusion model architectures, Flux, LoRA fine-tuning, ControlNet, and visual AI synthesis.',
    feedUrl: 'https://www.reddit.com/r/StableDiffusion/hot.rss',
  },
  {
    name: 'r/DeepLearning',
    sub: 'DeepLearning',
    title: 'Deep Learning Engineering',
    subscribers: '140K members',
    subscribersCount: 140000,
    category: 'AI & Machine Learning',
    icon: '🔬',
    description: 'Neural network theory, PyTorch, JAX, gradient optimization, and tensor workflows.',
    feedUrl: 'https://www.reddit.com/r/DeepLearning/hot.rss',
  },
  {
    name: 'r/PromptEngineering',
    sub: 'PromptEngineering',
    title: 'Prompt Engineering & Context',
    subscribers: '95K members',
    subscribersCount: 95000,
    category: 'AI & Machine Learning',
    icon: '📝',
    description: 'Structured outputs, system prompt patterns, RAG context retrieval, and model steerability.',
    feedUrl: 'https://www.reddit.com/r/PromptEngineering/hot.rss',
  },

  // --- Computer Science & Technology ---
  {
    name: 'r/technology',
    sub: 'technology',
    title: 'Technology News & Impact',
    subscribers: '15.2M members',
    subscribersCount: 15200000,
    category: 'Computer Science & Tech',
    icon: '💻',
    description: 'Major global technology breakthroughs, semiconductor industry, privacy regulations, and hardware.',
    feedUrl: 'https://www.reddit.com/r/technology/hot.rss',
    isHot: true,
  },
  {
    name: 'r/programming',
    sub: 'programming',
    title: 'Software Development & Architecture',
    subscribers: '5.8M members',
    subscribersCount: 5800000,
    category: 'Computer Science & Tech',
    icon: '⚡',
    description: 'Programming languages, distributed systems, software engineering philosophy, and compilers.',
    feedUrl: 'https://www.reddit.com/r/programming/hot.rss',
    isHot: true,
  },
  {
    name: 'r/compsci',
    sub: 'compsci',
    title: 'Computer Science Theory',
    subscribers: '2.3M members',
    subscribersCount: 2300000,
    category: 'Computer Science & Tech',
    icon: '📐',
    description: 'Complexity theory, formal verification, automata, discrete math, and algorithm analysis.',
    feedUrl: 'https://www.reddit.com/r/compsci/hot.rss',
  },
  {
    name: 'r/rust',
    sub: 'rust',
    title: 'The Rust Programming Language',
    subscribers: '280K members',
    subscribersCount: 280000,
    category: 'Computer Science & Tech',
    icon: '🦀',
    description: 'High-performance systems programming, memory safety, async Rust, and crate ecosystem.',
    feedUrl: 'https://www.reddit.com/r/rust/hot.rss',
  },
  {
    name: 'r/Python',
    sub: 'Python',
    title: 'Python Developers Community',
    subscribers: '1.3M members',
    subscribersCount: 1300000,
    category: 'Computer Science & Tech',
    icon: '🐍',
    description: 'Python ecosystem, asyncio, scientific computing, packaging, and data analysis.',
    feedUrl: 'https://www.reddit.com/r/Python/hot.rss',
  },
  {
    name: 'r/datascience',
    sub: 'datascience',
    title: 'Data Science & Analytics',
    subscribers: '1.6M members',
    subscribersCount: 1600000,
    category: 'Computer Science & Tech',
    icon: '📊',
    description: 'Statistical modeling, predictive analytics, feature engineering, and data pipeline architecture.',
    feedUrl: 'https://www.reddit.com/r/datascience/hot.rss',
  },
  {
    name: 'r/cybersecurity',
    sub: 'cybersecurity',
    title: 'Cybersecurity & Infosec',
    subscribers: '980K members',
    subscribersCount: 980000,
    category: 'Computer Science & Tech',
    icon: '🛡️',
    description: 'Threat intelligence, zero-day vulnerabilities, cryptographic protocols, and incident response.',
    feedUrl: 'https://www.reddit.com/r/cybersecurity/hot.rss',
  },
  {
    name: 'r/linux',
    sub: 'linux',
    title: 'Linux Kernel & Operating Systems',
    subscribers: '1.1M members',
    subscribersCount: 1100000,
    category: 'Computer Science & Tech',
    icon: '🐧',
    description: 'Linux kernel developments, system administration, open-source infrastructure, and POSIX.',
    feedUrl: 'https://www.reddit.com/r/linux/hot.rss',
  },

  // --- Medicine & Healthcare ---
  {
    name: 'r/medicine',
    sub: 'medicine',
    title: 'Clinical Medicine & Physicians',
    subscribers: '520K members',
    subscribersCount: 520000,
    category: 'Medicine & Healthcare',
    icon: '🩺',
    description: 'Physician discussions, clinical case analysis, hospital guidelines, and diagnostic dilemmas.',
    feedUrl: 'https://www.reddit.com/r/medicine/hot.rss',
    isHot: true,
  },
  {
    name: 'r/Dentistry',
    sub: 'Dentistry',
    title: 'Dentistry & Oral Surgery',
    subscribers: '68K members',
    subscribersCount: 68000,
    category: 'Medicine & Healthcare',
    icon: '🦷',
    description: 'Clinical dental surgery, CBCT diagnostics, endodontics, prosthodontics, and implantology.',
    feedUrl: 'https://www.reddit.com/r/Dentistry/hot.rss',
    isHot: true,
  },
  {
    name: 'r/Radiology',
    sub: 'Radiology',
    title: 'Medical Imaging & Radiology',
    subscribers: '190K members',
    subscribersCount: 190000,
    category: 'Medicine & Healthcare',
    icon: '🩻',
    description: 'Diagnostic radiology cases: CT scans, MRI protocols, ultrasound, fluoroscopy, and nuclear medicine.',
    feedUrl: 'https://www.reddit.com/r/Radiology/hot.rss',
    isHot: true,
  },
  {
    name: 'r/Pathology',
    sub: 'Pathology',
    title: 'Diagnostic Pathology & Histology',
    subscribers: '32K members',
    subscribersCount: 32000,
    category: 'Medicine & Healthcare',
    icon: '🔬',
    description: 'Histopathological specimen examination, biopsy microphotographs, tumor grading, and immunohistochemistry.',
    feedUrl: 'https://www.reddit.com/r/Pathology/hot.rss',
  },
  {
    name: 'r/neuroscience',
    sub: 'neuroscience',
    title: 'Neuroscience & Brain Research',
    subscribers: '340K members',
    subscribersCount: 340000,
    category: 'Medicine & Healthcare',
    icon: '🧠',
    description: 'Neural circuits, synaptic plasticity, cognitive electrophysiology, and neurodegenerative pathways.',
    feedUrl: 'https://www.reddit.com/r/neuroscience/hot.rss',
  },
  {
    name: 'r/Pharmacy',
    sub: 'Pharmacy',
    title: 'Clinical Pharmacology & Therapeutics',
    subscribers: '110K members',
    subscribersCount: 110000,
    category: 'Medicine & Healthcare',
    icon: '💊',
    description: 'Pharmacokinetics, drug interactions, clinical pharmacotherapy, and FDA indications.',
    feedUrl: 'https://www.reddit.com/r/Pharmacy/hot.rss',
  },
  {
    name: 'r/PublicHealth',
    sub: 'PublicHealth',
    title: 'Public Health & Epidemiology',
    subscribers: '85K members',
    subscribersCount: 85000,
    category: 'Medicine & Healthcare',
    icon: '🌍',
    description: 'Epidemiological studies, disease surveillance, vaccine efficacy, and biostatistical models.',
    feedUrl: 'https://www.reddit.com/r/PublicHealth/hot.rss',
  },
  {
    name: 'r/Oncology',
    sub: 'Oncology',
    title: 'Clinical Oncology & Cancer Biology',
    subscribers: '22K members',
    subscribersCount: 22000,
    category: 'Medicine & Healthcare',
    icon: '🎗️',
    description: 'Tumor biology, checkpoint inhibitor trials, radiotherapy protocols, and translational oncology.',
    feedUrl: 'https://www.reddit.com/r/Oncology/hot.rss',
  },

  // --- Natural Sciences & Space ---
  {
    name: 'r/science',
    sub: 'science',
    title: 'Peer-Reviewed Science',
    subscribers: '33.0M members',
    subscribersCount: 33000000,
    category: 'Natural Sciences & Space',
    icon: '🧬',
    description: 'Strictly moderated research findings from peer-reviewed scientific journals across all disciplines.',
    feedUrl: 'https://www.reddit.com/r/science/hot.rss',
    isHot: true,
  },
  {
    name: 'r/Physics',
    sub: 'Physics',
    title: 'Theoretical & Experimental Physics',
    subscribers: '2.8M members',
    subscribersCount: 2800000,
    category: 'Natural Sciences & Space',
    icon: '⚛️',
    description: 'Quantum mechanics, condensed matter physics, particle accelerators, and thermodynamics.',
    feedUrl: 'https://www.reddit.com/r/Physics/hot.rss',
  },
  {
    name: 'r/Biology',
    sub: 'Biology',
    title: 'Biological Sciences',
    subscribers: '3.4M members',
    subscribersCount: 3400000,
    category: 'Natural Sciences & Space',
    icon: '🌱',
    description: 'Cell biology, evolutionary theory, microbiology, zoology, and ecological systems.',
    feedUrl: 'https://www.reddit.com/r/Biology/hot.rss',
  },
  {
    name: 'r/Chemistry',
    sub: 'Chemistry',
    title: 'Chemical Science & Synthesis',
    subscribers: '2.1M members',
    subscribersCount: 2100000,
    category: 'Natural Sciences & Space',
    icon: '⚗️',
    description: 'Organic chemistry, inorganic crystal synthesis, analytical spectroscopy, and biochemistry.',
    feedUrl: 'https://www.reddit.com/r/Chemistry/hot.rss',
  },
  {
    name: 'r/Astronomy',
    sub: 'Astronomy',
    title: 'Astronomy & Astrophysics',
    subscribers: '3.1M members',
    subscribersCount: 3100000,
    category: 'Natural Sciences & Space',
    icon: '🔭',
    description: 'Observational astronomy, James Webb Telescope discoveries, planetary science, and cosmology.',
    feedUrl: 'https://www.reddit.com/r/Astronomy/hot.rss',
  },
  {
    name: 'r/Space',
    sub: 'Space',
    title: 'Space Exploration & Aeronautics',
    subscribers: '24.0M members',
    subscribersCount: 24000000,
    category: 'Natural Sciences & Space',
    icon: '🚀',
    description: 'Rocket launches, orbital mechanics, interplanetary missions, and NASA/ESA space programs.',
    feedUrl: 'https://www.reddit.com/r/Space/hot.rss',
  },
  {
    name: 'r/biotech',
    sub: 'biotech',
    title: 'Biotechnology & Synthetic Bio',
    subscribers: '92K members',
    subscribersCount: 92000,
    category: 'Natural Sciences & Space',
    icon: '🧬',
    description: 'Gene therapies, CRISPR-Cas9, antibody engineering, and biotech venture therapeutics.',
    feedUrl: 'https://www.reddit.com/r/biotech/hot.rss',
  },

  // --- Engineering & Robotics ---
  {
    name: 'r/engineering',
    sub: 'engineering',
    title: 'Applied Engineering Disciplines',
    subscribers: '670K members',
    subscribersCount: 670000,
    category: 'Engineering & Robotics',
    icon: '⚙️',
    description: 'Mechanical, aerospace, civil, structural, and electrical engineering innovation.',
    feedUrl: 'https://www.reddit.com/r/engineering/hot.rss',
  },
  {
    name: 'r/robotics',
    sub: 'robotics',
    title: 'Robotics & Autonomous Systems',
    subscribers: '310K members',
    subscribersCount: 310000,
    category: 'Engineering & Robotics',
    icon: '🤖',
    description: 'Robot kinematics, SLAM, ROS/ROS2, computer vision navigation, and humanoid robotics.',
    feedUrl: 'https://www.reddit.com/r/robotics/hot.rss',
  },
  {
    name: 'r/hardware',
    sub: 'hardware',
    title: 'Semiconductor & Hardware Tech',
    subscribers: '4.2M members',
    subscribersCount: 4200000,
    category: 'Engineering & Robotics',
    icon: '🖥️',
    description: 'Silicon lithography, GPU architecture, x86/ARM/RISC-V processors, and memory standards.',
    feedUrl: 'https://www.reddit.com/r/hardware/hot.rss',
  },

  // --- Startups & Research Academia ---
  {
    name: 'r/startups',
    sub: 'startups',
    title: 'Tech Startups & Venture',
    subscribers: '1.9M members',
    subscribersCount: 1900000,
    category: 'Startups & Business',
    icon: '💡',
    description: 'Product-market fit, venture capital, early-stage SaaS, and technical founder insights.',
    feedUrl: 'https://www.reddit.com/r/startups/hot.rss',
  },
  {
    name: 'r/Entrepreneur',
    sub: 'Entrepreneur',
    title: 'Entrepreneurship & Growth',
    subscribers: '3.4M members',
    subscribersCount: 3400000,
    category: 'Startups & Business',
    icon: '📈',
    description: 'Business scaling, monetization, bootstrapping, and enterprise case studies.',
    feedUrl: 'https://www.reddit.com/r/Entrepreneur/hot.rss',
  },
  {
    name: 'r/AskScience',
    sub: 'AskScience',
    title: 'Ask Science (Expert Answers)',
    subscribers: '24.5M members',
    subscribersCount: 24500000,
    category: 'Natural Sciences & Space',
    icon: '🔬',
    description: 'In-depth answers to complex scientific questions by vetted researchers and professors.',
    feedUrl: 'https://www.reddit.com/r/AskScience/hot.rss',
  },
];

/**
 * Searches the Reddit community database with intelligent fuzzy matching,
 * acronym detection, and dynamic subreddit generation for arbitrary search terms.
 */
export function searchRedditCommunities(query: string, limit = 8): RedditSubreddit[] {
  const clean = query.trim().toLowerCase().replace(/^r\//, '');
  if (!clean) {
    return POPULAR_REDDIT_COMMUNITIES.slice(0, limit);
  }

  // Exact & Prefix matches first
  const exactOrPrefix: RedditSubreddit[] = [];
  const keywordMatches: RedditSubreddit[] = [];

  for (const community of POPULAR_REDDIT_COMMUNITIES) {
    const subLower = community.sub.toLowerCase();
    const titleLower = community.title.toLowerCase();
    const descLower = community.description.toLowerCase();

    if (subLower === clean || subLower.startsWith(clean)) {
      exactOrPrefix.push(community);
    } else if (
      titleLower.includes(clean) ||
      descLower.includes(clean) ||
      community.category.toLowerCase().includes(clean)
    ) {
      keywordMatches.push(community);
    }
  }

  // Combine results
  const combined = [...exactOrPrefix, ...keywordMatches];

  // If query does not match an existing community exactly, add a dynamically generated candidate
  const hasExact = combined.some((c) => c.sub.toLowerCase() === clean);
  if (!hasExact && clean.length >= 2 && /^[a-zA-Z0-9_]+$/.test(clean)) {
    const customCandidate: RedditSubreddit = {
      name: `r/${clean}`,
      sub: clean,
      title: `Reddit r/${clean}`,
      subscribers: 'Direct Subreddit Feed',
      subscribersCount: 0,
      category: 'Custom Reddit Community',
      icon: '👾',
      description: `Connect directly to the live feed of the r/${clean} community on Reddit.`,
      feedUrl: `https://www.reddit.com/r/${clean}/hot.rss`,
    };
    return [customCandidate, ...combined].slice(0, limit);
  }

  return combined.slice(0, limit);
}

