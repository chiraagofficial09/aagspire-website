import React, { useState, useEffect } from 'react';
import {
  Building2,
  Key,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/work/Toast';

export const EmployeeProfile: React.FC = () => {
  const toast = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bankSaved, setBankSaved] = useState(false);

  // Bank details form
  const [bankData, setBankData] = useState({
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    upiId: '',
    panNumber: '',
  });

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employee/profile');
      setProfile(res.data.data);
      if (res.data.data?.bankDetails) {
        setBankData({
          accountNumber: res.data.data.bankDetails.accountNumber || '',
          ifscCode: res.data.data.bankDetails.ifscCode || '',
          bankName: res.data.data.bankDetails.bankName || '',
          upiId: res.data.data.bankDetails.upiId || '',
          panNumber: res.data.data.bankDetails.panNumber || '',
        });
      }
    } catch (err) {
      console.error('Error loading profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/employee/profile', { bankDetails: bankData });
      setBankSaved(true);
      toast.success('Disbursement banking details saved');
      setTimeout(() => setBankSaved(false), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update bank details');
    }
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
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Profile</h1>
        <p className="text-xs text-zinc-400 mt-1">Personal credentials, contact info, and confidential banking details.</p>
      </div>

      {/* Staff ID Card */}
      <div className="bg-[#08090d] border border-white/[0.06] p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#FF5A1F] flex items-center justify-center text-base font-bold text-black shrink-0">
            {profile?.name ? profile.name[0].toUpperCase() : 'E'}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{profile?.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{profile?.designation || 'Staff Producer'}</p>
            <p className="text-xs text-zinc-500 font-mono">{profile?.email}</p>
          </div>
        </div>

        <div className="text-xs font-mono sm:text-right">
          <span className="text-zinc-500 block uppercase text-[10px]">TENURE COMMENCED</span>
          <span className="text-white font-medium">
            {profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString('en-IN') : 'Active Contributor'}
          </span>
        </div>
      </div>

      {/* Banking & UPI */}
      <div className="bg-[#08090d] border border-white/[0.06] p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <Building2 className="w-4 h-4 text-[#FF5A1F]" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Disbursement Banking & UPI</h2>
            <p className="text-xs text-zinc-500">Your payments will be credited to this verified account</p>
          </div>
        </div>

        <form onSubmit={handleUpdateBank} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium text-xs">Bank Account Number *</label>
              <input
                type="text"
                required
                placeholder="123456789012"
                value={bankData.accountNumber}
                onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium text-xs">IFSC Code *</label>
              <input
                type="text"
                required
                placeholder="HDFC0001234"
                value={bankData.ifscCode}
                onChange={(e) => setBankData({ ...bankData, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white font-mono text-xs uppercase focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium text-xs">Bank Name</label>
              <input
                type="text"
                placeholder="HDFC Bank"
                value={bankData.bankName}
                onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium text-xs">UPI ID</label>
              <input
                type="text"
                placeholder="name@okhdfcbank"
                value={bankData.upiId}
                onChange={(e) => setBankData({ ...bankData, upiId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1.5 font-medium text-xs">PAN Card Number</label>
            <input
              type="text"
              placeholder="ABCDE1234F"
              value={bankData.panNumber}
              onChange={(e) => setBankData({ ...bankData, panNumber: e.target.value.toUpperCase() })}
              className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white font-mono text-xs uppercase focus:outline-none focus:border-white/20"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer"
          >
            {bankSaved ? <Check className="w-4 h-4" /> : null}
            <span>{bankSaved ? 'Saved Successfully!' : 'Save Banking Details'}</span>
          </button>
        </form>
      </div>

      {/* Password Security */}
      <div className="bg-[#08090d] border border-white/[0.06] p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <Key className="w-4 h-4 text-[#FF5A1F]" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Security & Credentials</h2>
            <p className="text-xs text-zinc-500">Update your portal password</p>
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
              className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-white/20"
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
                className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-white/20"
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
                className="w-full px-3.5 py-2.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-white/20"
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
