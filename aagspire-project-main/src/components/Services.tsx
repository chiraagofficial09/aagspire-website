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
  Box,
  ShoppingBag,
  Trophy,
  Shirt,
  Sliders,
  Share2,
  X,
  ArrowUpRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
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
    filter: (p) => (p.services || []).includes('logo-design'),
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
    label: 'Business Cards & Stationery',
    icon: CreditCard,
    filter: (p) => p.subCategory === 'business-cards' || p.folder === 'cards',
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
    id: 'box-packaging',
    label: 'Product Boxes',
    icon: Box,
    filter: (p) => p.subCategory === 'box-packaging',
  },
  {
    id: 'pouch-packaging',
    label: 'Pouches & Agro Packs',
    icon: ShoppingBag,
    filter: (p) => p.subCategory === 'pouch-packaging',
  },
  {
    id: 'sports-posters',
    label: 'Sports Posters',
    icon: Trophy,
    filter: (p) => p.subCategory === 'sports-posters',
  },
  {
    id: 'streetwear',
    label: 'Streetwear Apparel',
    icon: Shirt,
    filter: (p) => p.subCategory === 'streetwear' || p.folder === 'tshirt',
  },
  {
    id: 'web-sliders',
    label: 'Web Sliders',
    icon: Sliders,
    filter: (p) => p.subCategory === 'web-sliders' || p.folder === 'websliders',
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
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string>('all');

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

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);

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
                        <img
                          key={work.id}
                          src={work.image}
                          alt={work.title}
                          className="w-8 h-8 rounded-full object-cover border-2 border-[#121212] shadow-sm"
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
              {/* ← Back Button */}
              <button
                onClick={handleCloseModal}
                className="flex items-center gap-2 text-ember hover:text-ember-light transition-colors duration-300 cursor-pointer group mb-2"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back</span>
              </button>
              {/* Single Continuous Horizontal-Scrollable Navigation Dock (All in Same Line) */}
              <div className="rounded-3xl bg-[#0e0e0e]/95 border border-white/10 p-3 sm:p-3.5 shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl relative overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Left Scroll Button */}
                  <button
                    onClick={() => scrollTabs('left')}
                    className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#141414] hover:bg-[#222] border border-white/10 hover:border-ember/60 text-white/70 hover:text-white flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md hover:scale-105 active:scale-95"
                    aria-label="Scroll categories left"
                  >
                    <ChevronLeft className="w-4 h-4 text-ember" />
                  </button>

                  {/* Same-Line Horizontal Scrollable Tabs Track with Visible Custom Ember Scrollbar */}
                  <div
                    ref={tabsScrollRef}
                    onScroll={handleTabsScroll}
                    className="flex-1 flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 pt-0.5 tabs-custom-scrollbar snap-x select-none"
                  >
                    {allShowcaseTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = activeTabId === tab.id;
                      const count = portfolioItems.filter(tab.filter).length;

                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTabId(tab.id)}
                          className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-xs font-bold transition-all duration-300 flex items-center gap-2.5 cursor-pointer shrink-0 snap-start whitespace-nowrap ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#ff5a1f] to-[#ff7a2f] text-white shadow-[0_0_25px_rgba(255,90,31,0.6)] border border-[#ff9050]'
                              : 'bg-[#141414] hover:bg-[#1a1a1a] text-white/80 hover:text-white border border-white/10'
                          }`}
                        >
                          {Icon && (
                            <Icon
                              className={`w-4 h-4 ${
                                isSelected ? 'text-white' : 'text-[#ff7a2f]'
                              }`}
                            />
                          )}
                          <span>{tab.label}</span>
                          {count > 0 && (
                            <span
                              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
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
                    className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#141414] hover:bg-[#222] border border-white/10 hover:border-ember/60 text-white/70 hover:text-white flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md hover:scale-105 active:scale-95"
                    aria-label="Scroll categories right"
                  >
                    <ChevronRight className="w-4 h-4 text-ember" />
                  </button>
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
              </div>

              {/* Matching Works Gallery in Natural Image Size Proportion (Masonry) - No Popup On Click */}
              {displayedWorks.length > 0 ? (
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-5 space-y-5">
                  {displayedWorks.map((work) => {
                    const isCaseStudy =
                      work.folder === 'logos' || work.subCategory === 'brand-identity';

                    return (
                      <div
                        key={work.id}
                        className="break-inside-avoid relative rounded-2xl overflow-hidden bg-[#050505] border border-white/10 hover:border-ember/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(255,90,31,0.18)] group mb-5 block select-none"
                      >
                        {/* Image matching exact natural dimensions */}
                        <img
                          src={work.image}
                          alt={work.title}
                          loading="lazy"
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

                        {/* Bottom Title & Metadata Overlay on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/95 via-obsidian/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
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
        </div>
      )}
    </section>
  );
}

