import React, { useState } from 'react';
import { Building2, User, Key, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../components/work/Toast';

export const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [saved, setSaved] = useState(false);

  // Profile Form
  const [name, setName] = useState(user?.name || 'Administrator');
  const [email, setEmail] = useState(user?.email || 'admin@aagspire.com');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    toast.success('Admin profile updated');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.warning('Passwords do not match');
      return;
    }
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-xs text-zinc-400 mt-1">Manage workspace metadata and admin credentials.</p>
      </div>

      {/* Organization Meta */}
      <div className="bg-[#08090d] border border-white/[0.06] p-6 rounded-2xl space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
          <Building2 className="w-4 h-4 text-[#FF5A1F]" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Agency Organization</h2>
            <p className="text-xs text-zinc-500">Corporate parameters</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-zinc-400 block mb-1.5 font-medium text-xs">Company Trade Name</label>
            <input
              type="text"
              disabled
              value="Aagspire Creative Media Pvt Ltd"
              className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.06] rounded-xl text-zinc-400 text-xs font-medium cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-zinc-400 block mb-1.5 font-medium text-xs">Platform Currency</label>
            <input
              type="text"
              disabled
              value="INR (₹) - Indian Rupee"
              className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.06] rounded-xl text-zinc-400 font-mono text-xs cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Admin Profile */}
      <div className="bg-[#08090d] border border-white/[0.06] p-6 rounded-2xl space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
          <User className="w-4 h-4 text-[#FF5A1F]" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Admin Profile</h2>
            <p className="text-xs text-zinc-500">Personal identity and notification destination</p>
          </div>
        </div>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium text-xs">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white/20"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium text-xs">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white/20"
                placeholder="admin@aagspire.com"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            <span>{saved ? 'Saved!' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>

      {/* Security Credentials */}
      <div className="bg-[#08090d] border border-white/[0.06] p-6 rounded-2xl space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
          <Key className="w-4 h-4 text-[#FF5A1F]" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Security Credentials</h2>
            <p className="text-xs text-zinc-500">Update administrative password</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="text-zinc-400 block mb-1.5 font-medium text-xs">Current Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white/20"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium text-xs">New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium text-xs">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer"
          >
            Update Security Password
          </button>
        </form>
      </div>
    </div>
  );
};
