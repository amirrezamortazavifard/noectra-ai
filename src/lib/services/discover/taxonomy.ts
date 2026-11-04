export interface TaxonomyTopic {
  id: string;
  name: string;
  category: 'medical_imaging' | 'surgical_cv' | 'computational_pathology' | 'advanced_medical_ai' | 'core_ai';
  description: string;
  icon: string;
  gradient: string;
  keywords: string[];
  isHot?: boolean;
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
// Medical Computer Vision & Advanced Medical AI Taxonomy
// ---------------------------------------------------------------------------

export const MEDICAL_CV_TAXONOMY: TaxonomyTopic[] = [
  // Medical Imaging
  {
    id: 'radiology_ai',
    name: 'Radiology AI',
    category: 'medical_imaging',
    description: 'Deep learning for chest X-rays, mammography, and clinical radiology workflows.',
    icon: '🩻',
    gradient: 'from-cyan-500 to-blue-600',
    keywords: ['radiology', 'radiologist', 'chest x-ray', 'cxr', 'mammogram'],
    isHot: true,
  },
  {
    id: 'ct_analysis',
    name: 'CT Analysis',
    category: 'medical_imaging',
    description: 'Volumetric computed tomography reconstruction, organ segmentation, and anomaly detection.',
    icon: '🌀',
    gradient: 'from-blue-500 to-indigo-600',
    keywords: ['computed tomography', 'ct scan', 'contrast ct', 'low-dose ct'],
  },
  {
    id: 'mri_analysis',
    name: 'MRI Analysis',
    category: 'medical_imaging',
    description: 'Multi-parametric MRI, neuroimaging, cardiac MRI, and accelerated acquisition.',
    icon: '🧲',
    gradient: 'from-indigo-500 to-violet-600',
    keywords: ['magnetic resonance', 'mri', 'diffusion mri', 'fmri', 'brain mri'],
    isHot: true,
  },
  {
    id: 'ultrasound_ai',
    name: 'Ultrasound AI',
    category: 'medical_imaging',
    description: 'Point-of-care ultrasound (POCUS), echocardiography, and real-time guidance.',
    icon: '📡',
    gradient: 'from-teal-500 to-cyan-600',
    keywords: ['ultrasound', 'echocardiography', 'sonography', 'pocus', 'doppler'],
  },
  {
    id: 'medical_segmentation',
    name: 'Medical Image Segmentation',
    category: 'medical_imaging',
    description: 'Voxel-level organ boundary delineation, tumor contours, and SAM-Med architectures.',
    icon: '✂️',
    gradient: 'from-cyan-400 to-teal-600',
    keywords: ['segmentation', 'u-net', 'nnunet', 'sam-med', 'contouring'],
    isHot: true,
  },
  {
    id: 'lesion_detection',
    name: 'Lesion Detection',
    category: 'medical_imaging',
    description: 'Automated pulmonary nodule detection, stroke infarct sizing, and lesion localization.',
    icon: '🎯',
    gradient: 'from-emerald-500 to-teal-600',
    keywords: ['lesion detection', 'pulmonary nodule', 'stroke infarct', 'tumor localization'],
  },

  // Surgical Computer Vision
  {
    id: 'surgical_cv',
    name: 'Surgical Computer Vision',
    category: 'surgical_cv',
    description: 'Video understanding for minimally invasive, laparoscopic, and robotic surgery.',
    icon: '🔬',
    gradient: 'from-violet-500 to-purple-700',
    keywords: ['surgical', 'surgery', 'laparoscopic', 'endoscopy', 'robot-assisted'],
    isHot: true,
  },
  {
    id: 'surgical_instrument_detection',
    name: 'Surgical Instrument Tracking',
    category: 'surgical_cv',
    description: 'Real-time tool tracking, articulation pose estimation, and safety zone bounds.',
    icon: '🛠️',
    gradient: 'from-purple-500 to-fuchsia-600',
    keywords: ['surgical instrument', 'tool detection', 'surgical robot', 'instrument tracking'],
  },
  {
    id: 'surgical_phase_recognition',
    name: 'Surgical Workflow & Phase Recognition',
    category: 'surgical_cv',
    description: 'Temporal workflow parsing, surgical phase transition, and step recognition.',
    icon: '⏱️',
    gradient: 'from-fuchsia-500 to-pink-600',
    keywords: ['surgical workflow', 'phase recognition', 'surgical video', 'cholec80'],
  },

  // Computational Pathology
  {
    id: 'computational_pathology',
    name: 'Computational Pathology',
    category: 'computational_pathology',
    description: 'Whole Slide Image (WSI) analysis, cell phenotyping, and digital histopathology.',
    icon: '🧪',
    gradient: 'from-rose-500 to-red-600',
    keywords: ['pathology', 'histopathology', 'whole slide', 'wsi', 'gigapixel'],
    isHot: true,
  },
  {
    id: 'nuclei_segmentation',
    name: 'Cell & Nuclei Segmentation',
    category: 'computational_pathology',
    description: 'Cellular morphometry, nuclei instance segmentation (Hover-Net), and tissue microarrays.',
    icon: '🧬',
    gradient: 'from-red-500 to-amber-600',
    keywords: ['nuclei segmentation', 'cell detection', 'hover-net', 'monusac', 'mitosis'],
  },
  {
    id: 'pathology_foundation_models',
    name: 'Pathology Foundation Models',
    category: 'computational_pathology',
    description: 'Billion-parameter self-supervised encoders trained on multi-institutional gigapixel slides.',
    icon: '🏛️',
    gradient: 'from-amber-500 to-orange-600',
    keywords: ['pathology foundation', 'prov-gigapath', 'virchow', 'uni model', 'conch'],
    isHot: true,
  },

  // Advanced Medical AI
  {
    id: 'medical_foundation_models',
    name: 'Medical Foundation Models',
    category: 'advanced_medical_ai',
    description: 'Large multimodal models integrating clinical text, EHR records, and imaging.',
    icon: '🧠',
    gradient: 'from-cyan-500 to-violet-600',
    keywords: ['medical foundation', 'med-gemini', 'med-palm', 'biomedclip', 'multimodal medical'],
    isHot: true,
  },
  {
    id: 'medical_diffusion',
    name: 'Medical Diffusion Models',
    category: 'advanced_medical_ai',
    description: 'Diffusion for MRI acceleration, low-dose CT de-noising, and counterfactual synthesis.',
    icon: '✨',
    gradient: 'from-violet-500 to-indigo-600',
    keywords: ['medical diffusion', 'score-based', 'counterfactual', 'image reconstruction'],
  },
  {
    id: 'clinical_ai_validation',
    name: 'Clinical AI Validation',
    category: 'advanced_medical_ai',
    description: 'FDA clearance evidence, randomized reader studies, and out-of-distribution audits.',
    icon: '📋',
    gradient: 'from-emerald-500 to-green-600',
    keywords: ['clinical validation', 'fda clearance', 'reader study', 'audit', 'generalizability'],
  },
];

// ---------------------------------------------------------------------------
// Instagram Stories-Style Topic Discovery Strip Items
// ---------------------------------------------------------------------------

export const DISCOVERY_STORY_TOPICS: StoryTopicItem[] = [
  {
    id: 'all',
    title: 'All Topics',
    subtitle: 'Global Stream',
    icon: '🌐',
    category: 'all',
    gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
    hasNew: true,
  },
  {
    id: 'medical_cv',
    title: 'Medical AI',
    subtitle: 'Imaging & Vision',
    icon: '🩺',
    category: 'medical_cv',
    gradient: 'from-cyan-400 via-teal-500 to-emerald-500',
    hasNew: true,
  },
  {
    id: 'radiology_ai',
    title: 'Radiology AI',
    subtitle: 'CT, MRI & X-ray',
    icon: '🩻',
    category: 'medical_cv',
    gradient: 'from-blue-500 to-cyan-500',
    hasNew: true,
  },
  {
    id: 'computational_pathology',
    title: 'Pathology AI',
    subtitle: 'Whole Slide WSI',
    icon: '🧪',
    category: 'medical_cv',
    gradient: 'from-rose-500 to-red-600',
    hasNew: true,
  },
  {
    id: 'surgical_cv',
    title: 'Surgical Vision',
    subtitle: 'Robotics & Video',
    icon: '🔬',
    category: 'medical_cv',
    gradient: 'from-violet-500 to-purple-600',
    hasNew: false,
  },
  {
    id: 'medical_foundation_models',
    title: 'Foundation',
    subtitle: 'Medical VLMs',
    icon: '🧠',
    category: 'medical_cv',
    gradient: 'from-purple-500 to-pink-500',
    hasNew: true,
  },
  {
    id: 'vision_transformers',
    title: 'Vision Transformers',
    subtitle: 'ViT & Attention',
    icon: '👁️',
    category: 'ai',
    gradient: 'from-amber-500 to-orange-600',
    hasNew: false,
  },
  {
    id: 'medical_segmentation',
    title: 'Segmentation',
    subtitle: 'SAM-Med & U-Net',
    icon: '✂️',
    category: 'medical_cv',
    gradient: 'from-emerald-500 to-teal-600',
    hasNew: true,
  },
  {
    id: 'huggingface_models',
    title: 'New Models',
    subtitle: 'Hugging Face',
    icon: '🤗',
    category: 'models',
    gradient: 'from-yellow-500 to-amber-600',
    hasNew: true,
  },
  {
    id: 'clinical_ai_validation',
    title: 'Clinical Trials',
    subtitle: 'FDA & Validation',
    icon: '⚖️',
    category: 'medical_cv',
    gradient: 'from-green-500 to-emerald-600',
    hasNew: false,
  },
];

