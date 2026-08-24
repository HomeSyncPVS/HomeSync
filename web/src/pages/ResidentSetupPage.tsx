import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Mail, 
  Camera, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  HeartHandshake
} from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export const ResidentSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  // Profile Form States initialized directly from authenticated user
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone?.replace(/^\+91/, '') || '');
  const [email] = useState(user?.email || '');
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(user?.profile_image_url || null);

  // Optional Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Async States
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Handle Profile Photo selection & local preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, photo: 'File must be an image (JPEG, PNG, WebP)' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photo: 'Image size must be less than 5MB' }));
        return;
      }
      setErrors((prev) => ({ ...prev, photo: '' }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Validation Logic
  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'fullName':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Full name must be at least 2 characters';
        return null;
      case 'phone':
        if (value.trim()) {
          const cleaned = value.replace(/\D/g, '');
          if (cleaned.length !== 10) return 'Please enter a valid 10-digit mobile number';
          if (!/^[6-9]/.test(cleaned)) return 'Must start with 6, 7, 8, or 9';
        }
        return null;
      case 'emergencyPhone':
        if (value.trim()) {
          const cleaned = value.replace(/\D/g, '');
          if (cleaned.length !== 10) return 'Please enter a valid 10-digit number';
        }
        return null;
      default:
        return null;
    }
  };

  const handleBlur = (field: string, value: any) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error || '' }));
  };

  // Submit and continue to B02
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const nameError = validateField('fullName', fullName);
    const phoneError = validateField('phone', phone);
    const emergencyPhoneError = validateField('emergencyPhone', emergencyPhone);

    const newErrors: Record<string, string> = {
      fullName: nameError || '',
      phone: phoneError || '',
      emergencyPhone: emergencyPhoneError || '',
    };
    setErrors(newErrors);
    setTouched({ fullName: true, phone: true, emergencyPhone: true });

    if (nameError || phoneError || emergencyPhoneError) {
      return;
    }

    setIsSaving(true);

    const formattedPhone = phone.trim() ? `+91${phone.replace(/\D/g, '')}` : undefined;

    try {
      if (user?.id) {
        // Call backend update endpoint
        const updated = await authService.updateProfile(user.id, {
          full_name: fullName.trim(),
          phone: formattedPhone,
        });

        // Update local session
        updateUser({
          ...user,
          full_name: updated.full_name,
          phone: updated.phone,
          profile_image_url: profileImagePreview || user.profile_image_url,
        });
      }

      // Proceed to Page B02: Residency Choice
      navigate('/onboarding/residency-choice');
    } catch (err: any) {
      setApiError(err.message || 'Failed to save profile. Please check your information and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get user avatar initials
  const getInitials = (nameStr: string): string => {
    const parts = nameStr.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'HS';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-surface-background flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans text-secondary">
      {/* Top Navbar / Stepper Header */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between pb-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-glow">
            <Building2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <span className="font-headline font-bold text-2xl text-secondary tracking-tight">HomeSync</span>
            <span className="block text-xs font-medium text-secondary-muted">Resident Onboarding</span>
          </div>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-xs uppercase tracking-wider">
            Step 1 of 2
          </span>
        </div>
      </header>

      {/* Main Card Content */}
      <main className="w-full max-w-2xl mx-auto my-6 sm:my-8 bg-surface rounded-3xl border border-surface-border shadow-card p-6 sm:p-10">
        {/* Header Titles */}
        <div className="mb-8">
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-secondary mb-2 tracking-tight">
            Set up your profile
          </h1>
          <p className="text-secondary-muted text-sm sm:text-base leading-relaxed">
            Tell us a little about yourself before you set up or join your residency.
          </p>
        </div>

        {/* Error Alert Banner */}
        {apiError && (
          <div 
            role="alert" 
            className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-fadeIn"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 font-medium">{apiError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Profile Photo Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-surface-border">
            <div className="relative">
              {profileImagePreview ? (
                <img
                  src={profileImagePreview}
                  alt="Profile Preview"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-primary shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-headline font-bold text-2xl border-2 border-dashed border-primary/30">
                  {getInitials(fullName || 'User')}
                </div>
              )}

              <label
                htmlFor="profile-photo-upload"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center cursor-pointer shadow-md transition-transform active:scale-95"
                title="Upload profile photo"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="profile-photo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="text-center sm:text-left flex-1">
              <h2 className="text-sm font-semibold text-secondary">Profile Photo</h2>
              <p className="text-xs text-secondary-muted mt-0.5">
                Upload a JPEG, PNG, or WebP photo (max 5MB) for your society badge.
              </p>
              {profileImagePreview && (
                <button
                  type="button"
                  onClick={() => setProfileImagePreview(null)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 mt-1.5 inline-block"
                >
                  Remove photo
                </button>
              )}
              {errors.photo && (
                <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1 justify-center sm:justify-start">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.photo}
                </p>
              )}
            </div>
          </div>

          {/* 1. Full Name */}
          <div>
            <label htmlFor="full-name" className="block text-sm font-semibold text-secondary mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
              errors.fullName && touched.fullName
                ? 'border-red-400 ring-2 ring-red-100'
                : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
            }`}>
              <div className="pl-3.5 pr-2 text-slate-400">
                <User className="w-5 h-5" aria-hidden="true" />
              </div>
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (touched.fullName) setErrors((prev) => ({ ...prev, fullName: validateField('fullName', e.target.value) || '' }));
                }}
                onBlur={() => handleBlur('fullName', fullName)}
                placeholder="Enter your full name"
                className="flex-1 w-full px-2 py-2.5 text-sm sm:text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                disabled={isSaving}
              />
            </div>
            {errors.fullName && touched.fullName && (
              <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.fullName}
              </p>
            )}
          </div>

          {/* 2. Mobile Number */}
          <div>
            <label htmlFor="phone-number" className="block text-sm font-semibold text-secondary mb-1.5">
              Mobile Number
            </label>
            <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
              errors.phone && touched.phone
                ? 'border-red-400 ring-2 ring-red-100'
                : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
            }`}>
              <div className="px-3 py-2.5 bg-slate-50 border-r border-surface-border text-secondary font-medium text-sm flex items-center gap-1 select-none">
                <span>🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                id="phone-number"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(raw);
                  if (touched.phone) setErrors((prev) => ({ ...prev, phone: validateField('phone', raw) || '' }));
                }}
                onBlur={() => handleBlur('phone', phone)}
                placeholder="98765 43210"
                className="flex-1 w-full px-3 py-2.5 text-sm sm:text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                disabled={isSaving}
              />
            </div>
            {errors.phone && touched.phone && (
              <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* 3. Email (Read-only / Verified) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="email-address" className="block text-sm font-semibold text-secondary">
                Registered Email Address
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </span>
            </div>
            <div className="flex items-center rounded-xl border border-surface-border bg-slate-50 overflow-hidden shadow-sm">
              <div className="pl-3.5 pr-2 text-slate-400">
                <Mail className="w-5 h-5" aria-hidden="true" />
              </div>
              <input
                id="email-address"
                type="email"
                value={email || 'user@example.com'}
                readOnly
                disabled
                className="flex-1 w-full px-2 py-2.5 text-sm sm:text-base text-secondary bg-transparent border-0 font-medium cursor-not-allowed select-all opacity-80"
              />
            </div>
          </div>

          {/* 4. Emergency Contact Section (Optional) */}
          <div className="pt-2 border-t border-surface-border">
            <div className="flex items-center gap-2 mb-3">
              <HeartHandshake className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-sm font-semibold text-secondary">Emergency Contact (Optional)</h2>
                <p className="text-xs text-secondary-muted">A family member or contact person during emergencies.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Emergency Name */}
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Contact Person Name"
                className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-surface-border bg-white text-secondary placeholder-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 font-medium"
                disabled={isSaving}
              />

              {/* Relationship */}
              <input
                type="text"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="Relationship (e.g. Spouse, Parent)"
                className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-surface-border bg-white text-secondary placeholder-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 font-medium"
                disabled={isSaving}
              />

              {/* Emergency Phone */}
              <input
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-Digit Mobile"
                className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-surface-border bg-white text-secondary placeholder-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 font-medium"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Primary CTA: Continue to Residency Choice */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full h-12 bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-semibold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-card hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Saving profile...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-2xl mx-auto pt-6 text-center text-xs text-secondary-muted border-t border-surface-border">
        <div className="flex justify-center items-center gap-4 mb-1 font-medium">
          <a href="#terms" className="hover:text-primary transition-colors">Terms of Service</a>
          <span>•</span>
          <a href="#privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#support" className="hover:text-primary transition-colors">Support</a>
        </div>
        <p>© {new Date().getFullYear()} HomeSync Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ResidentSetupPage;
