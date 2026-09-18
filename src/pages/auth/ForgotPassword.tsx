import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Mail, ArrowLeft, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg) {
        setError(msg);
      } else {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-[#0b0c11] border border-white/[0.08] p-8 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-3">
          <img
            src="/Aagspire_Logo.png"
            alt="Aagspire"
            className="h-9 sm:h-10 w-auto object-contain"
          />
        </div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-white/90 font-bold uppercase">
          WORKSPACE PORTAL
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 font-medium">
          Password Recovery
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">Check Your Email</h3>
          <p className="text-xs text-white/60 leading-relaxed">
            We've sent a password reset link to{' '}
            <strong className="text-white">{email}</strong>.
            <br />
            Please check your inbox and spam folder.
          </p>
          <div className="p-3.5 rounded-2xl bg-[#12131a] border border-white/[0.08] text-left">
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              ⏰ The link expires in <strong className="text-[#FF5A1F]">1 hour</strong>.
              <br />
              Didn't receive the email? Check your spam folder or try again.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => { setSubmitted(false); setError(null); }}
              className="text-xs font-medium text-[#FF5A1F] hover:text-[#ff7847] hover:underline cursor-pointer"
            >
              Try with a different email
            </button>
            <Link
              to="/work/login"
              className="inline-flex items-center justify-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-[#12131a] hover:bg-[#151620] focus:bg-[#12131a] border border-white/[0.09] focus:border-[#FF5A1F] text-white placeholder-zinc-500 text-sm rounded-2xl pl-11 pr-4 py-3.5 outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#FF5A1F] hover:bg-[#e04810] active:scale-[0.99] text-white font-semibold text-base transition-all shadow-[0_8px_25px_rgba(255,90,31,0.25)] hover:shadow-[0_10px_35px_rgba(255,90,31,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <Link
              to="/work/login"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};
