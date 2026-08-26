import { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowUpRight, X, Sparkles, ChevronLeft, ChevronRight, Eye, Download } from 'lucide-react';
import rawPortfolioData from './portfolio-data.json';

interface ProjectItem {
  id: string;
  title: string;
  type: 'social' | 'tshirt' | 'cards';
  folder: string;
  image: string;
  originalName: string;
  categoryName: string;
  desc: string;
  services?: string[];
  subCategory?: string;
  subCategoryLabel?: string;
}

// Enhance raw items with curated category tags & descriptions
const allProjects: ProjectItem[] = rawPortfolioData.map((item: any) => {
  let categoryName = 'Social Media & Marketing';
  let desc = 'High-impact creative design and campaign visual storytelling engineered to captivate audiences.';

  if (item.folder === 'tshirt') {
    categoryName = 'Apparel & T-Shirt Design';
    desc = 'Bold illustrative streetwear artwork blending striking typography with custom conceptual graphics.';
  } else if (item.folder === 'cards') {
    categoryName = 'Logo & Brand Identity';
    desc = 'Premium corporate stationery, tactile print finishes, and distinctive brand identity systems.';
  } else if (item.title.toLowerCase().includes('car')) {
    categoryName = 'Automotive Launch & Carousel';
    desc = 'Dynamic automotive visual design showcasing speed, engineering precision, and sleek aesthetics.';
  } else if (item.title.toLowerCase().includes('headphone')) {
    categoryName = 'Audio & Product Launch';
    desc = 'Studio acoustics product launch visual with high-contrast cinematic lighting.';
  } else if (item.title.toLowerCase().includes('watch')) {
    categoryName = 'Luxury Timepiece Campaign';
    desc = 'Precision product lighting and timeless luxury aesthetic crafted for high-end watch collections.';
  } else if (item.title.toLowerCase().includes('phone')) {
    categoryName = 'Technology & Smartphone';
    desc = 'Next-gen flagship smartphone campaign with feature callouts and sleek isometric framing.';
  } else if (item.title.toLowerCase().includes('papad') || item.title.toLowerCase().includes('weffer') || item.title.toLowerCase().includes('vasaline')) {
    categoryName = 'FMCG & Packaging Creative';
    desc = 'Vibrant product storytelling, brand packaging aesthetics, and consumer engagement visuals.';
  }

  return {
    ...item,
    type: item.type as 'social' | 'tshirt' | 'cards',
    categoryName,
    desc,
  };
});

const categories = [
  { label: 'All Works', value: 'all', count: allProjects.length },
  { label: 'Social Media Marketing', value: 'social-media-marketing', count: allProjects.filter((p) => p.services?.includes('social-media-marketing')).length },
  { label: 'Logo Design', value: 'logo-design', count: allProjects.filter((p) => p.services?.includes('logo-design')).length },
  { label: 'Poster Design', value: 'poster-design', count: allProjects.filter((p) => p.services?.includes('poster-design')).length },
  { label: 'Packaging Design', value: 'packaging-design', count: allProjects.filter((p) => p.services?.includes('packaging-design')).length },
  { label: 'T-Shirt & Apparel', value: 'apparel-graphics', count: allProjects.filter((p) => p.type === 'tshirt' || p.services?.includes('apparel-graphics')).length },
];

// Custom Icons matching user reference screenshot
function MasonryIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <rect x="2" y="2" width="7" height="6.5" rx="1.5" />
      <rect x="2" y="10.5" width="7" height="7.5" rx="1.5" />
      <rect x="11" y="2" width="7" height="9.5" rx="1.5" />
      <rect x="11" y="13.5" width="7" height="4.5" rx="1.5" />
    </svg>
  );
}

function Grid3x3Icon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <rect x="2" y="2" width="4.5" height="4.5" rx="1.2" />
      <rect x="7.75" y="2" width="4.5" height="4.5" rx="1.2" />
      <rect x="13.5" y="2" width="4.5" height="4.5" rx="1.2" />
      <rect x="2" y="7.75" width="4.5" height="4.5" rx="1.2" />
      <rect x="7.75" y="7.75" width="4.5" height="4.5" rx="1.2" />
      <rect x="13.5" y="7.75" width="4.5" height="4.5" rx="1.2" />
      <rect x="2" y="13.5" width="4.5" height="4.5" rx="1.2" />
      <rect x="7.75" y="13.5" width="4.5" height="4.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="4.5" height="4.5" rx="1.2" />
    </svg>
  );
}

type ViewMode = 'masonry' | 'grid';

const viewOptions = [
  { mode: 'masonry' as ViewMode, label: 'Masonry', icon: MasonryIcon, title: 'Natural image size masonry' },
  { mode: 'grid' as ViewMode, label: 'Grid', icon: Grid3x3Icon, title: 'Uniform grid layout' },
];

export default function Portfolio() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [activeProjectIndex, setActiveProjectIndex] = useState<number | null>(null);
  const [displayCount, setDisplayCount] = useState(16);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const filteredProjects = useMemo(() => {
    if (activeCategory === 'all') return allProjects;
    return allProjects.filter((p) => {
      if (activeCategory === 'apparel-graphics') {
        return p.type === 'tshirt' || p.services?.includes('apparel-graphics');
      }
      return p.services && p.services.includes(activeCategory);
    });
  }, [activeCategory]);

  const visibleProjects = useMemo(() => {
    return filteredProjects.slice(0, displayCount);
  }, [filteredProjects, displayCount]);

  // Handle keyboard navigation for modal
  useEffect(() => {
    if (activeProjectIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveProjectIndex(null);
      if (e.key === 'ArrowRight') {
        setActiveProjectIndex((prev) => (prev !== null ? (prev + 1) % filteredProjects.length : null));
      }
      if (e.key === 'ArrowLeft') {
        setActiveProjectIndex((prev) => (prev !== null ? (prev - 1 + filteredProjects.length) % filteredProjects.length : null));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProjectIndex, filteredProjects.length]);

  return (
    <section ref={sectionRef} id="work" className="relative py-32 px-6 max-w-7xl mx-auto">
      <div className={`section-reveal ${visible ? 'visible' : ''} mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6`}>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-ember" />
            <p className="section-label">Selected Work</p>
          </div>
          <h2 className="section-title max-w-3xl">
            An infinite canvas of{' '}
            <span className="text-gradient">creative milestones.</span>
          </h2>
        </div>
        <p className="text-sm text-white/40 max-w-xs leading-relaxed">
          Explore our complete showcase of 48+ crafted brand campaigns, poster designs, streetwear graphics, and identity systems.
        </p>
      </div>

      {/* Controls Bar: Category Filter & Visualization View Switcher */}
      <div className={`section-reveal ${visible ? 'visible' : ''} flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10`}>
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setActiveCategory(cat.value as any);
                setDisplayCount(16);
              }}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                activeCategory === cat.value
                  ? 'bg-ember text-white ember-glow-sm shadow-[0_0_15px_rgba(255,90,31,0.3)]'
                  : 'bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.07] border border-white/10'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeCategory === cat.value
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/40'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Visualization View Switcher (Exact User Screenshot Style) */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/10 self-start lg:self-auto shadow-inner">
          {viewOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = viewMode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => setViewMode(opt.mode)}
                title={opt.title}
                className={`p-2.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center ${
                  isActive
                    ? 'bg-white/15 text-white shadow-md border border-white/15'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
                aria-label={opt.title}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Image-Fit Gallery Layouts */}
      {viewMode === 'masonry' ? (
        /* Seamless Natural Image Fit Masonry (3 Columns) */
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
          {visibleProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => setActiveProjectIndex(filteredProjects.indexOf(project))}
              className="group relative mb-6 break-inside-avoid rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer bg-[#111] border border-white/10 hover:border-ember/50 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(255,90,31,0.22)]"
            >
              {/* Pure Artwork Image (Natural Height Fit) */}
              <img
                src={project.image}
                alt={project.title}
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-contain block transition-transform duration-700 group-hover:scale-105"
              />

              {/* Smooth Dark Gradient Vignette Overlay on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Floating Category Pill (Top Left) */}
              <div className="absolute top-3.5 left-3.5 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-1 group-hover:translate-y-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-obsidian/85 backdrop-blur-md border border-white/15 text-white/90 shadow-md">
                  {project.categoryName.split('&')[0].trim()}
                </span>
              </div>

              {/* Floating Action Pill (Bottom Right - Freepik Style) */}
              <div className="absolute bottom-3.5 right-3.5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-obsidian/85 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/90 shadow-lg opacity-0 group-hover:opacity-100 group-hover:bg-ember group-hover:border-ember transition-all duration-300">
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </div>

              {/* Project Title (Bottom Left Overlay on Hover) */}
              <div className="absolute bottom-3.5 left-3.5 right-20 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                <h3 className="text-sm font-bold text-white line-clamp-1 drop-shadow-md">
                  {project.title}
                </h3>
                <p className="text-[11px] text-ember-light font-medium line-clamp-1">
                  {project.categoryName}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Standard Uniform 3-Column Grid with Best-Fit 4:5 Card Proportions */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => setActiveProjectIndex(filteredProjects.indexOf(project))}
              className="group relative aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer bg-[#0e0e0e] border border-white/10 hover:border-ember/50 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(255,90,31,0.22)] flex items-center justify-center"
            >
              {/* Image Centered and Contained within Uniform 4:5 Card */}
              <img
                src={project.image}
                alt={project.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain block transition-transform duration-700 group-hover:scale-105"
              />

              {/* Hover Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Floating Category Pill (Top Left) */}
              <div className="absolute top-3.5 left-3.5 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-1 group-hover:translate-y-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-obsidian/85 backdrop-blur-md border border-white/15 text-white/90 shadow-md">
                  {project.categoryName.split('&')[0].trim()}
                </span>
              </div>

              {/* Floating Action Pill (Bottom Right - Freepik Style) */}
              <div className="absolute bottom-3.5 right-3.5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-obsidian/85 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/90 shadow-lg opacity-0 group-hover:opacity-100 group-hover:bg-ember group-hover:border-ember transition-all duration-300">
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </div>

              {/* Project Title (Bottom Left Overlay on Hover) */}
              <div className="absolute bottom-3.5 left-3.5 right-20 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                <h3 className="text-sm font-bold text-white line-clamp-1 drop-shadow-md">
                  {project.title}
                </h3>
                <p className="text-[11px] text-ember-light font-medium line-clamp-1">
                  {project.categoryName}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show More Button */}
      {displayCount < filteredProjects.length && (
        <div className="flex justify-center mt-14">
          <button
            type="button"
            onClick={() => setDisplayCount((prev) => Math.min(prev + 16, filteredProjects.length))}
            className="magnetic-btn px-8 py-3.5 rounded-full border border-white/20 bg-white/[0.04] text-xs font-semibold uppercase tracking-widest text-white hover:border-ember/40 hover:bg-ember/10 hover:text-ember transition-all duration-300 cursor-pointer shadow-lg"
          >
            Show More Works ({filteredProjects.length - displayCount} remaining)
          </button>
        </div>
      )}

      {/* Full-Screen Immersive Artwork Studio Viewer */}
      {activeProjectIndex !== null && filteredProjects[activeProjectIndex] && (
        <div
          className="fixed inset-0 z-[200] bg-[#070707] flex flex-col w-screen h-screen overflow-hidden animate-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Full-Width Top Bar */}
          <div className="h-20 px-6 sm:px-10 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a] shrink-0 z-30">
            {/* Left: Project Title & Category */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-white/[0.05] border border-white/15 text-white/80">
                {filteredProjects[activeProjectIndex].categoryName.split('&')[0].trim()}
              </span>
              <h3 className="text-base sm:text-xl font-bold text-white line-clamp-1">
                {filteredProjects[activeProjectIndex].title}
              </h3>
            </div>

            {/* Center: Counter & Navigation Arrows */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveProjectIndex((prev) => (prev !== null ? (prev - 1 + filteredProjects.length) % filteredProjects.length : null));
                }}
                className="w-10 h-10 rounded-full glass-card border border-white/15 flex items-center justify-center hover:bg-ember hover:border-ember transition-colors cursor-pointer"
                aria-label="Previous artwork"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>

              <span className="text-xs font-mono font-bold text-ember px-3 py-1 rounded-full bg-ember/10 border border-ember/30 shadow-[0_0_10px_rgba(255,90,31,0.2)]">
                {activeProjectIndex + 1} / {filteredProjects.length}
              </span>

              <button
                onClick={() => {
                  setActiveProjectIndex((prev) => (prev !== null ? (prev + 1) % filteredProjects.length : null));
                }}
                className="w-10 h-10 rounded-full glass-card border border-white/15 flex items-center justify-center hover:bg-ember hover:border-ember transition-colors cursor-pointer"
                aria-label="Next artwork"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Right: Download, Inquiry & Close */}
            <div className="flex items-center gap-3">
              <a
                href={filteredProjects[activeProjectIndex].image}
                download={`${filteredProjects[activeProjectIndex].title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-aagspire.webp`}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/[0.04] text-white hover:border-ember/50 hover:bg-ember/10 hover:text-ember transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
                title="Download High-Res Artwork"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </a>

              <a
                href="#contact"
                onClick={() => setActiveProjectIndex(null)}
                className="hidden md:flex items-center gap-1.5 px-5 py-2 rounded-full bg-ember hover:bg-ember-light text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,90,31,0.3)] cursor-pointer"
              >
                <span>Start Project</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setActiveProjectIndex(null)}
                className="w-10 h-10 rounded-full glass-card border border-white/20 flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
                aria-label="Close viewer"
              >
                <X className="w-5 h-5 text-white/90" />
              </button>
            </div>
          </div>

          {/* Full-Screen Main Content Body */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left/Center: Immense Artwork Canvas */}
            <div className="flex-1 bg-[#050505] p-4 sm:p-8 lg:p-12 flex items-center justify-center overflow-hidden relative">
              <img
                src={filteredProjects[activeProjectIndex].image}
                alt={filteredProjects[activeProjectIndex].title}
                className="max-h-[82vh] max-w-full w-auto object-contain rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
              />
            </div>

            {/* Right: Full Details Sidebar Panel */}
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0a0a0a] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto shrink-0 max-h-[35vh] lg:max-h-full">
              <div>
                <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">
                  {filteredProjects[activeProjectIndex].categoryName}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">
                  {filteredProjects[activeProjectIndex].title}
                </h2>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                  {filteredProjects[activeProjectIndex].desc}
                </p>

                {/* Studio Quality Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/60">
                    Original Artwork
                  </span>
                  <span className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/60">
                    Aagspire Studio Design
                  </span>
                  <span className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/60">
                    High Resolution WebP
                  </span>
                </div>
              </div>

              {/* Action Buttons in Panel */}
              <div className="pt-6 border-t border-white/10 flex flex-col gap-3 mt-auto">
                <a
                  href={filteredProjects[activeProjectIndex].image}
                  download={`${filteredProjects[activeProjectIndex].title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-aagspire.webp`}
                  className="w-full py-3.5 px-5 rounded-xl border border-white/15 bg-white/[0.04] text-white hover:border-ember/50 hover:bg-ember/10 hover:text-ember transition-all font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full Artwork</span>
                </a>

                <a
                  href="#contact"
                  onClick={() => setActiveProjectIndex(null)}
                  className="w-full py-3.5 px-5 rounded-xl bg-ember hover:bg-ember-light text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,90,31,0.35)] cursor-pointer"
                >
                  <span>Request Similar Project</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

