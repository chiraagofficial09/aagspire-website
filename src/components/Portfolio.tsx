import { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowUpRight, X, Sparkles, ChevronLeft, ChevronRight, Eye, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ImageWithLoader } from './ImageWithLoader';
import { FireLogo } from './FireLogo';
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
  ratio?: number;
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
  } else if (item.folder === 'logos') {
    categoryName = 'Brand & Logo Presentation';
    desc = 'Complete brand identity systems, vector logo construction, visual guidelines, and real-world mockups.';
  } else if (item.folder === 'websliders') {
    categoryName = 'UI/UX & Web Design';
    desc = 'Immersive web slider concept designs with premium visual storytelling and modern UI layouts.';
  } else if (item.folder === 'posts' && item.title?.includes('FIFA')) {
    categoryName = 'Sports & Campaign Poster';
    desc = 'Cinematic sports poster design series featuring bold typography and dramatic visual composition.';
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
  { label: 'Business Cards', value: 'business-cards', count: allProjects.filter((p) => p.services?.includes('business-cards')).length },
  { label: 'Poster Design', value: 'poster-design', count: allProjects.filter((p) => p.services?.includes('poster-design')).length },
  { label: 'Packaging Design', value: 'packaging-design', count: allProjects.filter((p) => p.services?.includes('packaging-design')).length },
  { label: 'T-Shirt & Apparel', value: 'apparel-graphics', count: allProjects.filter((p) => p.type === 'tshirt' || p.services?.includes('apparel-graphics')).length },
  { label: 'UI/UX & Web', value: 'ui-ux-web-development', count: allProjects.filter((p) => p.services?.includes('ui-ux-web-development')).length },
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
  const [portfolioZoom, setPortfolioZoom] = useState<number>(1);

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

  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolioLoadedCount, setPortfolioLoadedCount] = useState(0);

  // Monitor image loading for all artworks in current portfolio batch (guaranteed 1s showcase of Fire Logo)
  useEffect(() => {
    if (!visibleProjects.length) {
      setPortfolioLoading(false);
      return;
    }

    setPortfolioLoading(true);
    setPortfolioLoadedCount(0);

    const startTime = Date.now();
    const minLoadingTime = 1000; // Display Fire Logo for at least 1 second
    let loaded = 0;
    let isCancelled = false;
    let finishTimer: ReturnType<typeof setTimeout> | null = null;
    const total = visibleProjects.length;

    const finishLoading = () => {
      if (isCancelled) return;
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, minLoadingTime - elapsed);
      finishTimer = setTimeout(() => {
        if (!isCancelled) {
          setPortfolioLoadedCount(total);
          setPortfolioLoading(false);
        }
      }, delay);
    };

    const onComplete = () => {
      if (isCancelled) return;
      loaded += 1;
      setPortfolioLoadedCount(loaded);
      if (loaded >= total) {
        finishLoading();
      }
    };

    visibleProjects.forEach((proj) => {
      const img = new window.Image();
      img.src = proj.image;
      if (img.complete && img.naturalWidth > 0) {
        onComplete();
      } else {
        img.onload = onComplete;
        img.onerror = onComplete;
      }
    });

    const fallbackTimer = setTimeout(() => {
      if (!isCancelled) finishLoading();
    }, 4000);

    return () => {
      isCancelled = true;
      if (finishTimer) clearTimeout(finishTimer);
      clearTimeout(fallbackTimer);
    };
  }, [visibleProjects]);

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

      {/* Controls Bar: Category Filter & Visualization View Switcher (Sticky under navbar) */}
      <div className={`section-reveal ${visible ? 'visible' : ''} sticky top-20 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-[#050505]/95 backdrop-blur-xl border-y border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.6)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10 transition-all duration-300`}>
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
      {portfolioLoading ? (
        <div className="space-y-8 animate-fade-up">
          {/* Progress Header featuring Aagspire Fire Flame Loading Badge */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#0d0d0d] border border-white/10 shadow-2xl relative overflow-hidden">
            {/* Ambient fiery backdrop glow */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-ember/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.04] border border-ember/30 shadow-[0_0_25px_rgba(255,90,31,0.25)] shrink-0">
                {/* Expanding subtle pulse */}
                <div className="absolute inset-0 rounded-2xl border border-ember/40 animate-ping opacity-20 pointer-events-none" />
                {/* Rotating ember dash orbit ring */}
                <div className="absolute inset-1 rounded-xl border border-dashed border-ember/40 animate-spin [animation-duration:8s] pointer-events-none" />
                {/* Fire Logo Center */}
                <FireLogo className="w-8 h-8 drop-shadow-[0_0_14px_rgba(255,90,31,0.9)]" animated glow />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm sm:text-base font-bold text-white tracking-wide">
                    Loading Artworks & Presentations
                  </p>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-ember/15 border border-ember/30 text-ember font-semibold">
                    Live Render
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-0.5">
                  Optimizing visual showcases...
                </p>
              </div>
            </div>

            <div className="w-full sm:w-72 flex items-center gap-3 relative z-10">
              <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden p-[1px]">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-ember to-amber-400 transition-all duration-300 rounded-full shadow-[0_0_14px_rgba(255,90,31,0.7)]"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((portfolioLoadedCount / Math.max(1, visibleProjects.length)) * 100)
                    )}%`,
                  }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-ember shrink-0">
                {portfolioLoadedCount}/{visibleProjects.length}
              </span>
            </div>
          </div>

          {/* Skeleton Gallery Cards with Centered Glowing Fire Logo */}
          <div
            className={
              viewMode === 'masonry'
                ? 'columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]'
                : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
            }
          >
            {[340, 420, 300, 380, 440, 320].map((h, idx) => (
              <div
                key={idx}
                className={`mb-6 break-inside-avoid rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0d0d0d] border border-white/5 relative p-5 flex flex-col justify-between ${
                  viewMode === 'masonry' ? '' : 'aspect-[4/5]'
                }`}
                style={viewMode === 'masonry' ? { height: `${h}px` } : undefined}
              >
                <div className="skeleton-shimmer" />

                {/* Top corner subtle badge placeholder */}
                <div className="relative z-10 flex justify-between items-center">
                  <div className="h-4 w-16 bg-white/5 rounded-full border border-white/5" />
                  <div className="w-2 h-2 rounded-full bg-ember/40 animate-pulse" />
                </div>

                {/* Center Glowing Fire Logo in each skeleton card while images are loading */}
                <div className="relative z-10 flex flex-col items-center justify-center my-auto py-8">
                  <div className="relative flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full border border-white/10 border-t-ember/70 animate-spin [animation-duration:2.5s]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FireLogo className="w-7 h-7 opacity-85" animated glow />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 mt-3">
                    Loading
                  </span>
                </div>

                {/* Bottom title & tags placeholder */}
                <div className="relative z-10 space-y-2">
                  <div className="h-3 w-1/3 bg-white/10 rounded-full" />
                  <div className="h-4 w-2/3 bg-white/10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'masonry' ? (
        /* Seamless Natural Image Fit Masonry (3 Columns) */
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance] animate-fade-up">
          {visibleProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => setActiveProjectIndex(filteredProjects.indexOf(project))}
              className="group relative mb-6 break-inside-avoid rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer bg-[#111] border border-white/10 hover:border-ember/50 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(255,90,31,0.22)]"
            >
              {/* Pure Artwork Image (Natural Height Fit with Loading State) */}
              <ImageWithLoader
                src={project.image}
                alt={project.title}
                loading="lazy"
                decoding="async"
                minHeight="220px"
                wrapperClassName="w-full"
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
          {visibleProjects.map((project) => {
            const isCaseStudy = project.folder === 'logos' || project.subCategory === 'case-study';

            return (
              <div
                key={project.id}
                onClick={() => {
                  setActiveProjectIndex(filteredProjects.indexOf(project));
                  setPortfolioZoom(1);
                }}
                className="group relative aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer bg-[#0e0e0e] border border-white/10 hover:border-ember/50 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(255,90,31,0.22)] flex items-center justify-center"
              >
                {/* Image Centered and Contained or Top-Aligned for Case Studies */}
                <ImageWithLoader
                  src={project.image}
                  alt={project.title}
                  loading="lazy"
                  decoding="async"
                  wrapperClassName="w-full h-full"
                  className={`w-full h-full block transition-transform duration-700 group-hover:scale-105 ${
                    isCaseStudy ? 'object-cover object-top' : 'object-contain'
                  }`}
                />

                {/* Case Study Badge */}
                {isCaseStudy && (
                  <div className="absolute top-3.5 left-3.5 z-10">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/85 backdrop-blur-md border border-ember/40 text-ember shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                      <Sparkles className="w-3 h-3" />
                      <span>Full Case Study</span>
                    </span>
                  </div>
                )}

                {/* Hover Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Floating Category Pill (Top Left - when not case study) */}
                {!isCaseStudy && (
                  <div className="absolute top-3.5 left-3.5 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-1 group-hover:translate-y-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-obsidian/85 backdrop-blur-md border border-white/15 text-white/90 shadow-md">
                      {project.categoryName.split('&')[0].trim()}
                    </span>
                  </div>
                )}

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
            );
          })}
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
      {activeProjectIndex !== null && filteredProjects[activeProjectIndex] && (() => {
        const currentProject = filteredProjects[activeProjectIndex];
        const isCaseStudy =
          currentProject.folder === 'logos' ||
          currentProject.subCategory === 'case-study' ||
          (currentProject.ratio !== undefined && currentProject.ratio < 0.3);

        return (
          <div
            className="fixed inset-0 z-[200] bg-[#070707] flex flex-col w-screen h-screen overflow-hidden animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Full-Width Top Bar */}
            <div className="h-20 px-6 sm:px-10 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a] shrink-0 z-30">
              {/* Left: Project Title & Category */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-white/[0.05] border border-white/15 text-white/80">
                  {currentProject.categoryName.split('&')[0].trim()}
                </span>
                <h3 className="text-base sm:text-xl font-bold text-white line-clamp-1">
                  {currentProject.title}
                </h3>
              </div>

              {/* Center: Counter & Navigation Arrows */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveProjectIndex((prev) => (prev !== null ? (prev - 1 + filteredProjects.length) % filteredProjects.length : null));
                    setPortfolioZoom(1);
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
                    setPortfolioZoom(1);
                  }}
                  className="w-10 h-10 rounded-full glass-card border border-white/15 flex items-center justify-center hover:bg-ember hover:border-ember transition-colors cursor-pointer"
                  aria-label="Next artwork"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Right: Zoom, Download, Inquiry & Close */}
              <div className="flex items-center gap-2 sm:gap-3">
                {isCaseStudy && (
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 mr-1">
                    <button
                      onClick={() => setPortfolioZoom((z) => Math.max(0.6, parseFloat((z - 0.2).toFixed(1))))}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                      title="Zoom Out"
                      aria-label="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono px-1.5 text-white/60 min-w-[36px] text-center">
                      {Math.round(portfolioZoom * 100)}%
                    </span>
                    <button
                      onClick={() => setPortfolioZoom((z) => Math.min(2.0, parseFloat((z + 0.2).toFixed(1))))}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                      title="Zoom In"
                      aria-label="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPortfolioZoom(1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                      title="Reset Zoom"
                      aria-label="Reset Zoom"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <a
                  href={currentProject.image}
                  download={`${currentProject.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-aagspire.webp`}
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
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-[#ff5a1f] to-[#ff7a2f] text-white flex items-center justify-center shadow-[0_0_25px_rgba(255,90,31,0.6)] hover:shadow-[0_0_35px_rgba(255,90,31,0.9)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-[#ff9050]"
                  aria-label="Close viewer"
                  title="Close (ESC)"
                >
                  <X className="w-5 h-5 text-white stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Full-Screen Main Content Body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left/Center: Immense Artwork Canvas */}
              {isCaseStudy ? (
                <div className="flex-1 bg-[#030303] overflow-y-auto overflow-x-auto relative custom-scrollbar flex flex-col items-center py-6 px-4">
                  {/* Floating Process Journey Indicator */}
                  <div className="sticky top-2 z-20 mb-4 px-4 py-1.5 rounded-full bg-black/85 backdrop-blur-xl border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-xs text-white/70 flex items-center gap-2 sm:gap-4 max-w-xl text-center">
                    <span className="text-ember font-bold flex items-center gap-1 shrink-0">
                      <Sparkles className="w-3.5 h-3.5" /> Design Journey:
                    </span>
                    <span className="truncate hidden sm:inline text-white/50">
                      1. Brandmark ➔ 2. 3D Mockups ➔ 3. Geometric Grid ➔ 4. Guidelines
                    </span>
                    <span className="text-[11px] text-ember/90 font-mono ml-auto shrink-0">
                      ↓ Scroll
                    </span>
                  </div>

                  <div
                    className="transition-transform duration-200 ease-out origin-top flex justify-center max-w-full pb-16"
                    style={{ transform: `scale(${portfolioZoom})` }}
                  >
                    <ImageWithLoader
                      src={currentProject.image}
                      alt={currentProject.title}
                      wrapperClassName="max-w-[92vw] sm:max-w-2xl lg:max-w-3xl w-full rounded-2xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.95)] border border-white/10"
                      spinnerSize="lg"
                      minHeight="420px"
                      className="w-full h-auto block"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-[#050505] p-4 sm:p-8 lg:p-12 flex items-center justify-center overflow-hidden relative">
                  <ImageWithLoader
                    src={currentProject.image}
                    alt={currentProject.title}
                    wrapperClassName="max-h-[82vh] max-w-full flex items-center justify-center rounded-2xl overflow-hidden"
                    spinnerSize="lg"
                    minHeight="350px"
                    className="max-h-[82vh] max-w-full w-auto object-contain rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
                  />
                </div>
              )}

              {/* Right: Full Details Sidebar Panel */}
              <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0a0a0a] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto shrink-0 max-h-[35vh] lg:max-h-full">
                <div>
                  <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">
                    {currentProject.categoryName}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">
                    {currentProject.title}
                  </h2>
                  <p className="text-sm text-white/60 leading-relaxed mb-6">
                    {currentProject.desc}
                  </p>

                  {/* Studio Quality Badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {isCaseStudy ? (
                      <>
                        <span className="text-[11px] px-3 py-1 rounded-lg bg-ember/15 border border-ember/30 text-ember font-medium">
                          ✨ Full Process Case Study
                        </span>
                        <span className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/60">
                          📐 Geometric Grid Anatomy
                        </span>
                        <span className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/60">
                          🎨 Color & Typography Specs
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/60">
                          Original Artwork
                        </span>
                        <span className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/60">
                          Aagspire Studio Design
                        </span>
                        <span className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/60">
                          High Resolution WebP
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons in Panel */}
                <div className="pt-6 border-t border-white/10 flex flex-col gap-3 mt-auto">
                  <a
                    href={currentProject.image}
                    download={`${currentProject.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-aagspire.webp`}
                    className="w-full py-3.5 px-5 rounded-xl border border-white/15 bg-white/[0.04] text-white hover:border-ember/50 hover:bg-ember/10 hover:text-ember transition-all font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Full Presentation</span>
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
        );
      })()}
    </section>
  );
}

