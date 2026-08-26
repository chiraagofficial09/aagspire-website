import { useEffect, useRef, useState } from 'react';
import { Send, CheckCircle2, X, ArrowRight, ArrowUpRight, Sparkles, Mail } from 'lucide-react';

const serviceOptions = [
  'Social Media Marketing',
  'Logo Design',
  'Poster Design',
  'Motion & Video',
  'UI/UX & Web Development',
  'Packaging Design',
];

export default function CTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: 'Social Media Marketing',
    message: '',
  });

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 800);
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
                onClick={() => setIsModalOpen(true)}
                className="magnetic-btn group relative px-9 py-4 rounded-full bg-ember text-white text-sm font-semibold ember-glow hover:scale-105 transition-transform flex items-center gap-3 cursor-pointer"
              >
                <span className="relative z-10">Start Your Project</span>
                <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#work"
                className="magnetic-btn px-8 py-4 rounded-full glass-card glass-card-hover text-sm font-semibold flex items-center gap-2"
              >
                <span>View Our Work</span>
                <ArrowUpRight className="w-4 h-4 text-ember" />
              </a>
            </div>

            {/* Quick Meta Footer */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-14 text-xs font-medium text-white/40">
              <a
                href="mailto:hello@aagspire.com"
                className="hover:text-ember transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-ember" />
                hello@aagspire.com
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
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-obsidian/85 backdrop-blur-xl animate-fade-up" />

          {/* Modal Card */}
          <div
            className="relative max-w-2xl w-full glass-card rounded-3xl p-8 sm:p-10 border border-white/15 shadow-2xl max-h-[90vh] overflow-y-auto z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full glass-card border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-white/80" />
            </button>

            {submitted ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-ember/20 border border-ember/40 flex items-center justify-center text-ember mb-6 ember-glow">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">Project Inquiry Received!</h3>
                <p className="text-white/60 max-w-md mx-auto mb-8 leading-relaxed">
                  Thank you, <strong className="text-white">{formData.name || 'there'}</strong>. We've received your project details and our team will get back to you with a roadmap within 24 hours.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setIsModalOpen(false);
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      service: 'Social Media Marketing',
                      message: '',
                    });
                  }}
                  className="px-8 py-3 rounded-full bg-ember text-white text-sm font-semibold ember-glow hover:scale-105 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-ember" />
                  <span className="text-xs font-semibold text-ember uppercase tracking-widest">
                    Start Your Project
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Let's talk about your next big move.
                </h3>
                <p className="text-sm text-white/50 mb-8 leading-relaxed">
                  Fill in your details below and we'll connect with you within 24 hours.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                        Your Name <span className="text-ember">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all duration-300 focus:border-ember focus:bg-white/[0.08] focus:ring-1 focus:ring-ember"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                        Email Address <span className="text-ember">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all duration-300 focus:border-ember focus:bg-white/[0.08] focus:ring-1 focus:ring-ember"
                      />
                    </div>
                  </div>

                  {/* Phone & Service Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all duration-300 focus:border-ember focus:bg-white/[0.08] focus:ring-1 focus:ring-ember"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                        Service Needed
                      </label>
                      <select
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        className="w-full rounded-xl bg-[#0d0d0d] border border-white/10 px-4 py-3 text-sm text-white outline-none transition-all duration-300 focus:border-ember focus:ring-1 focus:ring-ember cursor-pointer"
                      >
                        {serviceOptions.map((opt) => (
                          <option key={opt} value={opt} className="bg-[#0d0d0d] text-white">
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div>
                    <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                      Project Details <span className="text-ember">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Tell us about your brand, goals, timeline, or requirements..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full rounded-xl bg-white/[0.04] border border-white/10 p-4 text-sm text-white placeholder-white/20 outline-none transition-all duration-300 focus:border-ember focus:bg-white/[0.08] focus:ring-1 focus:ring-ember resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="magnetic-btn w-full mt-2 py-4 rounded-xl bg-ember text-white text-sm font-semibold ember-glow hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Sending Message...
                      </span>
                    ) : (
                      <>
                        <span>Submit Project Details</span>
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


