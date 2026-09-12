import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Mail, ArrowLeft, CheckCircle2, Flame, ArrowRight } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
      }
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-[#0b0c11] border border-white/[0.08] p-8 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-0.5 select-none mb-2.5">
          <span className="text-3xl sm:text-4xl font-black tracking-tight text-[#FF5A1F]">Aag</span>
          <span className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center">
            sp
            <span className="relative inline-flex justify-center">
              <Flame className="w-4 h-4 text-[#FF5A1F] fill-[#FF5A1F] absolute -top-2 left-1/2 -translate-x-1/2" />
              <span>ı</span>
            </span>
            re
          </span>
        </div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-white/90 font-bold uppercase">
          WORKSPACE PORTAL
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 font-medium">
          Password Recovery
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-xs text-white/70">
            If an account matches <strong className="text-white">{email}</strong>, a recovery token has been registered.
          </p>

          {resetToken && (
            <div className="p-3.5 rounded-2xl bg-[#12131a] border border-white/[0.08] text-left space-y-1.5">
              <span className="text-[10px] font-mono text-[#FF5A1F] block uppercase font-bold tracking-wider">Dev Simulation Token:</span>
              <p className="text-xs font-mono text-zinc-300 break-all select-all">{resetToken}</p>
              <Link
                to={`/work/reset-password?token=${resetToken}`}
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#FF5A1F] hover:underline"
              >
                <span>Proceed to Reset Form</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          <div className="pt-3">
            <Link
              to="/work/login"
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
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
                  <span>Send Recovery Token</span>
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
