export interface CouncilMember {
  id: number;
  name: string;
  role: string;
  team: 'Core Leadership' | 'Tech & Web' | 'UI/UX & Design' | 'Events & Ops' | 'PR & Outreach';
  trackTitle: string;
  duration: string;
  bio: string;
  techStack: string[];
  avatarBg: string;
  avatarIcon: string;
  quote: string;
  socials: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    email?: string;
  };
}

export const councilMembers: CouncilMember[] = [
  {
    id: 1,
    name: 'Movin',
    role: 'GDG CRCE Lead',
    team: 'Core Leadership',
    trackTitle: 'System Architect & Lead Developer',
    duration: '3:45',
    bio: 'Architecting high-performance web applications and driving the tech ecosystem at GDG CRCE with 60 FPS precision.',
    techStack: ['Next.js', 'GSAP', 'WebGL', 'System Architecture'],
    avatarBg: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    avatarIcon: '⚡',
    quote: 'New Hardware Found: Lead Processor Operating at Peak Efficiency',
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
    },
  },
  {
    id: 2,
    name: 'Sir Harvey York',
    role: 'Barkend Developer & Mascot Lead',
    team: 'Core Leadership',
    trackTitle: 'Barkend Developer (Remix)',
    duration: '3:25',
    bio: 'Ensuring zero dropped treats and 99.9% uptime on morale across all student council operations.',
    techStack: ['Treat Optimization', 'Barkend APIs', 'Security Patrol', 'Tailwind'],
    avatarBg: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
    avatarIcon: '🐶',
    quote: 'Windows Audio Notification: Woof.exe executed successfully.',
    socials: {
      github: 'https://github.com',
      instagram: 'https://instagram.com',
    },
  },
  {
    id: 3,
    name: 'Aarav Sharma',
    role: 'Co-Lead & Strategy Head',
    team: 'Core Leadership',
    trackTitle: 'Executive Pipeline (Extended Cut)',
    duration: '4:10',
    bio: 'Bridging technical execution with strategic community initiatives to scale GDG CRCE across campuses.',
    techStack: ['Community Scale', 'Product Roadmap', 'Public Speaking'],
    avatarBg: 'linear-gradient(135deg, #13547a 0%, #80d0c7 100%)',
    avatarIcon: '🎯',
    quote: 'Task Manager: All strategic threads running smoothly.',
    socials: {
      linkedin: 'https://linkedin.com',
      email: 'aarav@gdgcrce.edu',
    },
  },
  {
    id: 4,
    name: 'Rohan Mehta',
    role: 'Tech & Web Lead',
    team: 'Tech & Web',
    trackTitle: 'Fullstack Rhapsody in C# & TS',
    duration: '3:50',
    bio: 'Obsessed with clean architecture, React Server Components, and zero-latency micro-interactions.',
    techStack: ['TypeScript', 'React 19', 'Node.js', 'Docker'],
    avatarBg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    avatarIcon: '💻',
    quote: 'Firewall Status: 0 bugs detected in production pipeline.',
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
  },
  {
    id: 5,
    name: 'Ananya Iyer',
    role: 'AI & ML Lead',
    team: 'Tech & Web',
    trackTitle: 'TensorFlow Symphony No. 9',
    duration: '4:20',
    bio: 'Building intelligent autonomous agents and deploying edge-optimized deep learning models.',
    techStack: ['PyTorch', 'Gemini AI', 'Python', 'Vector DBs'],
    avatarBg: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
    avatarIcon: '🧠',
    quote: 'Neural Net Trained: Convergence achieved at epoch 100.',
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
  },
  {
    id: 6,
    name: 'Karan Patel',
    role: 'App Development Lead',
    team: 'Tech & Web',
    trackTitle: 'Flutter & Kotlin Groove',
    duration: '3:15',
    bio: 'Crafting responsive cross-platform mobile apps with native 120Hz gesture animations.',
    techStack: ['Flutter', 'Kotlin', 'SwiftUI', 'Firebase'],
    avatarBg: 'linear-gradient(135deg, #00b4db 0%, #0083b0 100%)',
    avatarIcon: '📱',
    quote: 'Mobile Sync: APK compiled and ready for deployment.',
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
  },
  {
    id: 7,
    name: 'Priya Nair',
    role: 'Cloud & DevOps Lead',
    team: 'Tech & Web',
    trackTitle: 'Kubernetes Cluster (Remastered)',
    duration: '3:40',
    bio: 'Automating multi-region deployments on Google Cloud with zero downtime and instant failover.',
    techStack: ['Google Cloud', 'Kubernetes', 'Terraform', 'CI/CD'],
    avatarBg: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)',
    avatarIcon: '☁️',
    quote: 'GCP Service Alert: Auto-scaling triggered under load.',
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
  },
  {
    id: 8,
    name: 'Sneha Kulkarni',
    role: 'UI/UX & Creative Head',
    team: 'UI/UX & Design',
    trackTitle: 'Sunékheia Design Tokens (Acoustic)',
    duration: '3:33',
    bio: 'Designing timeless interfaces that honor historical visual culture while feeling hyper-modern.',
    techStack: ['Figma', 'Design Systems', 'Typography', 'Motion Design'],
    avatarBg: 'linear-gradient(135deg, #ec008c 0%, #fc6767 100%)',
    avatarIcon: '🎨',
    quote: 'Color Profile Loaded: sRGB accurate down to the pixel.',
    socials: {
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
    },
  },
  {
    id: 9,
    name: 'Devraj Singh',
    role: '3D & Motion Specialist',
    team: 'UI/UX & Design',
    trackTitle: 'Draco Compression Dubstep',
    duration: '4:02',
    bio: 'Creating cinematic WebGL shaders, retro Windows XP aesthetics, and 3D spline animations.',
    techStack: ['Three.js', 'Blender', 'GLSL Shaders', 'GSAP'],
    avatarBg: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)',
    avatarIcon: '🌐',
    quote: 'DirectX 9.0 Enabled: Hardware accelerated shaders active.',
    socials: {
      github: 'https://github.com',
      instagram: 'https://instagram.com',
    },
  },
  {
    id: 10,
    name: 'Vikram Deshmukh',
    role: 'Events & Operations Lead',
    team: 'Events & Ops',
    trackTitle: 'Hackathon Logistics VIP Mix',
    duration: '3:55',
    bio: 'Orchestrating 500+ attendee hackathons, speaker sessions, and tech festivals smoothly.',
    techStack: ['Event Planning', 'Sponsorships', 'Logistics', 'Operations'],
    avatarBg: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
    avatarIcon: '🎪',
    quote: 'System Sound: Stage lights green, auditorium ready.',
    socials: {
      linkedin: 'https://linkedin.com',
      email: 'events@gdgcrce.edu',
    },
  },
  {
    id: 11,
    name: 'Nisha Gupta',
    role: 'Operations & Sponsorship Head',
    team: 'Events & Ops',
    trackTitle: 'Corporate Relations Ballad',
    duration: '3:18',
    bio: 'Building industry partnerships and securing resources for cutting-edge student workshops.',
    techStack: ['Partner Relations', 'Budgeting', 'Vendor Management'],
    avatarBg: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
    avatarIcon: '🤝',
    quote: 'Sponsorship Packet: Delivered with high priority.',
    socials: {
      linkedin: 'https://linkedin.com',
    },
  },
  {
    id: 12,
    name: 'Aditya Verma',
    role: 'PR & Outreach Lead',
    team: 'PR & Outreach',
    trackTitle: 'Viral Transmission (Radio Edit)',
    duration: '2:58',
    bio: 'Amplifying GDG CRCE stories across campuses and creating buzz worthy tech campaigns.',
    techStack: ['Public Relations', 'Brand Strategy', 'Copywriting'],
    avatarBg: 'linear-gradient(135deg, #e65c00 0%, #F9D423 100%)',
    avatarIcon: '📢',
    quote: 'Broadcast Message: Reach engagement up by 240%.',
    socials: {
      linkedin: 'https://linkedin.com',
      instagram: 'https://instagram.com',
    },
  },
  {
    id: 13,
    name: 'Tanvi Joshi',
    role: 'Social Media & Editorial Lead',
    team: 'PR & Outreach',
    trackTitle: 'Y2K Aesthetic Chronicle',
    duration: '3:12',
    bio: 'Curating engaging reels, newsletters, and visual narratives for the developer community.',
    techStack: ['Content Direction', 'Reels Production', 'Editorial Layout'],
    avatarBg: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)',
    avatarIcon: '📸',
    quote: 'New Media File: Exported in 4K resolution.',
    socials: {
      instagram: 'https://instagram.com',
      linkedin: 'https://linkedin.com',
    },
  },
  {
    id: 14,
    name: 'Siddharth Rao',
    role: 'Open Source & Community Mentor',
    team: 'Tech & Web',
    trackTitle: 'Git Rebase & Merge Anthem',
    duration: '3:48',
    bio: 'Guiding first-time contributors through open source maintainership and collaborative coding.',
    techStack: ['Git/GitHub', 'Linux Engine', 'Open Source', 'Mentorship'],
    avatarBg: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
    avatarIcon: '🚀',
    quote: 'Pull Request #2026: Approved and merged into main.',
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
  },
];

export const teamsList = [
  'All Tracks',
  'Core Leadership',
  'Tech & Web',
  'UI/UX & Design',
  'Events & Ops',
  'PR & Outreach',
] as const;
