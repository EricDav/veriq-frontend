'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Shield, Lock, User, Eye, EyeOff, Share2, Copy, Check, ExternalLink, Camera, Upload } from 'lucide-react';
import { usersApi, authApi, agentsApi, ApiError } from '@/lib/api';
import { uploadToFileService } from '@/lib/upload';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import type { Agent } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// ─── Schemas ──────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number'),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])/,
        'Must contain uppercase, lowercase, number and special character',
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

// ─── Component ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [agentPhotoUploading, setAgentPhotoUploading] = useState(false);

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : 'U';

  // ── Load agent profile (for Share Public Profile card) ─────────────────

  useEffect(() => {
    if (user?.role === UserRole.AGENT) {
      agentsApi.getMyProfile().then((res) => setAgent(res.data)).catch(() => {});
    }
  }, [user?.role]);

  const copyProfileLink = async () => {
    if (!agent?.username) return;
    const url = `${window.location.origin}/${agent.username}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setLinkCopied(true);
    success('Profile link copied to clipboard');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Profile form ─────────────────────────────────────────────────────

  const {
    register: regP,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
    },
  });

  const onProfileSave = async (data: ProfileForm) => {
    if (!user) return;
    try {
      await usersApi.update(user.id, data);
      await refreshUser();
      success('Profile updated successfully!');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to update profile');
    }
  };

  const onPhotoUpload = async (file?: File) => {
    if (!user || !file) return;
    setPhotoUploading(true);
    try {
      const uploaded = await uploadToFileService(file);
      await usersApi.update(user.id, { profilePhotoUrl: uploaded.url });
      await refreshUser();
      success('Profile photo updated successfully!');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to upload profile photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const onAgentPhotoUpload = async (file?: File) => {
    if (!file) return;
    if (!agent) {
      toastError('Create your agent profile before uploading a public agent photo.');
      return;
    }

    setAgentPhotoUploading(true);
    try {
      const uploaded = await uploadToFileService(file);
      const res = await agentsApi.updateProfile({ profilePhotoUrl: uploaded.url });
      setAgent(res.data);
      success('Agent public photo updated successfully!');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to upload agent photo');
    } finally {
      setAgentPhotoUploading(false);
    }
  };

  // ── Password form ─────────────────────────────────────────────────────

  const {
    register: regPwd,
    handleSubmit: handlePasswordSubmit,
    reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: pwdSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onPasswordChange = async (data: PasswordForm) => {
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      success('Password changed successfully!');
      resetPwd();
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        toastError('Current password is incorrect.');
      } else {
        toastError(err instanceof ApiError ? err.message : 'Failed to change password');
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Profile Settings</h1>
        <p className="text-sm text-veriq-muted">Manage your account information and security</p>
      </div>

      {/* Avatar */}
      <div className="card p-6 flex items-center gap-5">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-veriq-secondary">
          {user?.profilePhotoUrl ? (
            <img src={user.profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-black text-white">
              {initials}
            </div>
          )}
          <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center bg-navy-900/75 py-1 text-white">
            {photoUploading ? <LoadingSpinner size="sm" /> : <Camera className="h-3.5 w-3.5" />}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={photoUploading}
              onChange={(e) => onPhotoUpload(e.target.files?.[0])}
            />
          </label>
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-navy-900">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-sm text-veriq-muted">{user?.email}</p>
          <div className="flex items-center gap-4 mt-2">
            <span className={`flex items-center gap-1.5 text-xs font-medium ${user?.isEmailVerified ? 'text-emerald-600' : 'text-slate-400'}`}>
              {user?.isEmailVerified ? <CheckCircle className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-current" />}
              Email {user?.isEmailVerified ? 'verified' : 'unverified'}
            </span>
            <span className="badge bg-slate-100 text-slate-600 text-[10px] capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Agent public photo */}
      {user?.role === UserRole.AGENT && (
        <div className="card p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {agent?.profilePhotoUrl ? (
                  <img src={agent.profilePhotoUrl} alt="Agent public profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <Camera className="h-7 w-7" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-navy-900">Agent Public Photo</h2>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-veriq-muted">
                  This photo appears on your public agent profile, property cards, and unlocked report details.
                </p>
                {!agent && (
                  <Link href="/dashboard/agent" className="mt-2 inline-flex text-xs font-semibold text-veriq-secondary hover:underline">
                    Create agent profile first
                  </Link>
                )}
              </div>
            </div>
            <label
              className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 transition-colors hover:border-veriq-secondary sm:w-auto ${
                !agent || agentPhotoUploading ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              {agentPhotoUploading ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
              {agentPhotoUploading ? 'Uploading...' : agent?.profilePhotoUrl ? 'Replace Photo' : 'Upload Photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!agent || agentPhotoUploading}
                onChange={(e) => onAgentPhotoUpload(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      )}

      {/* Share public profile (agents only) */}
      {user?.role === UserRole.AGENT && agent?.username && (
        <div className="card p-6">
          <h2 className="font-display text-base font-bold text-navy-900 mb-3 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-veriq-secondary" /> Your Public Profile
          </h2>
          <p className="text-xs text-veriq-muted mb-3">
            Anyone with this link can view your verified profile and all of your active listings — no login required.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-veriq-surface px-3 py-2.5 text-sm font-medium text-navy-700 truncate">
              veriqproperty.com/{agent.username}
            </div>
            <button
              type="button"
              onClick={copyProfileLink}
              className="btn-secondary !text-sm !py-2.5 flex items-center gap-2"
            >
              {linkCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {linkCopied ? 'Copied' : 'Copy Link'}
            </button>
            <Link
              href={`/${agent.username}`}
              target="_blank"
              className="btn-gold !text-sm !py-2.5 flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" /> View Profile
            </Link>
          </div>
        </div>
      )}

      {/* Personal info form */}
      <div className="card p-6">
        <h2 className="font-display text-base font-bold text-navy-900 mb-5 flex items-center gap-2">
          <User className="h-4 w-4 text-veriq-secondary" /> Personal Information
        </h2>
        <form onSubmit={handleProfileSubmit(onProfileSave)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">First Name</label>
              <input {...regP('firstName')} className="input" />
              {profileErrors.firstName && <p className="error">{profileErrors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Last Name</label>
              <input {...regP('lastName')} className="input" />
              {profileErrors.lastName && <p className="error">{profileErrors.lastName.message}</p>}
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={user?.email ?? ''}
                readOnly
                className="input bg-slate-50 text-slate-400 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input {...regP('phone')} type="tel" className="input" />
              {profileErrors.phone && <p className="error">{profileErrors.phone.message}</p>}
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={profileSubmitting} className="btn-primary !text-sm flex items-center gap-2">
              {profileSubmitting && <LoadingSpinner size="sm" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Password form */}
      <div className="card p-6">
        <h2 className="font-display text-base font-bold text-navy-900 mb-5 flex items-center gap-2">
          <Lock className="h-4 w-4 text-veriq-secondary" /> Change Password
        </h2>
        <form onSubmit={handlePasswordSubmit(onPasswordChange)} className="space-y-4">
          {/* Current */}
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input
                {...regPwd('currentPassword')}
                type={showCurrent ? 'text' : 'password'}
                className="input pr-11"
                placeholder="Enter current password"
              />
              <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwdErrors.currentPassword && <p className="error">{pwdErrors.currentPassword.message}</p>}
          </div>

          {/* New */}
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                {...regPwd('newPassword')}
                type={showNew ? 'text' : 'password'}
                className="input pr-11"
                placeholder="Enter new password"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwdErrors.newPassword && <p className="error">{pwdErrors.newPassword.message}</p>}
          </div>

          {/* Confirm */}
          <div>
            <label className="label">Confirm New Password</label>
            <div className="relative">
              <input
                {...regPwd('confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                className="input pr-11"
                placeholder="Confirm new password"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwdErrors.confirmPassword && <p className="error">{pwdErrors.confirmPassword.message}</p>}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={pwdSubmitting} className="btn-primary !text-sm flex items-center gap-2">
              {pwdSubmitting && <LoadingSpinner size="sm" />}
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Account management */}
      <div className="card p-6">
        <h2 className="font-display text-base font-bold text-navy-900 mb-5 flex items-center gap-2">
          <Shield className="h-4 w-4 text-veriq-secondary" /> Account Management
        </h2>
        <div className="space-y-3">
          <button className="w-full text-left rounded-xl border border-slate-200 px-4 py-3 text-sm text-navy-700 hover:bg-slate-50 transition-colors flex items-center justify-between">
            <span>Download my data</span>
            <span className="text-xs text-slate-400">GDPR Request</span>
          </button>
          <button className="w-full text-left rounded-xl border border-red-100 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center justify-between">
            <span>Delete Account</span>
            <span className="text-xs text-red-300">Irreversible</span>
          </button>
        </div>
      </div>
    </div>
  );
}
