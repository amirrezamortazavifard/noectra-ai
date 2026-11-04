export interface SourceItem {
  id: string;
  name: string;
  type: 'academic' | 'journal' | 'clinical' | 'social' | 'tech';
  typeLabel: string;
  icon: string;
  description: string;
  url: string;
  subgroupId: string;
  subgroupName: string;
  categoryId: string;
  categoryName: string;
}

export interface SourceSubGroup {
  id: string;
  name: string;
  icon: string;
  description?: string;
  sources: SourceItem[];
}

export interface SourceCategoryGroup {
  id: string;
  name: string;
  icon: string;
  badge: string;
  description: string;
  subgroups: SourceSubGroup[];
}

export const SOURCE_HIERARCHY_CATEGORIES: SourceCategoryGroup[] = [
  // 1. Academic Preprints & arXiv
  {
    id: 'academic_preprints',
    name: 'Preprints & Open Science',
    icon: '📜',
    badge: 'arXiv & Open Access',
    description: 'Rapid, unvetted research preprints and algorithmic breakthroughs.',
    subgroups: [
      {
        id: 'cs_ai',
        name: 'Computer Science & AI',
        icon: '💻',
        description: 'Computer vision, foundation models, agents, and systems.',
        sources: [
          {
            id: 'arxiv_cv',
            name: 'arXiv Computer Vision (cs.CV)',
            type: 'academic',
            typeLabel: 'Preprint',
            icon: '👁️',
            description: 'Object recognition, generative diffusion, medical imaging, 3D vision.',
            url: 'https://export.arxiv.org/rss/cs.CV',
            subgroupId: 'cs_ai',
            subgroupName: 'Computer Science & AI',
            categoryId: 'academic_preprints',
            categoryName: 'Preprints & Open Science',
          },
          {
            id: 'arxiv_ai',
            name: 'arXiv Artificial Intelligence (cs.AI)',
            type: 'academic',
            typeLabel: 'Preprint',
            icon: '🧠',
            description: 'Reasoning, multi-agent systems, neuro-symbolic AI, knowledge representation.',
            url: 'https://export.arxiv.org/rss/cs.AI',
            subgroupId: 'cs_ai',
            subgroupName: 'Computer Science & AI',
            categoryId: 'academic_preprints',
            categoryName: 'Preprints & Open Science',
          },
          {
            id: 'arxiv_cs',
            name: 'arXiv Computer Science (cs)',
            type: 'academic',
            typeLabel: 'Preprint',
            icon: '⚡',
            description: 'General computer science, distributed algorithms, data structures, compilers.',
            url: 'https://export.arxiv.org/rss/cs',
            subgroupId: 'cs_ai',
            subgroupName: 'Computer Science & AI',
            categoryId: 'academic_preprints',
            categoryName: 'Preprints & Open Science',
          },
        ],
      },
      {
        id: 'physics_space',
        name: 'Physics & Astronomy',
        icon: '🔭',
        description: 'Astrophysics, quantum mechanics, cosmology, and high-energy physics.',
        sources: [
          {
            id: 'arxiv_astro',
            name: 'arXiv Astrophysics (astro-ph)',
            type: 'academic',
            typeLabel: 'Preprint',
            icon: '🌌',
            description: 'Galaxies, stellar dynamics, dark matter, cosmological simulations.',
            url: 'https://export.arxiv.org/rss/astro-ph',
            subgroupId: 'physics_space',
            subgroupName: 'Physics & Astronomy',
            categoryId: 'academic_preprints',
            categoryName: 'Preprints & Open Science',
          },
          {
            id: 'arxiv_quant',
            name: 'arXiv Quantum Physics (quant-ph)',
            type: 'academic',
            typeLabel: 'Preprint',
            icon: '⚛️',
            description: 'Quantum computing, entanglement, cryptography, qubit architecture.',
            url: 'https://export.arxiv.org/rss/quant-ph',
            subgroupId: 'physics_space',
            subgroupName: 'Physics & Astronomy',
            categoryId: 'academic_preprints',
            categoryName: 'Preprints & Open Science',
          },
        ],
      },
      {
        id: 'quant_biology',
        name: 'Quantitative Biology',
        icon: '🧬',
        description: 'Computational genomics, molecular biology, and proteomics.',
        sources: [
          {
            id: 'arxiv_qbio',
            name: 'arXiv Quantitative Biology (q-bio)',
            type: 'academic',
            typeLabel: 'Preprint',
            icon: '🧪',
            description: 'Biomolecular modeling, genomic sequences, protein folding, cell dynamics.',
            url: 'https://export.arxiv.org/rss/q-bio',
            subgroupId: 'quant_biology',
            subgroupName: 'Quantitative Biology',
            categoryId: 'academic_preprints',
            categoryName: 'Preprints & Open Science',
          },
        ],
      },
    ],
  },

  // 2. Peer-Reviewed Top Journals
  {
    id: 'peer_reviewed_journals',
    name: 'Peer-Reviewed Journals',
    icon: '🏛️',
    badge: 'High Impact Factor',
    description: 'Gold-standard scientific literature and peer-reviewed clinical breakthroughs.',
    subgroups: [
      {
        id: 'multidisciplinary_science',
        name: 'Multidisciplinary Flagships',
        icon: '🌐',
        description: 'World-renowned interdisciplinary research journals.',
        sources: [
          {
            id: 'nature',
            name: 'Nature International Journal',
            type: 'journal',
            typeLabel: 'Peer-Reviewed',
            icon: '💎',
            description: 'Landmark scientific breakthroughs, global discoveries, and policy reviews.',
            url: 'https://www.nature.com/nature.rss',
            subgroupId: 'multidisciplinary_science',
            subgroupName: 'Multidisciplinary Flagships',
            categoryId: 'peer_reviewed_journals',
            categoryName: 'Peer-Reviewed Journals',
          },
          {
            id: 'science_mag',
            name: 'Science Magazine (AAAS)',
            type: 'journal',
            typeLabel: 'Peer-Reviewed',
            icon: '🔬',
            description: 'Pioneering scientific investigations, clinical insights, and editorial commentary.',
            url: 'https://www.science.org/rss/news_current.xml',
            subgroupId: 'multidisciplinary_science',
            subgroupName: 'Multidisciplinary Flagships',
            categoryId: 'peer_reviewed_journals',
            categoryName: 'Peer-Reviewed Journals',
          },
        ],
      },
      {
        id: 'dental_oral_journals',
        name: 'Dentistry & Oral Science',
        icon: '🦷',
        description: 'Clinical dental surgery, endodontics, orthodontics, and maxillofacial research.',
        sources: [
          {
            id: 'nature_bdj',
            name: 'British Dental Journal (Nature BDJ)',
            type: 'journal',
            typeLabel: 'Peer-Reviewed',
            icon: '🦷',
            description: 'Official clinical journal of the BDA; restorative, prosthodontics, oral surgery.',
            url: 'https://www.nature.com/bdj.rss',
            subgroupId: 'dental_oral_journals',
            subgroupName: 'Dentistry & Oral Science',
            categoryId: 'peer_reviewed_journals',
            categoryName: 'Peer-Reviewed Journals',
          },
        ],
      },
    ],
  },

  // 3. Clinical Medicine & Healthcare
  {
    id: 'clinical_medicine',
    name: 'Clinical Medicine & Health',
    icon: '🩺',
    badge: 'Clinical & Patient Care',
    description: 'Evidence-based clinical medicine, diagnostic trials, and healthcare practice.',
    subgroups: [
      {
        id: 'clinical_trials_news',
        name: 'Clinical Practice & Trials',
        icon: '🏥',
        description: 'Practice-changing trial briefings and physician-directed updates.',
        sources: [
          {
            id: 'medpage',
            name: 'MedPage Today Clinical News',
            type: 'clinical',
            typeLabel: 'Clinical News',
            icon: '🩺',
            description: 'Medical congress coverage, FDA drug approvals, and clinical practice trials.',
            url: 'https://www.medpagetoday.com/rss/headlines.xml',
            subgroupId: 'clinical_trials_news',
            subgroupName: 'Clinical Practice & Trials',
            categoryId: 'clinical_medicine',
            categoryName: 'Clinical Medicine & Health',
          },
          {
            id: 'sciencedaily_health',
            name: 'ScienceDaily Health & Medicine',
            type: 'clinical',
            typeLabel: 'Medical Research',
            icon: '💊',
            description: 'Translational discoveries, pharmacology, cardiology, and oncology.',
            url: 'https://www.sciencedaily.com/rss/health_medicine.xml',
            subgroupId: 'clinical_trials_news',
            subgroupName: 'Clinical Practice & Trials',
            categoryId: 'clinical_medicine',
            categoryName: 'Clinical Medicine & Health',
          },
        ],
      },
      {
        id: 'dental_research_clinical',
        name: 'Oral Health & Biomaterials',
        icon: '🦷',
        description: 'Dental implants, periodontal regeneration, and digital dentistry.',
        sources: [
          {
            id: 'sciencedaily_dentistry',
            name: 'ScienceDaily Dental Research',
            type: 'clinical',
            typeLabel: 'Dental Research',
            icon: '✨',
            description: 'Dental biomaterials, tooth remineralization, caries prevention, CBCT imaging.',
            url: 'https://www.sciencedaily.com/rss/health_medicine/dentistry.xml',
            subgroupId: 'dental_research_clinical',
            subgroupName: 'Oral Health & Biomaterials',
            categoryId: 'clinical_medicine',
            categoryName: 'Clinical Medicine & Health',
          },
        ],
      },
    ],
  },

  // 4. Social & Community Intelligence
  {
    id: 'social_community',
    name: 'Social & Community Intelligence',
    icon: '💬',
    badge: 'Real-Time Discourse',
    description: 'Reddit machine learning hubs, Hacker News debates, and open-source models.',
    subgroups: [
      {
        id: 'reddit_ai_communities',
        name: 'Reddit AI & Open Weights',
        icon: '👾',
        description: 'Fast discussions, model releases, quantization configs, and paper reviews.',
        sources: [
          {
            id: 'reddit_stream',
            name: 'All Reddit Communities (Multi-Stream)',
            type: 'social',
            typeLabel: 'Multi-Community',
            icon: '🔥',
            description: 'Combined real-time stream across 15+ science, AI, medicine, and technology subreddits.',
            url: 'https://www.reddit.com/r/MachineLearning+LocalLLaMA+artificial+technology+science/hot.rss',
            subgroupId: 'reddit_ai_communities',
            subgroupName: 'Reddit AI & Open Weights',
            categoryId: 'social_community',
            categoryName: 'Social & Community Intelligence',
          },
          {
            id: 'reddit_machinelearning',
            name: 'Reddit r/MachineLearning',
            type: 'social',
            typeLabel: 'Reddit Community',
            icon: '👾',
            description: 'Peer discussions of recent academic ML publications, conferences, and code.',
            url: 'https://www.reddit.com/r/MachineLearning/hot.rss',
            subgroupId: 'reddit_ai_communities',
            subgroupName: 'Reddit AI & Open Weights',
            categoryId: 'social_community',
            categoryName: 'Social & Community Intelligence',
          },
          {
            id: 'reddit_localllama',
            name: 'Reddit r/LocalLLaMA',
            type: 'social',
            typeLabel: 'Reddit Community',
            icon: '🦙',
            description: 'Local language model fine-tuning, GGUF/EXL2 quantization, GPU inference.',
            url: 'https://www.reddit.com/r/LocalLLaMA/hot.rss',
            subgroupId: 'reddit_ai_communities',
            subgroupName: 'Reddit AI & Open Weights',
            categoryId: 'social_community',
            categoryName: 'Social & Community Intelligence',
          },
          {
            id: 'reddit_artificial',
            name: 'Reddit r/artificial',
            type: 'social',
            typeLabel: 'Reddit Community',
            icon: '🧠',
            description: 'Broad artificial intelligence news, ethical discourse, and frontier updates.',
            url: 'https://www.reddit.com/r/artificial/hot.rss',
            subgroupId: 'reddit_ai_communities',
            subgroupName: 'Reddit AI & Open Weights',
            categoryId: 'social_community',
            categoryName: 'Social & Community Intelligence',
          },
        ],
      },
      {
        id: 'tech_forums_discourse',
        name: 'Hacker News & Tech Forums',
        icon: '🟧',
        description: 'Silicon Valley debates, startup architecture, and tech regulation.',
        sources: [
          {
            id: 'hackernews',
            name: 'Hacker News (Y Combinator)',
            type: 'social',
            typeLabel: 'Tech Forum',
            icon: '🟧',
            description: 'Top-voted software engineering articles, show HN, and startup debriefs.',
            url: 'https://news.ycombinator.com/rss',
            subgroupId: 'tech_forums_discourse',
            subgroupName: 'Hacker News & Tech Forums',
            categoryId: 'social_community',
            categoryName: 'Social & Community Intelligence',
          },
          {
            id: 'reddit_tech',
            name: 'Reddit r/technology',
            type: 'social',
            typeLabel: 'Reddit Community',
            icon: '💻',
            description: 'Global tech news, privacy laws, semiconductor industry updates.',
            url: 'https://www.reddit.com/r/technology/hot.rss',
            subgroupId: 'tech_forums_discourse',
            subgroupName: 'Hacker News & Tech Forums',
            categoryId: 'social_community',
            categoryName: 'Social & Community Intelligence',
          },
          {
            id: 'reddit_science',
            name: 'Reddit r/science',
            type: 'social',
            typeLabel: 'Reddit Community',
            icon: '🧬',
            description: 'Strictly moderated scientific discussions on peer-reviewed research.',
            url: 'https://www.reddit.com/r/science/hot.rss',
            subgroupId: 'tech_forums_discourse',
            subgroupName: 'Hacker News & Tech Forums',
            categoryId: 'social_community',
            categoryName: 'Social & Community Intelligence',
          },
        ],
      },
    ],
  },

  // 5. Applied Tech & Engineering
  {
    id: 'applied_technology',
    name: 'Applied Science & Engineering',
    icon: '⚡',
    badge: 'Industry & Deep Tech',
    description: 'Transformative technologies, commercial AI systems, materials and robotics.',
    subgroups: [
      {
        id: 'deep_tech_journalism',
        name: 'Deep Tech & Venture AI',
        icon: '🚀',
        description: 'Authoritative reporting on frontier AI and technical breakthroughs.',
        sources: [
          {
            id: 'mit_tech',
            name: 'MIT Technology Review',
            type: 'tech',
            typeLabel: 'Tech Journalism',
            icon: '🏛️',
            description: 'Commercial applications, biotechnology, and emerging computing paradigms.',
            url: 'https://www.technologyreview.com/feed/',
            subgroupId: 'deep_tech_journalism',
            subgroupName: 'Deep Tech & Venture AI',
            categoryId: 'applied_technology',
            categoryName: 'Applied Science & Engineering',
          },
          {
            id: 'techcrunch',
            name: 'TechCrunch Deep Tech & AI',
            type: 'tech',
            typeLabel: 'Tech Journalism',
            icon: '📰',
            description: 'AI startups, foundation model commercialization, venture investments.',
            url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
            subgroupId: 'deep_tech_journalism',
            subgroupName: 'Deep Tech & Venture AI',
            categoryId: 'applied_technology',
            categoryName: 'Applied Science & Engineering',
          },
          {
            id: 'sciencedaily_ai',
            name: 'ScienceDaily Artificial Intelligence',
            type: 'tech',
            typeLabel: 'AI Science',
            icon: '🤖',
            description: 'Robotic engineering, autonomous navigation, machine perception research.',
            url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml',
            subgroupId: 'deep_tech_journalism',
            subgroupName: 'Deep Tech & Venture AI',
            categoryId: 'applied_technology',
            categoryName: 'Applied Science & Engineering',
          },
        ],
      },
      {
        id: 'engineering_physical_sciences',
        name: 'Physical & Materials Sciences',
        icon: '⚙️',
        description: 'Nanotechnology, smart materials, chemical synthesis, and neuroscience.',
        sources: [
          {
            id: 'sciencedaily_engineering',
            name: 'ScienceDaily Engineering',
            type: 'tech',
            typeLabel: 'Engineering',
            icon: '⚙️',
            description: 'Applied engineering, renewable energy, photonics, and structural design.',
            url: 'https://www.sciencedaily.com/rss/computers_math/engineering.xml',
            subgroupId: 'engineering_physical_sciences',
            subgroupName: 'Physical & Materials Sciences',
            categoryId: 'applied_technology',
            categoryName: 'Applied Science & Engineering',
          },
          {
            id: 'sciencedaily_materials',
            name: 'ScienceDaily Materials Science',
            type: 'tech',
            typeLabel: 'Materials',
            icon: '🔬',
            description: 'Semiconductors, 2D graphene, superconductors, self-healing polymers.',
            url: 'https://www.sciencedaily.com/rss/matter_energy/materials_science.xml',
            subgroupId: 'engineering_physical_sciences',
            subgroupName: 'Physical & Materials Sciences',
            categoryId: 'applied_technology',
            categoryName: 'Applied Science & Engineering',
          },
          {
            id: 'sciencedaily_chemistry',
            name: 'ScienceDaily Chemistry',
            type: 'tech',
            typeLabel: 'Chemistry',
            icon: '⚗️',
            description: 'Organic chemistry, molecular catalysis, battery electrolytes, biochemistry.',
            url: 'https://www.sciencedaily.com/rss/matter_energy/chemistry.xml',
            subgroupId: 'engineering_physical_sciences',
            subgroupName: 'Physical & Materials Sciences',
            categoryId: 'applied_technology',
            categoryName: 'Applied Science & Engineering',
          },
          {
            id: 'sciencedaily_neuro',
            name: 'ScienceDaily Neuroscience',
            type: 'tech',
            typeLabel: 'Neuroscience',
            icon: '🧠',
            description: 'Brain-computer interfaces, neural plasticity, cognitive neurobiology.',
            url: 'https://www.sciencedaily.com/rss/mind_brain/neuroscience.xml',
            subgroupId: 'engineering_physical_sciences',
            subgroupName: 'Physical & Materials Sciences',
            categoryId: 'applied_technology',
            categoryName: 'Applied Science & Engineering',
          },
          {
            id: 'sciencedaily_biology',
            name: 'ScienceDaily Biology & Genetics',
            type: 'tech',
            typeLabel: 'Biology',
            icon: '🌱',
            description: 'CRISPR gene editing, evolutionary biology, synthetic biological systems.',
            url: 'https://www.sciencedaily.com/rss/plants_animals/biology.xml',
            subgroupId: 'engineering_physical_sciences',
            subgroupName: 'Physical & Materials Sciences',
            categoryId: 'applied_technology',
            categoryName: 'Applied Science & Engineering',
          },
        ],
      },
    ],
  },
];

/**
 * Returns a flat list of all sources across all categories and subgroups.
 */
export function getAllHierarchicalSources(): SourceItem[] {
  const list: SourceItem[] = [];
  for (const cat of SOURCE_HIERARCHY_CATEGORIES) {
    for (const sub of cat.subgroups) {
      for (const src of sub.sources) {
        list.push(src);
      }
    }
  }
  return list;
}

/**
 * Look up a source item by its unique ID.
 */
export function findSourceById(id: string): SourceItem | undefined {
  if (id === 'all') return undefined;
  for (const cat of SOURCE_HIERARCHY_CATEGORIES) {
    for (const sub of cat.subgroups) {
      for (const src of sub.sources) {
        if (src.id === id) return src;
      }
    }
  }

  // Handle dynamic subreddits selected from search / explorer
  if (id.startsWith('reddit_')) {
    const rawSub = id.replace('reddit_', '');
    const cleanSub = rawSub.charAt(0).toUpperCase() + rawSub.slice(1);
    return {
      id,
      name: `Reddit r/${cleanSub}`,
      type: 'social',
      typeLabel: 'Reddit Community',
      icon: '👾',
      description: `Live hot discussions and submissions from r/${cleanSub} on Reddit.`,
      url: `https://www.reddit.com/r/${cleanSub}/hot.rss`,
      subgroupId: 'reddit_ai_communities',
      subgroupName: 'Reddit Communities',
      categoryId: 'social_community',
      categoryName: 'Social & Community Intelligence',
    };
  }

  return undefined;
}

