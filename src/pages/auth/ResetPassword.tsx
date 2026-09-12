import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Lock, ArrowLeft, CheckCircle2, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => {
        navigate('/work/login');
      }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password reset failed. Invalid or expired token.');
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
          Set New Staff Password
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-xs text-white/80">
            Password reset successfully! Redirecting you to login...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <KeyRound className="absolute left-4 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Reset Token"
                className="w-full bg-[#12131a] hover:bg-[#151620] focus:bg-[#12131a] border border-white/[0.09] focus:border-[#FF5A1F] text-white placeholder-zinc-500 text-sm rounded-2xl pl-11 pr-4 py-3.5 outline-none transition-all font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password (min. 6 characters)"
                className="w-full bg-[#12131a] hover:bg-[#151620] focus:bg-[#12131a] border border-white/[0.09] focus:border-[#FF5A1F] text-white placeholder-zinc-500 text-sm rounded-2xl pl-11 pr-4 py-3.5 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
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
                  <span>Save New Password</span>
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
