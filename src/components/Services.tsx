import { useEffect, useRef, useState, useMemo } from 'react';
import {
  LayoutGrid,
  Megaphone,
  PenTool,
  Image,
  Package,
  Monitor,
  Film,
  BookOpen,
  CreditCard,
  Instagram,
  Target,
  Shirt,
  ArrowUpRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  X,
  Eye,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { ImageWithLoader } from './ImageWithLoader';
import rawPortfolioData from './portfolio-data.json';

interface ProjectItem {
  id: string;
  title: string;
  type: 'social' | 'tshirt' | 'cards';
  folder: string;
  image: string;
  originalName: string;
  width?: number;
  height?: number;
  ratio?: number;
  shape?: string;
  services?: string[];
  subCategory?: string;
  subCategoryLabel?: string;
}

const portfolioItems = rawPortfolioData as ProjectItem[];

interface ServiceItem {
  id: string;
  icon: any;
  title: string;
  desc: string;
  tags: string[];
  deliverables: string[];
}

const services: ServiceItem[] = [
  {
    id: 'social-media-marketing',
    icon: Megaphone,
    title: 'Social Media Marketing',
    desc: 'Strategic content and campaigns that grow your reach, engagement, and community.',
    tags: ['Content Strategy', 'Campaigns', 'Social Growth'],
    deliverables: ['Custom Instagram Carousels', 'Campaign Creatives', 'Brand Identity Guidelines', 'Story & Post Templates'],
  },
  {
    id: 'logo-design',
    icon: PenTool,
    title: 'Logo Design',
    desc: 'Distinctive and memorable logos crafted to express the heart of your brand.',
    tags: ['Logo Concepts', 'Brand Marks', 'Visual Identity'],
    deliverables: ['Primary & Secondary Logos', 'Brand Identity Marks', 'Corporate Stationery & Cards', 'Vector Master Assets'],
  },
  {
    id: 'poster-design',
    icon: Image,
    title: 'Poster Design',
    desc: 'Bold, attention-grabbing posters designed for campaigns, events, and promotions.',
    tags: ['Campaign Design', 'Print', 'Digital Posters'],
    deliverables: ['Festival & Campaign Posters', 'Automotive & Event Graphics', 'Print Ready CMYK Files', 'Digital Promotional Creatives'],
  },
  {
    id: 'motion-video',
    icon: Film,
    title: 'Motion & Video',
    desc: 'Engaging motion graphics and video content that bring your brand stories to life.',
    tags: ['Motion Graphics', 'Video Editing', 'Animation'],
    deliverables: ['Motion Graphics & Reels', 'Brand Intro Animations', 'Social Video Creatives', 'Promotional Teasers'],
  },
  {
    id: 'web-development',
    icon: Monitor,
    title: 'UI/UX & Web Development',
    desc: 'Intuitive interfaces and responsive websites built to look sharp and perform smoothly.',
    tags: ['UI/UX Design', 'Web Design', 'Development'],
    deliverables: ['Modern Responsive Websites', 'UI/UX Interactive Prototypes', 'Conversion Landing Pages', 'Fast Web Performance'],
  },
  {
    id: 'packaging-design',
    icon: Package,
    title: 'Packaging Design',
    desc: 'Standout packaging that protects your product and makes a lasting first impression.',
    tags: ['Product Packaging', 'Labels', 'Print Ready'],
    deliverables: ['Product Box & Pouch Artwork', 'Die-Line Specifications', 'Custom Label Graphics', 'Print Production Files'],
  },
];

interface ShowcaseTabDef {
  id: string;
  label: string;
  icon?: any;
  badge?: string;
  filter: (p: ProjectItem) => boolean;
}

const coreServiceTabs: ShowcaseTabDef[] = [
  {
    id: 'all',
    label: 'All Works',
    icon: LayoutGrid,
    filter: () => true,
  },
  {
    id: 'social-media-marketing',
    label: 'Social Media Marketing',
    icon: Megaphone,
    filter: (p) => (p.services || []).includes('social-media-marketing'),
  },
  {
    id: 'logo-design',
    label: 'Logo Design',
    icon: PenTool,
    filter: (p) => (p.folder === 'logos' || (p.services || []).includes('logo-design')) && p.folder !== 'cards',
  },
  {
    id: 'poster-design',
    label: 'Poster Design',
    icon: Image,
    filter: (p) => (p.services || []).includes('poster-design'),
  },
  {
    id: 'packaging-design',
    label: 'Packaging Design',
    icon: Package,
    filter: (p) => (p.services || []).includes('packaging-design'),
  },
  {
    id: 'web-development',
    label: 'UI/UX & Web Development',
    icon: Monitor,
    filter: (p) =>
      (p.services || []).includes('web-development') ||
      (p.services || []).includes('ui-ux-web-development'),
  },
  {
    id: 'motion-video',
    label: 'Motion & Video',
    icon: Film,
    filter: () => false,
  },
];

const specializedTabs: ShowcaseTabDef[] = [
  {
    id: 'brand-identity',
    label: 'Brand Guidelines',
    icon: BookOpen,
    badge: 'Case Study',
    filter: (p) => p.subCategory === 'brand-identity' || p.folder === 'logos',
  },
  {
    id: 'business-cards',
    label: 'Business Cards',
    icon: CreditCard,
    filter: (p) => p.folder === 'cards' || p.subCategory === 'business-cards' || (p.services || []).includes('business-cards'),
  },
  {
    id: 'carousels',
    label: 'Instagram Carousels',
    icon: Instagram,
    filter: (p) => p.subCategory === 'carousels',
  },
  {
    id: 'campaigns',
    label: 'Brand Campaigns',
    icon: Target,
    filter: (p) => p.subCategory === 'campaigns',
  },
  {
    id: 'streetwear',
    label: 'Streetwear Apparel',
    icon: Shirt,
    filter: (p) => p.subCategory === 'streetwear' || p.folder === 'tshirt',
  },
];

const allShowcaseTabs = [...coreServiceTabs, ...specializedTabs];

interface ServicesProps {
  isWorkOpen?: boolean;
  onCloseWork?: () => void;
  initialTabId?: string;
}

export default function Services({ isWorkOpen = false, onCloseWork, initialTabId = 'all' }: ServicesProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [, setScrollProgress] = useState<number>(0);
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string>('all');
  const [activeWorkIndex, setActiveWorkIndex] = useState<number | null>(null);
  const [workZoom, setWorkZoom] = useState<number>(1);

  const handleTabsScroll = () => {
    if (tabsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsScrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        setScrollProgress(Math.min(1, Math.max(0, scrollLeft / maxScroll)));
      }
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      tabsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.15 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  // Sync external isWorkOpen prop
  useEffect(() => {
    if (isWorkOpen) {
      setActiveTabId(initialTabId || 'all');
      setModalOpen(true);
    } else {
      setModalOpen(false);
    }
  }, [isWorkOpen, initialTabId]);

  const handleCloseModal = () => {
    setModalOpen(false);
    onCloseWork?.();
  };

  // Current active tab definition
  const activeTabDef = useMemo(() => {
    return allShowcaseTabs.find((t) => t.id === activeTabId) || allShowcaseTabs[0];
  }, [activeTabId]);

  // Matching works for the selected tab
  const displayedWorks = useMemo(() => {
    return portfolioItems.filter(activeTabDef.filter);
  }, [activeTabDef]);

  const [worksLoading, setWorksLoading] = useState(true);
  const [worksLoadedCount, setWorksLoadedCount] = useState(0);

  // Monitor image loading for all artworks in current active tab of Our Works
  useEffect(() => {
    if (!modalOpen || !displayedWorks.length) {
      setWorksLoading(false);
      return;
    }

    setWorksLoading(true);
    setWorksLoadedCount(0);

    let loaded = 0;
    let isCancelled = false;
    const total = displayedWorks.length;

    const onComplete = () => {
      if (isCancelled) return;
      loaded += 1;
      setWorksLoadedCount(loaded);
      if (loaded >= total) {
        setWorksLoading(false);
      }
    };

    displayedWorks.forEach((work) => {
      const img = new window.Image();
      img.src = work.image;
      if (img.complete && img.naturalWidth > 0) {
        onComplete();
      } else {
        img.onload = onComplete;
        img.onerror = onComplete;
      }
    });

    const timer = setTimeout(() => {
      if (!isCancelled) setWorksLoading(false);
    }, 3500);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [modalOpen, activeTabId, displayedWorks]);

  // Lock background body scroll when service modal is open
  useEffect(() => {
    if (modalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [modalOpen]);

  // Reset active artwork viewer when modal or tab changes
  useEffect(() => {
    setActiveWorkIndex(null);
    setWorkZoom(1);
  }, [modalOpen, activeTabId]);

  // Keyboard navigation for modal & artwork viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeWorkIndex !== null) {
        if (e.key === 'Escape') {
          setActiveWorkIndex(null);
        } else if (e.key === 'ArrowRight') {
          setActiveWorkIndex((prev) => (prev !== null ? (prev + 1) % displayedWorks.length : null));
          setWorkZoom(1);
        } else if (e.key === 'ArrowLeft') {
          setActiveWorkIndex((prev) => (prev !== null ? (prev - 1 + displayedWorks.length) % displayedWorks.length : null));
          setWorkZoom(1);
        }
      } else if (e.key === 'Escape' && modalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, activeWorkIndex, displayedWorks.length]);

  return (
    <section
      ref={sectionRef}
      id="services"
      className="relative py-32 px-6 max-w-7xl mx-auto"
    >
      <div className={`section-reveal ${visible ? 'visible' : ''} mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6`}>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-ember" />
            <p className="section-label">What We Do</p>
          </div>
          <h2 className="section-title max-w-3xl">
            Services engineered for{' '}
            <span className="text-gradient">brands that burn bright.</span>
          </h2>
        </div>
        <p className="text-sm text-white/40 max-w-xs leading-relaxed">
          Click any service card to explore specialized deliverables and live portfolio artworks.
        </p>
      </div>

      {/* Services Grid (Main 6 Services on Homepage) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, i) => {
          const Icon = service.icon;
          // Genuine verified works for this specific service
          const serviceWorks = portfolioItems.filter(
            (p) =>
              p.services &&
              (p.services.includes(service.id) ||
                (service.id === 'web-development' && p.services.includes('ui-ux-web-development')))
          );
          const servicePreviewWorks = serviceWorks.slice(0, 3);
          const totalCount = serviceWorks.length;

          return (
            <div
              key={service.title}
              onClick={() => {
                setActiveTabId(service.id);
                setModalOpen(true);
              }}
              className={`glass-card glass-card-hover rounded-3xl p-7 group section-reveal cursor-pointer relative overflow-hidden flex flex-col justify-between border border-white/10 hover:border-ember/50 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(255,90,31,0.2)] ${
                visible ? 'visible' : ''
              }`}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div>
                {/* Header: Icon & Action Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="relative w-14 h-14 rounded-2xl bg-ember/10 border border-ember/20 flex items-center justify-center group-hover:bg-ember/20 group-hover:border-ember/40 transition-all duration-500">
                    <Icon className="w-6 h-6 text-ember" />
                    <div className="absolute inset-0 rounded-2xl bg-ember/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-white/40 group-hover:text-ember transition-colors">
                    <span>{totalCount > 0 ? 'Explore Work' : 'View Scope'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2 text-white group-hover:text-white transition-colors">
                  {service.title}
                </h3>
                <p className="text-xs text-white/50 leading-relaxed mb-6 line-clamp-3">
                  {service.desc}
                </p>

                {/* Service Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {service.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Related Work Preview Bar */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-auto">
                {totalCount > 0 ? (
                  <>
                    <div className="flex items-center -space-x-2 overflow-hidden">
                      {servicePreviewWorks.map((work) => (
                        <ImageWithLoader
                          key={work.id}
                          src={work.image}
                          alt={work.title}
                          showSpinner={false}
                          wrapperClassName="w-8 h-8 rounded-full border-2 border-[#121212] shadow-sm overflow-hidden shrink-0"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold text-ember group-hover:underline">
                      {totalCount} sample works
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] font-semibold text-white/40 group-hover:text-ember transition-colors">
                    Custom Production On Demand
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-Screen Service Works Showcase */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[9999] pt-20 bg-[#070707] flex flex-col w-screen h-screen overflow-hidden animate-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Full-Screen Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Sticky Filter Bar & Controls (Stays pinned when user scrolls through works) */}
              <div className="sticky -top-8 z-30 -mx-6 sm:-mx-12 px-6 sm:px-12 pt-3 pb-4 bg-[#070707]/95 backdrop-blur-2xl border-b border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.9)] space-y-3">
                {/* Back Button */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleCloseModal}
                    className="flex items-center gap-2 text-ember hover:text-ember-light transition-colors duration-300 cursor-pointer group"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back to Services</span>
                  </button>
                </div>

                {/* Single Continuous Horizontal-Scrollable Navigation Dock (All in Same Line) */}
                <div className="rounded-2xl sm:rounded-3xl bg-[#0e0e0e]/95 border border-white/10 p-2 sm:p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative overflow-hidden">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Left Scroll Button */}
                    <button
                      onClick={() => scrollTabs('left')}
                      className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#141414] hover:bg-[#222] border border-white/10 hover:border-ember/60 text-white/70 hover:text-white flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md hover:scale-105 active:scale-95"
                      aria-label="Scroll categories left"
                    >
                      <ChevronLeft className="w-4 h-4 text-ember" />
                    </button>

                    {/* Same-Line Horizontal Scrollable Tabs Track with Visible Custom Ember Scrollbar */}
                    <div
                      ref={tabsScrollRef}
                      onScroll={handleTabsScroll}
                      className="flex-1 flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1.5 pt-0.5 tabs-custom-scrollbar snap-x select-none"
                    >
                      {allShowcaseTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isSelected = activeTabId === tab.id;
                        const count = portfolioItems.filter(tab.filter).length;

                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer shrink-0 snap-start whitespace-nowrap ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#ff5a1f] to-[#ff7a2f] text-white shadow-[0_0_20px_rgba(255,90,31,0.6)] border border-[#ff9050]'
                                : 'bg-[#141414] hover:bg-[#1a1a1a] text-white/80 hover:text-white border border-white/10'
                            }`}
                          >
                            {Icon && (
                              <Icon
                                className={`w-3.5 h-3.5 ${
                                  isSelected ? 'text-white' : 'text-[#ff7a2f]'
                                }`}
                              />
                            )}
                            <span>{tab.label}</span>
                            {count > 0 && (
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                                  isSelected
                                    ? 'bg-black/35 text-white'
                                    : 'bg-white/10 text-white/70'
                                }`}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Scroll Button */}
                    <button
                      onClick={() => scrollTabs('right')}
                      className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#141414] hover:bg-[#222] border border-white/10 hover:border-ember/60 text-white/70 hover:text-white flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md hover:scale-105 active:scale-95"
                      aria-label="Scroll categories right"
                    >
                      <ChevronRight className="w-4 h-4 text-ember" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Gallery Header Info Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-ember animate-pulse" />
                  <h4 className="text-base sm:text-lg font-bold text-white">
                    {activeTabDef.label}
                  </h4>
                  <span className="text-xs font-mono font-bold text-white/50 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {displayedWorks.length} Items Available
                  </span>
                </div>

                {worksLoading && (
                  <div className="flex items-center gap-2.5 text-xs font-mono text-ember bg-ember/10 border border-ember/30 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(255,90,31,0.2)]">
                    <div className="w-3.5 h-3.5 border-2 border-ember border-t-transparent rounded-full animate-spin" />
                    <span>Loading works ({worksLoadedCount}/{displayedWorks.length})</span>
                  </div>
                )}
              </div>

              {/* Matching Works Gallery in Natural Image Size Proportion (Masonry) - No Popup On Click */}
              {worksLoading ? (
                /* Skeleton Loader while all images in current tab load */
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-5 space-y-5 animate-fade-up">
                  {[340, 420, 300, 400, 360, 440, 320, 380].map((h, idx) => (
                    <div
                      key={idx}
                      className="break-inside-avoid rounded-2xl overflow-hidden bg-[#0d0d0d] border border-white/5 relative p-4 flex flex-col justify-end mb-5"
                      style={{ height: `${h}px` }}
                    >
                      <div className="skeleton-shimmer" />
                      <div className="relative z-10 space-y-2">
                        <div className="h-3 w-1/4 bg-white/10 rounded-full" />
                        <div className="h-4 w-2/3 bg-white/10 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayedWorks.length > 0 ? (
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-5 space-y-5 animate-fade-up">
                  {displayedWorks.map((work) => {
                    const isCaseStudy =
                      work.folder === 'logos' || work.subCategory === 'brand-identity';

                    return (
                      <div
                        key={work.id}
                        onClick={() => {
                          const idx = displayedWorks.findIndex((w) => w.id === work.id);
                          if (idx !== -1) {
                            setActiveWorkIndex(idx);
                            setWorkZoom(1);
                          }
                        }}
                        className="break-inside-avoid relative rounded-2xl overflow-hidden bg-[#050505] border border-white/10 hover:border-ember/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(255,90,31,0.18)] group mb-5 block select-none cursor-pointer"
                      >
                        {/* Image matching exact natural dimensions with Loading State */}
                        <ImageWithLoader
                          src={work.image}
                          alt={work.title}
                          loading="lazy"
                          minHeight="220px"
                          wrapperClassName="w-full"
                          className={`w-full block transition-transform duration-700 group-hover:scale-105 ${
                            isCaseStudy ? 'max-h-[550px] object-cover object-top' : 'h-auto object-contain'
                          }`}
                        />

                        {/* Case Study Badge */}
                        {isCaseStudy && (
                          <div className="absolute top-3 left-3 z-10">
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/85 backdrop-blur-md border border-ember/50 text-ember shadow-xl">
                              <Sparkles className="w-3 h-3" />
                              <span>Brand Identity Guidelines</span>
                            </span>
                          </div>
                        )}

                        {/* Floating Action Pill (Bottom Right - Click to Open) */}
                        <div className="absolute bottom-3.5 right-3.5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-obsidian/85 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/90 shadow-lg opacity-0 group-hover:opacity-100 group-hover:bg-ember group-hover:border-ember transition-all duration-300">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isCaseStudy ? 'View Presentation' : 'View'}</span>
                        </div>

                        {/* Bottom Title & Metadata Overlay on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/95 via-obsidian/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <div className="absolute bottom-3.5 left-3.5 right-28 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                          <p className="text-xs font-bold text-white line-clamp-1 drop-shadow-md">
                            {work.title}
                          </p>
                          <p className="text-[10px] text-ember-light font-medium mt-0.5">
                            {isCaseStudy ? '✨ Complete Brand Identity Suite' : 'High Resolution Artwork'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Custom Production Scope Card (for Motion & Video or Custom Brief) */
                <div className="py-16 px-8 rounded-3xl bg-[#0a0a0a] border border-white/10 flex flex-col items-center justify-center text-center my-6">
                  <div className="w-14 h-14 rounded-2xl bg-ember/15 border border-ember/30 flex items-center justify-center text-ember mb-4 shadow-lg">
                    {(() => {
                      const Icon = activeTabDef.icon || Film;
                      return <Icon className="w-6 h-6" />;
                    })()}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">
                    Bespoke {activeTabDef.label} Production
                  </h4>
                  <p className="text-xs text-white/50 max-w-md mb-6 leading-relaxed">
                    Produced custom to your brand guidelines, campaign timelines, and technical formats. Contact us to receive sample reels and custom proposals.
                  </p>
                  <a
                    href="#contact"
                    onClick={handleCloseModal}
                    className="px-6 py-3 rounded-full bg-ember hover:bg-ember-light text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,90,31,0.3)] cursor-pointer"
                  >
                    Request Custom Brief & Proposal
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Full-Screen Immersive Artwork Studio Viewer for Logo Presentations and Works */}
          {activeWorkIndex !== null && displayedWorks[activeWorkIndex] && (() => {
            const currentWork = displayedWorks[activeWorkIndex];
            const isCaseStudy =
              currentWork.folder === 'logos' ||
              currentWork.subCategory === 'brand-identity' ||
              (currentWork.ratio !== undefined && currentWork.ratio < 0.35);

            return (
              <div
                className="fixed inset-0 z-[10005] bg-[#070707] flex flex-col w-screen h-screen overflow-hidden animate-fade-up"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Full-Width Top Bar */}
                <div className="h-20 px-6 sm:px-10 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a] shrink-0 z-30">
                  {/* Left: Project Title & Category */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-white/[0.05] border border-white/15 text-white/80">
                      {isCaseStudy ? 'Brand Identity Case Study' : activeTabDef.label}
                    </span>
                    <h3 className="text-base sm:text-xl font-bold text-white line-clamp-1">
                      {currentWork.title}
                    </h3>
                  </div>

                  {/* Center: Counter & Navigation Arrows */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setActiveWorkIndex((prev) => (prev !== null ? (prev - 1 + displayedWorks.length) % displayedWorks.length : null));
                        setWorkZoom(1);
                      }}
                      className="w-10 h-10 rounded-full glass-card border border-white/15 flex items-center justify-center hover:bg-ember hover:border-ember transition-colors cursor-pointer"
                      aria-label="Previous artwork"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>

                    <span className="text-xs font-mono font-bold text-ember px-3 py-1 rounded-full bg-ember/10 border border-ember/30 shadow-[0_0_10px_rgba(255,90,31,0.2)]">
                      {activeWorkIndex + 1} / {displayedWorks.length}
                    </span>

                    <button
                      onClick={() => {
                        setActiveWorkIndex((prev) => (prev !== null ? (prev + 1) % displayedWorks.length : null));
                        setWorkZoom(1);
                      }}
                      className="w-10 h-10 rounded-full glass-card border border-white/15 flex items-center justify-center hover:bg-ember hover:border-ember transition-colors cursor-pointer"
                      aria-label="Next artwork"
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Right: Zoom Controls, Download & Big Prominent Close Button */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {isCaseStudy && (
                      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 mr-1">
                        <button
                          onClick={() => setWorkZoom((z) => Math.max(0.6, parseFloat((z - 0.2).toFixed(1))))}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                          title="Zoom Out"
                          aria-label="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono px-1.5 text-white/60 min-w-[36px] text-center">
                          {Math.round(workZoom * 100)}%
                        </span>
                        <button
                          onClick={() => setWorkZoom((z) => Math.min(2.0, parseFloat((z + 0.2).toFixed(1))))}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                          title="Zoom In"
                          aria-label="Zoom In"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setWorkZoom(1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                          title="Reset Zoom"
                          aria-label="Reset Zoom"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <a
                      href={currentWork.image}
                      download={`${currentWork.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-aagspire.webp`}
                      className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/[0.04] text-white hover:border-ember/50 hover:bg-ember/10 hover:text-ember transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
                      title="Download High-Res Artwork"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </a>

                    {/* Prominent Close Button */}
                    <button
                      onClick={() => setActiveWorkIndex(null)}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-[#ff5a1f] to-[#ff7a2f] text-white flex items-center justify-center shadow-[0_0_25px_rgba(255,90,31,0.6)] hover:shadow-[0_0_35px_rgba(255,90,31,0.9)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-[#ff9050]"
                      aria-label="Close viewer"
                      title="Close (ESC)"
                    >
                      <X className="w-5 h-5 text-white stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Main Content Body */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#030303]">
                  {isCaseStudy ? (
                    <div className="flex-1 overflow-y-auto overflow-x-auto relative custom-scrollbar flex flex-col items-center py-6 px-4">
                      <div
                        className="transition-transform duration-200 ease-out origin-top flex justify-center max-w-full pb-16"
                        style={{ transform: `scale(${workZoom})` }}
                      >
                        <ImageWithLoader
                          src={currentWork.image}
                          alt={currentWork.title}
                          wrapperClassName="max-w-[94vw] sm:max-w-2xl lg:max-w-3xl w-full rounded-2xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.95)] border border-white/10"
                          spinnerSize="lg"
                          minHeight="450px"
                          className="w-full h-auto block"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 p-4 sm:p-8 flex items-center justify-center overflow-hidden relative">
                      <ImageWithLoader
                        src={currentWork.image}
                        alt={currentWork.title}
                        wrapperClassName="max-h-[85vh] max-w-full flex items-center justify-center rounded-2xl overflow-hidden"
                        spinnerSize="lg"
                        minHeight="350px"
                        className="max-h-[85vh] max-w-full w-auto object-contain rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}

