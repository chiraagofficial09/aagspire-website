import { useEffect, useRef, useState, useMemo } from 'react';
import { Share2, PenTool, Image, Film, Monitor, Package, X, ArrowUpRight, Sparkles, Download, Eye, Layers } from 'lucide-react';
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
    icon: Share2,
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

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeService, setActiveService] = useState<ServiceItem | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedArtwork, setSelectedArtwork] = useState<ProjectItem | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.15 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  // Reset sub-filter when switching active service
  useEffect(() => {
    setSelectedSubCategory('all');
  }, [activeService]);

  // Deeply verified matching works for the active service
  const relatedWorks = useMemo(() => {
    if (!activeService) return [];
    return portfolioItems.filter((p) => p.services && p.services.includes(activeService.id));
  }, [activeService]);

  // Available sub-categories within this service
  const availableSubCategories = useMemo(() => {
    if (!activeService || relatedWorks.length === 0) return [];
    const map = new Map<string, { label: string; count: number }>();

    relatedWorks.forEach((item) => {
      const key = item.subCategory || 'brand';
      const label = item.subCategoryLabel || 'Brand Graphics';
      if (!map.has(key)) {
        map.set(key, { label, count: 0 });
      }
      map.get(key)!.count += 1;
    });

    const subs = Array.from(map.entries()).map(([key, data]) => ({
      key,
      label: data.label,
      count: data.count,
    }));

    if (subs.length > 1) {
      return [{ key: 'all', label: 'All Showcase Works', count: relatedWorks.length }, ...subs];
    }
    return [];
  }, [activeService, relatedWorks]);

  // Displayed works filtered by selected sub-category
  const displayedServiceWorks = useMemo(() => {
    if (selectedSubCategory === 'all') return relatedWorks;
    return relatedWorks.filter((item) => item.subCategory === selectedSubCategory);
  }, [relatedWorks, selectedSubCategory]);

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedArtwork) setSelectedArtwork(null);
        else if (activeService) setActiveService(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeService, selectedArtwork]);

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
          Click any service card to explore real client deliverables and portfolio artworks created by our team.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, i) => {
          const Icon = service.icon;
          // Genuine verified works for this specific service
          const serviceWorks = portfolioItems.filter((p) => p.services && p.services.includes(service.id));
          const servicePreviewWorks = serviceWorks.slice(0, 3);
          const totalCount = serviceWorks.length;

          return (
            <div
              key={service.title}
              onClick={() => setActiveService(service)}
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
      {activeService && (
        <div
          className="fixed inset-0 z-[200] bg-[#070707] flex flex-col w-screen h-screen overflow-hidden animate-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Full-Width Sticky Top Header */}
          <div className="h-20 px-6 sm:px-12 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a] shrink-0 z-30">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-ember/15 border border-ember/30 flex items-center justify-center text-ember shrink-0 shadow-[0_0_15px_rgba(255,90,31,0.25)]">
                {(() => {
                  const Icon = activeService.icon;
                  return <Icon className="w-5 h-5" />;
                })()}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg sm:text-2xl font-bold text-white">
                    {activeService.title}
                  </h3>
                  {relatedWorks.length > 0 && (
                    <span className="text-xs font-mono font-bold text-ember px-2.5 py-0.5 rounded-full bg-ember/10 border border-ember/30">
                      {relatedWorks.length} Verified Works
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50 hidden sm:block line-clamp-1 max-w-xl">
                  {activeService.desc}
                </p>
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-3">
              <a
                href="#contact"
                onClick={() => setActiveService(null)}
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-ember hover:bg-ember-light text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,90,31,0.3)] cursor-pointer"
              >
                <span>Start {activeService.title} Project</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setActiveService(null)}
                className="w-10 h-10 rounded-full glass-card border border-white/20 flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-white/90" />
              </button>
            </div>
          </div>

          {/* Full-Screen Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8">
            <div className="max-w-7xl mx-auto">
              {/* Gallery Section */}
              {relatedWorks.length > 0 ? (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-ember" />
                      <h4 className="text-lg font-bold text-white">
                        Full Showcase of {activeService.title} Works ({displayedServiceWorks.length} shown)
                      </h4>
                    </div>

                    <button
                      onClick={() => setActiveService(null)}
                      className="text-xs text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1.5 font-semibold self-start md:self-auto px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Exit</span>
                    </button>
                  </div>

                  {/* Sub-Category Filter Tabs */}
                  {availableSubCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8 p-1.5 rounded-2xl bg-[#111] border border-white/10 w-fit">
                      {availableSubCategories.map((sub) => {
                        const active = selectedSubCategory === sub.key;
                        return (
                          <button
                            key={sub.key}
                            onClick={() => setSelectedSubCategory(sub.key)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                              active
                                ? 'bg-ember text-white shadow-[0_0_12px_rgba(255,90,31,0.35)]'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span>{sub.label}</span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                                active ? 'bg-black/30 text-white' : 'bg-white/10 text-white/50'
                              }`}
                            >
                              {sub.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Expansive Full-Screen Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {displayedServiceWorks.map((work) => (
                      <div
                        key={work.id}
                        onClick={() => setSelectedArtwork(work)}
                        className="group relative aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer bg-[#0a0a0a] border border-white/10 hover:border-ember/50 transition-all duration-400 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(255,90,31,0.25)] flex items-center justify-center"
                      >
                        <img
                          src={work.image}
                          alt={work.title}
                          loading="lazy"
                          className="w-full h-full object-contain block transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <div className="absolute bottom-4 left-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <p className="text-sm font-bold text-white line-clamp-1">{work.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Clean State for Services without static uploads */
                <div className="py-20 px-8 rounded-3xl bg-[#0e0e0e] border border-white/10 text-center flex flex-col items-center justify-center my-10">
                  <div className="w-16 h-16 rounded-3xl bg-ember/10 border border-ember/20 flex items-center justify-center mb-6 text-ember">
                    {(() => {
                      const Icon = activeService.icon;
                      return <Icon className="w-8 h-8" />;
                    })()}
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-3">Custom Engineered Deliverables</h4>
                  <p className="text-sm text-white/60 max-w-lg mb-8 leading-relaxed">
                    Our {activeService.title} solutions are tailored uniquely to each brand's technical requirements, motion identity, and campaign goals. Contact us directly to receive custom case studies and live interactive walkthroughs.
                  </p>
                  <a
                    href="#contact"
                    onClick={() => setActiveService(null)}
                    className="px-8 py-3.5 rounded-full bg-ember hover:bg-ember-light text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(255,90,31,0.3)] cursor-pointer"
                  >
                    Request Custom Scope & Proposal
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Artwork Inspection View */}
      {selectedArtwork && (
        <div
          className="fixed inset-0 z-[250] bg-[#050505] flex flex-col w-screen h-screen overflow-hidden animate-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="h-16 px-6 sm:px-10 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a] shrink-0 z-30">
            <h4 className="text-base sm:text-lg font-bold text-white">{selectedArtwork.title}</h4>
            <div className="flex items-center gap-3">
              <a
                href={selectedArtwork.image}
                download={`${selectedArtwork.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-aagspire.webp`}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/[0.04] text-white hover:border-ember/50 hover:bg-ember/10 hover:text-ember transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
                title="Download high-resolution artwork"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </a>
              <button
                onClick={() => setSelectedArtwork(null)}
                className="w-10 h-10 rounded-full glass-card border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Close artwork view"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Full Screen Image View */}
          <div className="flex-1 p-6 sm:p-12 flex items-center justify-center bg-[#050505] overflow-hidden">
            <img
              src={selectedArtwork.image}
              alt={selectedArtwork.title}
              className="max-h-[85vh] max-w-full w-auto object-contain rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
            />
          </div>
        </div>
      )}
    </section>
  );
}

