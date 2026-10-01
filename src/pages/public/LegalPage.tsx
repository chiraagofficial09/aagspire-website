import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  ArrowLeft,
  Calendar,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Mail,
  MapPin,
  Clock,
} from 'lucide-react';
import axios from 'axios';
import Footer from '../../components/Footer';

interface LegalSection {
  _id?: string;
  heading: string;
  description: string;
  order: number;
}

interface LegalDocData {
  type: 'terms_and_conditions' | 'privacy_policy';
  title: string;
  subtitle?: string;
  sections: LegalSection[];
  lastUpdated?: string;
}

interface LegalPageProps {
  type: 'terms_and_conditions' | 'privacy_policy';
}

export const LegalPage: React.FC<LegalPageProps> = ({ type }) => {
  const location = useLocation();
  const [doc, setDoc] = useState<LegalDocData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<number>(0);

  // Determine base API url
  const rawBaseUrl = import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '')
    : '';
  const apiBase = rawBaseUrl ? (rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`) : '/api';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true);
    setError(null);

    // Fetch legal document from public endpoint (no auth required)
    axios
      .get(`${apiBase}/legal/${type}`)
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setDoc(res.data.data);
        } else {
          setError('Unable to load document.');
        }
      })
      .catch((err) => {
        console.error('Error fetching legal document:', err);
        setError('Failed to load legal document. Please try again later.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [type, location.pathname, apiBase]);

  const isTerms = type === 'terms_and_conditions';

  return (
    <div className="min-h-screen bg-[#030305] text-white selection:bg-[#FF5A1F] selection:text-white relative overflow-x-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#FF5A1F]/10 via-[#FF5A1F]/5 to-transparent blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-[#FF7A45]/5 to-transparent blur-[140px] pointer-events-none z-0" />

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#030305]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/Aagspire_Logo.png"
                alt="Aagspire"
                className="h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>

            <span className="hidden sm:inline-block w-px h-5 bg-white/10" />

            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Quick Switcher Between Terms and Privacy */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <Link
              to="/terms"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isTerms
                  ? 'bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Terms</span>
            </Link>

            <Link
              to="/privacy"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                !isTerms
                  ? 'bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacy</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24">
        {/* Mobile Back Button */}
        <div className="sm:hidden mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="max-w-3xl mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[#FF5A1F] text-xs font-semibold">
            {isTerms ? <FileText className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{isTerms ? 'Client Agreement & Service Terms' : 'Data Protection & Privacy'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {doc?.title || (isTerms ? 'Terms & Conditions' : 'Privacy Policy')}
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            {doc?.subtitle ||
              (isTerms
                ? 'Standard creative service policies, deliverable rights, and operating principles for Aagspire clients.'
                : 'How Aagspire protects your corporate data, brand assets, and digital privacy.')}
          </p>

          {doc?.lastUpdated && (
            <div className="inline-flex items-center gap-2 text-xs text-zinc-500 pt-2">
              <Calendar className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>
                Last revised:{' '}
                <strong className="text-zinc-300 font-medium">
                  {new Date(doc.lastUpdated).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </strong>
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] border border-white/[0.06] rounded-3xl bg-white/[0.01]">
            <div className="w-10 h-10 rounded-full border-2 border-[#FF5A1F]/20 border-t-[#FF5A1F] animate-spin mb-4" />
            <p className="text-sm text-zinc-400">Loading policy content...</p>
          </div>
        ) : error ? (
          <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-3xl text-center space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-xs rounded-xl transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 items-start">
            {/* Left Sticky Sidebar: Table of Contents & Quick Contact */}
            <aside className="hidden lg:block sticky top-28 space-y-6">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">
                  Contents
                </p>
                <nav className="space-y-1">
                  {doc?.sections?.map((sec, idx) => (
                    <a
                      key={idx}
                      href={`#clause-${idx + 1}`}
                      onClick={() => setActiveSectionId(idx)}
                      className={`block px-3 py-2 rounded-xl text-xs transition-colors line-clamp-1 ${
                        activeSectionId === idx
                          ? 'bg-[#FF5A1F]/10 text-[#FF5A1F] font-semibold border-l-2 border-[#FF5A1F]'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      {sec.heading}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Studio Support Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF5A1F]" />
                  <h4 className="text-xs font-bold text-white tracking-tight">Need Clarification?</h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Our team is available to discuss custom enterprise agreements or specific confidentiality covenants.
                </p>
                <div className="pt-2 border-t border-white/[0.04] space-y-2">
                  <a
                    href="mailto:contact@aagspire.com"
                    className="flex items-center gap-2 text-[11px] text-zinc-300 hover:text-[#FF5A1F] transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    <span>contact@aagspire.com</span>
                  </a>
                  <div className="flex items-start gap-2 text-[11px] text-zinc-400">
                    <MapPin className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0 mt-0.5" />
                    <span>Parmeshwar Arcade, Halvad</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Right: Policy Sections List */}
            <div className="space-y-6">
              {doc?.sections && doc.sections.length > 0 ? (
                doc.sections.map((section, idx) => (
                  <article
                    key={idx}
                    id={`clause-${idx + 1}`}
                    className="scroll-mt-28 p-6 sm:p-8 rounded-3xl bg-[#090a0f] border border-white/[0.06] hover:border-white/10 transition-all duration-300 group"
                  >
                    {/* Clause Badge & Order */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-lg bg-white/[0.04] text-[#FF5A1F] border border-white/[0.06]">
                        SECTION {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Section Heading */}
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-4 group-hover:text-[#FF7A45] transition-colors">
                      {section.heading}
                    </h2>

                    {/* Section Description */}
                    <div className="text-sm text-zinc-300 leading-relaxed space-y-3 whitespace-pre-line">
                      {section.description}
                    </div>
                  </article>
                ))
              ) : (
                <div className="p-12 text-center border border-white/[0.06] rounded-3xl bg-white/[0.01]">
                  <p className="text-sm text-zinc-400">No policy clauses published yet.</p>
                </div>
              )}

              {/* Bottom Questions CTA */}
              <div className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-obsidian via-[#120a06] to-obsidian border border-[#FF5A1F]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Questions Regarding Our Legal Terms?
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-lg leading-relaxed">
                    If you have questions about our terms, copyrights, design milestones, or privacy practices, reach out to our team anytime.
                  </p>
                </div>
                <Link
                  to="/#contact"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#FF5A1F] hover:bg-[#FF7A45] text-white shadow-lg shadow-[#FF5A1F]/20 hover:shadow-[#FF5A1F]/30 transition-all duration-200 shrink-0"
                >
                  Contact Studio
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Main Website Footer */}
      <Footer />
    </div>
  );
};
