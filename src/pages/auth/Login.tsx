import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      navigate(result.redirect);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'admin' | 'employee') => {
    if (role === 'admin') {
      setEmail('admin@aagspire.com');
      setPassword('AagspireAdmin@2026');
    } else {
      setEmail('jshailesh798@gmail.com');
      setPassword('');
    }
    setError(null);
  };

  return (
    <div className="rounded-3xl bg-[#0b0c11] border border-white/[0.08] p-8 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative">
      {/* Brand Header matching mockup */}
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
          Secure Access for Authorized Staff
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Address */}
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

        {/* Password */}
        <div className="space-y-1.5">
          <div className="relative flex items-center">
            <Lock className="absolute left-4 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-[#12131a] hover:bg-[#151620] focus:bg-[#12131a] border border-white/[0.09] focus:border-[#FF5A1F] text-white placeholder-zinc-500 text-sm rounded-2xl pl-11 pr-11 py-3.5 outline-none transition-all font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex justify-end pt-1">
            <Link
              to="/work/forgot-password"
              className="text-xs font-medium text-[#FF5A1F] hover:text-[#ff7543] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Submit Button */}
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
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="relative my-7 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.07]" />
        </div>
        <span className="relative px-3 bg-[#0b0c11] text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          Admin and Employee Access Only
        </span>
      </div>

      {/* Quick Demo Credentials */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => fillDemo('admin')}
          className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] text-[10px] font-mono transition-all cursor-pointer"
        >
          Fill Admin
        </button>
        <button
          type="button"
          onClick={() => fillDemo('employee')}
          className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] text-[10px] font-mono transition-all cursor-pointer"
        >
          Fill Staff (Sanjay)
        </button>
      </div>
    </div>
  );
};
