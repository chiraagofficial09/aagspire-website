import { useEffect, useRef, useState } from 'react';
import { Send, CheckCircle2, Mail, MapPin, Clock, Sparkles } from 'lucide-react';

const serviceOptions = [
  'Social Media Marketing',
  'Logo Design',
  'Poster Design',
  'Motion & Video',
  'UI/UX & Web Development',
  'Packaging',
];

export default function CTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
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
      { threshold: 0.15 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate clean submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <section ref={sectionRef} id="contact" className="relative py-32 px-6 max-w-7xl mx-auto">
      <div className={`section-reveal ${visible ? 'visible' : ''} text-center mb-16`}>
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full glass-card border border-white/10">
          <span className="w-2 h-2 rounded-full bg-ember animate-pulse" />
          <span className="text-xs font-semibold text-white/70 tracking-widest uppercase">Get In Touch</span>
        </div>
        <h2 className="section-title mb-4">
          Let's Build Something <span className="text-gradient text-shadow-glow">Unforgettable.</span>
        </h2>
        <p className="text-white/50 max-w-xl mx-auto text-base md:text-lg leading-relaxed">
          Tell us about your project or vision. We'll get back to you with ideas and a strategic roadmap within 24 hours.
        </p>
      </div>

      <div className={`section-reveal ${visible ? 'visible' : ''} grid grid-cols-1 lg:grid-cols-12 gap-10 items-start`}>
        {/* Left: Contact Info & Value Props (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-card rounded-3xl p-8 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-ember/10 rounded-full blur-3xl pointer-events-none" />
            <h3 className="text-2xl font-bold mb-3 text-white">Let's talk about your next big move.</h3>
            <p className="text-sm text-white/50 leading-relaxed mb-8">
              Whether you're launching a brand from scratch or scaling an existing powerhouse, our team is ready to ignite your vision.
            </p>

            <div className="flex flex-col gap-5 border-t border-white/5 pt-6">
              <a
                href="mailto:hello@aagspire.com"
                className="flex items-center gap-3.5 group text-sm text-white/70 hover:text-white transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-ember/10 border border-ember/30 flex items-center justify-center shrink-0 group-hover:bg-ember group-hover:text-white transition-all">
                  <Mail className="h-4 w-4 text-ember group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Email Us</p>
                  <p className="font-semibold text-white/90">hello@aagspire.com</p>
                </div>
              </a>

              <a
                href="https://maps.app.goo.gl/jjAYk4USRPfAxCgH7"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3.5 group text-sm text-white/70 hover:text-white transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-ember/10 border border-ember/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-ember group-hover:text-white transition-all">
                  <MapPin className="h-4 w-4 text-ember group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Studio Office</p>
                  <p className="font-semibold text-white/90 leading-tight">
                    5, First Floor, Parmeshwar Arcade,
                    <br />
                    <span className="text-xs font-normal text-white/50">Halvad - Maliya Highway, Halvad - 363330</span>
                  </p>
                </div>
              </a>

              <div className="flex items-center gap-3.5 text-sm text-white/70">
                <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-ember" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Fast Turnaround</p>
                  <p className="font-semibold text-white/90">Guaranteed response within 24h</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-white/5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-ember/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-ember" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Turning Sparks Into Fire</p>
              <p className="text-xs text-white/40 leading-relaxed">
                Over 1200+ projects completed with 98% client satisfaction rate.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Interactive Contact Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="glass-card rounded-3xl p-8 md:p-10 border border-white/10 relative overflow-hidden">
            <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-ember/10 blur-[100px] pointer-events-none" />

            {submitted ? (
              <div className="py-16 text-center flex flex-col items-center justify-center animate-fade-up">
                <div className="w-16 h-16 rounded-full bg-ember/20 border border-ember/40 flex items-center justify-center text-ember mb-6 ember-glow">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">Message Received!</h3>
                <p className="text-white/60 max-w-md mx-auto mb-8 leading-relaxed">
                  Thank you for reaching out, <strong className="text-white">{formData.name || 'there'}</strong>. We've received your project details and will get back to you within 24 hours.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      service: 'Social Media Marketing',
                      message: '',
                    });
                  }}
                  className="px-6 py-2.5 rounded-full border border-white/20 text-xs font-semibold uppercase tracking-widest text-white hover:bg-white/5 transition-all"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">
                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                      className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3.5 text-sm text-white placeholder-white/20 outline-none transition-all duration-300 focus:border-ember focus:bg-white/[0.06] focus:ring-1 focus:ring-ember"
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
                      className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3.5 text-sm text-white placeholder-white/20 outline-none transition-all duration-300 focus:border-ember focus:bg-white/[0.06] focus:ring-1 focus:ring-ember"
                    />
                  </div>
                </div>

                {/* Phone & Service Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3.5 text-sm text-white placeholder-white/20 outline-none transition-all duration-300 focus:border-ember focus:bg-white/[0.06] focus:ring-1 focus:ring-ember"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                      Service Needed
                    </label>
                    <select
                      value={formData.service}
                      onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                      className="w-full rounded-xl bg-[#0d0d0d] border border-white/10 px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 focus:border-ember focus:ring-1 focus:ring-ember cursor-pointer"
                    >
                      {serviceOptions.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#0d0d0d] text-white">
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Message Field */}
                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                    Project Details <span className="text-ember">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us about your brand, goals, timeline, or any specific requirements..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/10 p-4 text-sm text-white placeholder-white/20 outline-none transition-all duration-300 focus:border-ember focus:bg-white/[0.06] focus:ring-1 focus:ring-ember resize-none"
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
                      <span>Send Project Inquiry</span>
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

