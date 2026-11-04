export interface TaxonomyTopic {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  gradient: string;
  keywords: string[];
  isHot?: boolean;
}

export interface DisciplineSubTopic {
  id: string;
  name: string;
  description: string;
  icon: string;
  keywords: string[];
  isHot?: boolean;
}

export interface UniversalDiscipline {
  id: string;
  name: string;
  icon: string;
  description: string;
  topics: DisciplineSubTopic[];
}

export interface StoryTopicItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  category: string;
  gradient: string;
  hasNew: boolean;
}

// ---------------------------------------------------------------------------
// Universal Multi-Disciplinary Taxonomy
// ---------------------------------------------------------------------------

export const UNIVERSAL_DISCIPLINES: UniversalDiscipline[] = [
  // Social & Community Intelligence
  {
    id: 'social',
    name: 'Social & Community Intelligence',
    icon: '💬',
    description: 'Reddit research communities, Hacker News, X / Twitter tech debates, and developer forums.',
    topics: [
      {
        id: 'reddit_ai_ml',
        name: 'Reddit Machine Learning & AI',
        description: 'r/MachineLearning, r/LocalLLaMA, and r/artificial discussions and releases.',
        icon: '👾',
        keywords: ['reddit', 'machinelearning', 'localllama', 'artificial', 'subreddit', 'upvote'],
        isHot: true,
      },
      {
        id: 'hacker_news',
        name: 'Hacker News Community',
        description: 'Top tech, startup insights, and programming debates from news.ycombinator.com.',
        icon: '🟧',
        keywords: ['hacker news', 'y combinator', 'hn', 'ask hn', 'show hn'],
        isHot: true,
      },
      {
        id: 'x_twitter_ai',
        name: 'X (Twitter) & Bluesky',
        description: 'Pioneering researcher insights from X / Nitter and Bluesky announcements.',
        icon: '🐦',
        keywords: ['twitter', 'x.com', 'tweet', 'nitter', 'bluesky', 'threads'],
        isHot: true,
      },
    ],
  },
  // 1. Medicine & Clinical Healthcare
  {
    id: 'medicine',
    name: 'Medicine & Healthcare',
    icon: '🩺',
    description: 'Clinical medicine, diagnostic radiology, surgical innovation, oncology and epidemiology.',
    topics: [
      {
        id: 'radiology_imaging',
        name: 'Radiology & Medical Imaging',
        description: 'CT, MRI, X-ray, Ultrasound, Mammography, PET-CT and nuclear medicine diagnostics.',
        icon: '🩻',
        keywords: ['radiology', 'ct scan', 'mri', 'x-ray', 'ultrasound', 'mammography', 'imaging', 'pet-ct'],
        isHot: true,
      },
      {
        id: 'pathology_histology',
        name: 'Pathology & Histology',
        description: 'Whole slide imaging (WSI), cellular morphology, biopsy analysis and tissue biomarkers.',
        icon: '🔬',
        keywords: ['pathology', 'histopathology', 'histology', 'whole slide', 'wsi', 'biopsy', 'cell', 'tissue'],
        isHot: true,
      },
      {
        id: 'surgery_robotics',
        name: 'Surgery & Surgical Tech',
        description: 'Minimally invasive surgery, laparoscopy, robotic intervention and surgical video analytics.',
        icon: '🔪',
        keywords: ['surgical', 'surgery', 'laparoscopy', 'endoscopy', 'robot-assisted', 'operating room', 'surgeon'],
      },
      {
        id: 'clinical_ai',
        name: 'Clinical AI & Decision Support',
        description: 'Diagnostic foundation models, electronic health records (EHR), and patient triage AI.',
        icon: '🧠',
        keywords: ['clinical ai', 'diagnostic support', 'ehr', 'triage', 'patient risk', 'clinical decision'],
        isHot: true,
      },
      {
        id: 'cardiology',
        name: 'Cardiology & Vascular',
        description: 'Echocardiography, ECG arrhythmia detection, coronary imaging and cardiovascular interventions.',
        icon: '🫀',
        keywords: ['cardiology', 'cardiovascular', 'ecg', 'echocardiography', 'arrhythmia', 'coronary', 'heart'],
      },
      {
        id: 'oncology',
        name: 'Oncology & Cancer Research',
        description: 'Tumor biology, precision oncology, cancer genomics, immunotherapy and radiation therapy.',
        icon: '🎗️',
        keywords: ['oncology', 'cancer', 'tumor', 'immunotherapy', 'carcinoma', 'neoplasm', 'chemotherapy'],
        isHot: true,
      },
      {
        id: 'pharmacology',
        name: 'Pharmacology & Therapeutics',
        description: 'Drug discovery, molecular screening, pharmacokinetics, toxicology and clinical trials.',
        icon: '💊',
        keywords: ['pharmacology', 'drug discovery', 'therapeutics', 'pharmacokinetics', 'molecular screening'],
      },
      {
        id: 'public_health',
        name: 'Public Health & Epidemiology',
        description: 'Disease surveillance, global health policy, infection control and epidemic modeling.',
        icon: '🌐',
        keywords: ['public health', 'epidemiology', 'vaccine', 'infectious disease', 'outbreak', 'surveillance'],
      },
    ],
  },

  // 2. Dentistry & Oral Sciences
  {
    id: 'dentistry',
    name: 'Dentistry & Oral Health',
    icon: '🦷',
    description: 'Digital dentistry, endodontics, orthodontics, oral & maxillofacial surgery, and periodontology.',
    topics: [
      {
        id: 'digital_dentistry',
        name: 'Digital Dentistry & Dental AI',
        description: 'Cone beam CT (CBCT), 3D intraoral scanning, CAD/CAM crowns, and automated caries detection.',
        icon: '💻',
        keywords: ['digital dentistry', 'cbct', 'intraoral scan', 'cad/cam', 'caries detection', 'dental ai'],
        isHot: true,
      },
      {
        id: 'orthodontics',
        name: 'Orthodontics & Dentofacial',
        description: 'Clear aligners, malocclusion correction, cephalometrics, and facial growth modification.',
        icon: '✨',
        keywords: ['orthodontics', 'malocclusion', 'aligners', 'braces', 'cephalometrics', 'dentofacial'],
      },
      {
        id: 'endodontics',
        name: 'Endodontics & Pulp Biology',
        description: 'Root canal therapy, dental pulp regeneration, apical periodontitis, and nickel-titanium instrumentation.',
        icon: '💉',
        keywords: ['endodontics', 'root canal', 'pulpitis', 'dental pulp', 'periapical', 'apexification'],
      },
      {
        id: 'periodontics',
        name: 'Periodontology & Implants',
        description: 'Periodontal regeneration, osseointegration, dental implants, guided bone regeneration and peri-implantitis.',
        icon: '🌱',
        keywords: ['periodontology', 'periodontics', 'dental implant', 'osseointegration', 'gingivitis', 'bone graft'],
        isHot: true,
      },
      {
        id: 'oral_surgery',
        name: 'Oral & Maxillofacial Surgery',
        description: 'Surgical tooth extraction, orthognathic correction, jaw pathology, cleft lip/palate, and facial trauma.',
        icon: '🪡',
        keywords: ['maxillofacial', 'oral surgery', 'orthognathic', 'jaw resection', 'cleft palate', 'wisdom tooth'],
      },
      {
        id: 'prosthodontics',
        name: 'Prosthodontics & Materials',
        description: 'Dental ceramics, zirconia restorations, fixed & removable prostheses, and biomimetic bonding.',
        icon: '👑',
        keywords: ['prosthodontics', 'zirconia', 'dental ceramic', 'crown', 'bridge', 'denture', 'veneer'],
      },
      {
        id: 'pediatric_dentistry',
        name: 'Pediatric & Preventive',
        description: 'Early caries prevention, fluoride remineralization, pediatric restorative care, and dental trauma.',
        icon: '🧸',
        keywords: ['pediatric dentistry', 'caries prevention', 'fluoride', 'pulpotomy', 'pediatric oral'],
      },
    ],
  },

  // 3. Computer Science & Artificial Intelligence
  {
    id: 'computer_science',
    name: 'Computer Science & AI',
    icon: '💻',
    description: 'Deep learning, computer vision, large language models, cybersecurity, systems, and algorithms.',
    topics: [
      {
        id: 'computer_vision',
        name: 'Computer Vision & Multimodal AI',
        description: 'Object detection, image segmentation, diffusion models, 3D reconstruction and vision transformers.',
        icon: '👁️',
        keywords: ['computer vision', 'segmentation', 'object detection', 'diffusion', 'vit', 'multimodal'],
        isHot: true,
      },
      {
        id: 'nlp_llms',
        name: 'NLP & Large Language Models',
        description: 'Generative AI, retrieval-augmented generation (RAG), reasoning architectures, and tokenization.',
        icon: '💬',
        keywords: ['nlp', 'llm', 'large language model', 'generative ai', 'rag', 'transformer', 'prompting'],
        isHot: true,
      },
      {
        id: 'machine_learning',
        name: 'Core Machine Learning',
        description: 'Reinforcement learning, optimization algorithms, self-supervised learning, and neural graph networks.',
        icon: '🤖',
        keywords: ['machine learning', 'deep learning', 'reinforcement learning', 'neural network', 'optimization'],
      },
      {
        id: 'cybersecurity',
        name: 'Cybersecurity & Cryptography',
        description: 'Zero-trust architecture, penetration testing, malware defense, post-quantum crypto, and privacy.',
        icon: '🛡️',
        keywords: ['cybersecurity', 'cryptography', 'zero trust', 'malware', 'vulnerability', 'privacy'],
      },
      {
        id: 'software_engineering',
        name: 'Software Systems & Cloud',
        description: 'Distributed computing, microservices, cloud-native architecture, compilers, and performance engineering.',
        icon: '⚙️',
        keywords: ['software engineering', 'distributed systems', 'cloud', 'compiler', 'microservices', 'kubernetes'],
      },
      {
        id: 'robotics_autonomous',
        name: 'Robotics & Autonomous Systems',
        description: 'Mobile robotics, kinematic planning, SLAM navigation, reinforcement learning control, and drones.',
        icon: '🦾',
        keywords: ['robotics', 'autonomous', 'slam', 'drone', 'manipulator', 'kinematics'],
      },
      {
        id: 'quantum_computing',
        name: 'Quantum Computing & Algorithms',
        description: 'Superconducting qubits, quantum error correction, variational quantum algorithms, and gate synthesis.',
        icon: '⚛️',
        keywords: ['quantum computing', 'qubit', 'quantum algorithm', 'quantum error correction', 'quantum circuit'],
      },
    ],
  },

  // 4. Physics & Astronomy
  {
    id: 'physics_astronomy',
    name: 'Physics & Astronomy',
    icon: '🔭',
    description: 'Cosmology, astrophysics, high-energy particle physics, quantum mechanics, and planetary science.',
    topics: [
      {
        id: 'astrophysics',
        name: 'Astrophysics & Cosmology',
        description: 'Dark matter, gravitational waves, black hole accretion, cosmic microwave background, and galactic formation.',
        icon: '🌌',
        keywords: ['astrophysics', 'cosmology', 'black hole', 'dark matter', 'gravitational wave', 'galaxy'],
        isHot: true,
      },
      {
        id: 'quantum_physics',
        name: 'Quantum Mechanics & Optics',
        description: 'Quantum entanglement, Bell inequalities, non-linear optics, photonics, and Bose-Einstein condensates.',
        icon: '⚛️',
        keywords: ['quantum mechanics', 'entanglement', 'photonics', 'optics', 'bose-einstein', 'superposition'],
      },
      {
        id: 'high_energy_particle',
        name: 'High Energy & Particle Physics',
        description: 'Standard model extensions, LHC colliders, neutrino oscillations, Higgs physics, and muon anomalous magnetic moment.',
        icon: '💥',
        keywords: ['particle physics', 'high energy', 'collider', 'cern', 'neutrino', 'higgs', 'quark'],
      },
      {
        id: 'condensed_matter',
        name: 'Condensed Matter Physics',
        description: 'Topological insulators, unconventional superconductivity, graphene, spintronics, and metamaterials.',
        icon: '🧊',
        keywords: ['condensed matter', 'superconductivity', 'topological insulator', 'spintronics', 'semiconductor'],
      },
      {
        id: 'planetary_space',
        name: 'Planetary Science & Spaceflight',
        description: 'Exoplanet atmospheres, James Webb Space Telescope observations, lunar missions, and astrobiology.',
        icon: '🪐',
        keywords: ['planetary', 'exoplanet', 'spacecraft', 'jwst', 'telescope', 'mars', 'lunar'],
        isHot: true,
      },
    ],
  },

  // 5. Chemistry & Materials Science
  {
    id: 'chemistry_materials',
    name: 'Chemistry & Materials',
    icon: '🧪',
    description: 'Organic synthesis, biochemistry, catalysis, battery chemistry, MOFs, and advanced nanomaterials.',
    topics: [
      {
        id: 'organic_chemistry',
        name: 'Organic Chemistry & Catalysis',
        description: 'Total synthesis, transition metal catalysis, asymmetric organocatalysis, and reaction mechanisms.',
        icon: '🌿',
        keywords: ['organic chemistry', 'synthesis', 'catalysis', 'reaction mechanism', 'organocatalyst'],
      },
      {
        id: 'inorganic_materials',
        name: 'Inorganic Chemistry & MOFs',
        description: 'Metal-organic frameworks, porous materials, coordination chemistry, carbon capture, and battery anodes.',
        icon: '🧱',
        keywords: ['inorganic', 'mof', 'metal-organic', 'coordination chemistry', 'porous material', 'crystal'],
      },
      {
        id: 'biochemistry',
        name: 'Biochemistry & Chemical Biology',
        description: 'Protein folding, enzyme kinetics, chemical probes, lipidomics, and metabolic pathway engineering.',
        icon: '🧬',
        keywords: ['biochemistry', 'enzyme', 'protein structure', 'chemical biology', 'metabolite'],
        isHot: true,
      },
      {
        id: 'nanotechnology',
        name: 'Nanomaterials & 2D Sheets',
        description: 'Graphene, MXenes, carbon nanotubes, quantum dots, plasmonic nanoparticles, and nano-composites.',
        icon: '✨',
        keywords: ['nanomaterials', 'graphene', 'nanotechnology', 'quantum dot', 'nanoparticle', 'mxene'],
        isHot: true,
      },
      {
        id: 'polymers_biomaterials',
        name: 'Polymers & Soft Matter',
        description: 'Hydrogels, biodegradable polymers, self-healing elastomers, and synthetic tissue scaffolds.',
        icon: '🧴',
        keywords: ['polymer', 'biomaterial', 'hydrogel', 'elastomer', 'tissue scaffold', 'biodegradable'],
      },
    ],
  },

  // 6. Biological Sciences & Genetics
  {
    id: 'biology_genetics',
    name: 'Biological Sciences & Genetics',
    icon: '🧬',
    description: 'CRISPR gene editing, molecular genetics, microbiology, evolutionary biology, and synthetic biology.',
    topics: [
      {
        id: 'genomics_genetics',
        name: 'Genomics & CRISPR Editing',
        description: 'Base editing, epigenetic regulation, genome sequencing, non-coding RNA, and chromatin architecture.',
        icon: '🔬',
        keywords: ['genomics', 'crispr', 'gene editing', 'genome', 'epigenetics', 'sequencing', 'dna'],
        isHot: true,
      },
      {
        id: 'molecular_cellular',
        name: 'Molecular & Cellular Biology',
        description: 'Cell division, autophagy, organelle signaling, protein synthesis, and cellular senescence.',
        icon: '🧫',
        keywords: ['cellular biology', 'molecular biology', 'autophagy', 'cell signaling', 'senescence'],
      },
      {
        id: 'microbiology_virology',
        name: 'Microbiology & Virology',
        description: 'Antimicrobial resistance, bacterial biofilms, bacteriophages, viral replication, and gut microbiome.',
        icon: '🦠',
        keywords: ['microbiology', 'virology', 'bacteria', 'virus', 'microbiome', 'antimicrobial resistance'],
        isHot: true,
      },
      {
        id: 'immunology',
        name: 'Immunology & Cellular Therapy',
        description: 'T-cell biology, CAR-T therapies, cytokine signaling, autoimmune diseases, and antibody engineering.',
        icon: '🛡️',
        keywords: ['immunology', 'car-t', 't-cell', 'antibody', 'cytokine', 'autoimmune', 'immune'],
      },
      {
        id: 'evolution_ecology',
        name: 'Ecology & Evolutionary Biology',
        description: 'Speciation, biodiversity loss, ecological modeling, conservation genetics, and climate adaptation.',
        icon: '🌱',
        keywords: ['ecology', 'evolution', 'biodiversity', 'conservation', 'climate adaptation', 'ecosystem'],
      },
    ],
  },

  // 7. Engineering & Applied Technology
  {
    id: 'engineering',
    name: 'Engineering & Applied Tech',
    icon: '⚙️',
    description: 'Biomedical engineering, aerospace, microelectronics, renewable energy, and chemical engineering.',
    topics: [
      {
        id: 'biomedical_engineering',
        name: 'Biomedical Engineering & Prosthetics',
        description: 'Neural implants, bionic prosthetics, biosensors, microfluidics (lab-on-a-chip), and medical robotics.',
        icon: '🦿',
        keywords: ['biomedical engineering', 'prosthetics', 'biosensor', 'lab-on-a-chip', 'implant', 'bionic'],
        isHot: true,
      },
      {
        id: 'electrical_electronics',
        name: 'Electrical & Semiconductors',
        description: 'VLSI chip design, Gallium Nitride (GaN) power devices, RF microwave engineering, and photonics ICs.',
        icon: '🔌',
        keywords: ['electrical engineering', 'semiconductor', 'vlsi', 'integrated circuit', 'microelectronics'],
      },
      {
        id: 'mechanical_aerospace',
        name: 'Mechanical & Aerospace',
        description: 'Supersonic aerodynamics, propulsion systems, additive manufacturing (3D printing), and computational fluid dynamics.',
        icon: '🚀',
        keywords: ['aerospace', 'mechanical engineering', 'propulsion', 'aerodynamics', 'cfd', 'additive manufacturing'],
      },
      {
        id: 'energy_sustainability',
        name: 'Energy Storage & Renewables',
        description: 'Solid-state batteries, perovskite solar cells, green hydrogen generation, and grid decarbonization.',
        icon: '⚡',
        keywords: ['battery', 'solar cell', 'renewable energy', 'hydrogen', 'energy storage', 'perovskite'],
        isHot: true,
      },
    ],
  },

  // 8. Neuroscience & Cognitive Science
  {
    id: 'neuroscience',
    name: 'Neuroscience & Brain',
    icon: '🧠',
    description: 'Computational neuroscience, brain-computer interfaces, connectomics, neurodegenerative disorders, and memory.',
    topics: [
      {
        id: 'computational_neuroscience',
        name: 'Computational Neuroscience',
        description: 'Biophysical neural models, spiking neural networks, cognitive architectures, and information theory.',
        icon: '💻',
        keywords: ['computational neuroscience', 'neural modeling', 'spiking network', 'synaptic plasticity'],
      },
      {
        id: 'neuroimaging_connectomics',
        name: 'Neuroimaging & Connectomics',
        description: 'Functional MRI (fMRI), diffusion tensor imaging (DTI), high-density EEG, and whole-brain connectome mapping.',
        icon: '🧲',
        keywords: ['neuroimaging', 'fmri', 'dti', 'connectome', 'eeg', 'brain mapping'],
        isHot: true,
      },
      {
        id: 'bci_neural_interfaces',
        name: 'Brain-Computer Interfaces (BCI)',
        description: 'Intracortical microelectrode arrays, non-invasive EEG decoders, neuromodulation, and closed-loop BCI.',
        icon: '⚡',
        keywords: ['bci', 'brain-computer interface', 'neural decoding', 'neuromodulation', 'neural interface'],
        isHot: true,
      },
      {
        id: 'neurodegenerative',
        name: 'Neurodegenerative Diseases',
        description: 'Amyloid & tau pathology in Alzheimer’s, alpha-synuclein in Parkinson’s, neuroinflammation, and ALS therapies.',
        icon: '🩹',
        keywords: ['alzheimer', 'parkinson', 'neurodegenerative', 'als', 'amyloid', 'tau', 'dementia'],
        isHot: true,
      },
    ],
  },
];

// Universal Taxonomy Topics list for Command Palette & Global Search
export const MEDICAL_CV_TAXONOMY: TaxonomyTopic[] = UNIVERSAL_DISCIPLINES.flatMap((d) =>
  d.topics.map((t) => ({
    id: t.id,
    name: t.name,
    category: d.id,
    description: t.description,
    icon: t.icon,
    gradient: 'from-cyan-500 to-blue-600',
    keywords: t.keywords,
    isHot: t.isHot,
  }))
);

// Flat fallback for backward compatibility
export const DISCOVERY_STORY_TOPICS: StoryTopicItem[] = [
  {
    id: 'all',
    title: 'All Disciplines',
    subtitle: 'Global Research Stream',
    icon: '🌐',
    category: 'all',
    gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
    hasNew: true,
  },
  ...UNIVERSAL_DISCIPLINES.map((d) => ({
    id: d.id,
    title: d.name,
    subtitle: `${d.topics.length} Specializations`,
    icon: d.icon,
    category: d.id,
    gradient: 'from-cyan-500 to-blue-600',
    hasNew: true,
  })),
];
