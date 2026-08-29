import { useEffect, useRef, useState } from 'react';
import { Send, CheckCircle2, X, ArrowRight, ArrowUpRight, Sparkles, Mail, AlertCircle, ChevronDown, Check } from 'lucide-react';
import { sendContactEmail, isEmailConfigured } from '../services/emailService';

const serviceOptions = [
  'Social Media Marketing',
  'Logo Design',
  'Poster Design',
  'Motion & Video',
  'UI/UX & Web Development',
  'Packaging Design',
];

interface CTAProps {
  isContactOpen?: boolean;
  onOpenContact?: () => void;
  onCloseContact?: () => void;
  onOpenWork?: () => void;
}

export default function CTA({
  isContactOpen = false,
  onOpenContact,
  onCloseContact,
  onOpenWork,
}: CTAProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: 'Social Media Marketing',
    message: '',
  });
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isModalOpen = isContactOpen || localModalOpen;

  const handleOpen = () => {
    setLocalModalOpen(true);
    setErrorMessage(null);
    onOpenContact?.();
  };

  const handleClose = () => {
    setLocalModalOpen(false);
    setServiceDropdownOpen(false);
    setErrorMessage(null);
    onCloseContact?.();
  };

  // Close service dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServiceDropdownOpen(false);
      }
    };
    if (serviceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [serviceDropdownOpen]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  // Lock background body scroll when contact modal is open
  useEffect(() => {
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isModalOpen]);

  // Close modal on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await sendContactEmail(formData);
      if (response.success) {
        setSubmitted(true);
      } else {
        setErrorMessage(
          response.error || 'Failed to send your inquiry. Please try again or contact us directly.'
        );
      }
    } catch {
      setErrorMessage(
        'An unexpected error occurred. Please try again later or reach out at aagspire@gmail.com.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section ref={sectionRef} id="contact" className="relative py-32 md:py-40 px-6">
      <div className="max-w-5xl mx-auto">
        <div
          className={`relative glass-card rounded-[2.5rem] p-10 sm:p-14 md:p-20 text-center overflow-hidden border border-white/10 section-reveal ${
            visible ? 'visible' : ''
          }`}
        >
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-ember/15 blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-ember-deep/15 blur-[90px] pointer-events-none" />

          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-8 px-5 py-2 rounded-full border border-white/10 bg-white/[0.03] shadow-[0_0_20px_rgba(255,90,31,0.12)]">
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ember shadow-[0_0_8px_rgba(255,90,31,0.9)]" />
              </span>
              <span className="text-xs font-semibold text-white/70 tracking-widest uppercase">
                Ready to ignite?
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-8">
              Let's Build Something
              <br />
              <span className="text-gradient text-shadow-glow">Unforgettable.</span>
            </h2>

            {/* Description */}
            <p className="text-white/50 max-w-xl mx-auto mb-12 text-base md:text-lg leading-relaxed">
              Tell us about your vision. We'll show you how to turn it into a brand the
              world remembers.
            </p>

            {/* Interactive CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleOpen}
                className="magnetic-btn group relative px-9 py-4 rounded-full bg-ember text-white text-sm font-semibold ember-glow hover:scale-105 transition-transform flex items-center gap-3 cursor-pointer"
              >
                <span className="relative z-10">Start Your Project</span>
                <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={onOpenWork}
                className="magnetic-btn px-8 py-4 rounded-full glass-card glass-card-hover text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <span>View Our Work</span>
                <ArrowUpRight className="w-4 h-4 text-ember" />
              </button>
            </div>

            {/* Quick Meta Footer */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-14 text-xs font-medium text-white/40">
              <a
                href="mailto:aagspire@gmail.com"
                className="hover:text-ember transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-ember" />
                aagspire@gmail.com
              </a>
              <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/20" />
              <span>Remote · Worldwide</span>
              <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/20" />
              <span>Guaranteed response within 24h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Start Project Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/85 backdrop-blur-2xl animate-fade-up" />

          {/* Modal Card */}
          <div
            className="relative max-w-xl w-full bg-[#0d0d0d] rounded-3xl p-6 sm:p-8 md:p-10 border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.95)] max-h-[90vh] overflow-y-auto custom-scrollbar z-10 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-5 right-5 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.06] hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
              aria-label="Close modal"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {submitted ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-ember/20 border border-ember/40 flex items-center justify-center text-ember mb-6 shadow-[0_0_25px_rgba(255,90,31,0.4)]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">Project Inquiry Received!</h3>
                <p className="text-white/60 max-w-md mx-auto mb-8 leading-relaxed text-sm">
                  Thank you, <strong className="text-white">{formData.name || 'there'}</strong>. We've received your project details and our team will get back to you with a roadmap within 24 hours.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setErrorMessage(null);
                    handleClose();
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      service: 'Social Media Marketing',
                      message: '',
                    });
                  }}
                  className="px-8 py-3 rounded-full bg-ember text-white text-sm font-semibold shadow-[0_0_20px_rgba(255,90,31,0.5)] hover:scale-105 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-ember" />
                  <span className="text-xs font-bold text-ember uppercase tracking-widest">
                    Start Your Project
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
                  Let's talk about your vision.
                </h3>
                <p className="text-xs sm:text-sm text-white/50 mb-6 leading-relaxed">
                  Fill in your details below and we'll reach out within 24 hours with a custom proposal.
                </p>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-3 animate-fade-up">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <div className="flex-1 leading-relaxed">
                      <p className="font-semibold text-red-200">{errorMessage}</p>
                      {!isEmailConfigured() && (
                        <p className="mt-1 text-[11px] text-white/50">
                          Note: Add your EmailJS Service ID, Template ID, and Public Key to your{' '}
                          <code className="text-white/80 font-mono bg-white/10 px-1 py-0.5 rounded">.env</code>{' '}
                          file to enable live sending.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="text-white/40 hover:text-white transition-colors cursor-pointer"
                      aria-label="Dismiss error"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Your Name <span className="text-ember">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-2xl bg-[#1a1a1a] border border-[#333333] px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none transition-all duration-300 focus:border-ember focus:bg-[#222222] focus:ring-1 focus:ring-ember"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Email Address <span className="text-ember">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-2xl bg-[#1a1a1a] border border-[#333333] px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none transition-all duration-300 focus:border-ember focus:bg-[#222222] focus:ring-1 focus:ring-ember"
                      />
                    </div>
                  </div>

                  {/* Phone & Service Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-2xl bg-[#1a1a1a] border border-[#333333] px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none transition-all duration-300 focus:border-ember focus:bg-[#222222] focus:ring-1 focus:ring-ember"
                      />
                    </div>

                    <div ref={dropdownRef} className="relative">
                      <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                        Service Needed
                      </label>

                      {/* Solid Non-Transparent Rounded Dropdown Trigger (Instant / No Animation) */}
                      <button
                        type="button"
                        onClick={() => setServiceDropdownOpen((prev) => !prev)}
                        className={`w-full rounded-2xl bg-[#1a1a1a] border px-4 py-3.5 text-sm text-left flex items-center justify-between cursor-pointer shadow-sm ${
                          serviceDropdownOpen
                            ? 'border-ember ring-2 ring-ember/40 bg-[#222222]'
                            : 'border-[#333333] hover:border-[#555555] hover:bg-[#222222]'
                        }`}
                        aria-haspopup="listbox"
                        aria-expanded={serviceDropdownOpen}
                      >
                        <span className="font-semibold text-white truncate">
                          {formData.service}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-ember shrink-0 ml-2 ${
                            serviceDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* 100% Solid Non-Transparent Rounded Dropdown Menu (No Animation) */}
                      {serviceDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-[#1a1a1a] border border-[#3a3a3a] p-1.5 shadow-[0_25px_60px_rgba(0,0,0,0.98)] max-h-60 overflow-y-auto custom-scrollbar">
                          {serviceOptions.map((opt) => {
                            const isSelected = formData.service === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, service: opt });
                                  setServiceDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-ember text-white shadow-md font-bold'
                                    : 'bg-[#1a1a1a] text-white/90 hover:bg-[#282828] hover:text-white font-medium'
                                }`}
                              >
                                <span>{opt}</span>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-white shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Details */}
                  <div>
                    <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                      Project Details <span className="text-ember">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Tell us about your brand vision, requirements, or timeline..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full rounded-2xl bg-[#1a1a1a] border border-[#333333] p-4 text-sm text-white placeholder-white/30 outline-none transition-all duration-300 focus:border-ember focus:bg-[#222222] focus:ring-1 focus:ring-ember resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-4 rounded-2xl bg-gradient-to-r from-[#ff5a1f] to-[#ff7a2f] text-white text-sm font-bold shadow-[0_0_25px_rgba(255,90,31,0.5)] hover:shadow-[0_0_35px_rgba(255,90,31,0.8)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Sending Details...
                      </span>
                    ) : (
                      <>
                        <span>Send Project Inquiry</span>
                        <Send className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}


