import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Mail, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import type { SocietyResponse } from '../types/auth';

export const CreateResidencyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  // Form State
  const [societyName, setSocietyName] = useState('');
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [societyPhone, setSocietyPhone] = useState('');
  const [societyEmail, setSocietyEmail] = useState('');

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Async States
  const [isCreating, setIsCreating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdSociety, setCreatedSociety] = useState<SocietyResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Field Validation
  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case 'societyName':
        if (!value.trim()) return 'Residency / Society name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return null;
      case 'region':
        if (!value.trim()) return 'Locality / Region is required';
        if (value.trim().length < 2) return 'Region must be at least 2 characters';
        return null;
      case 'city':
        if (!value.trim()) return 'City is required';
        if (value.trim().length < 2) return 'City must be at least 2 characters';
        return null;
      case 'stateName':
        if (!value.trim()) return 'State is required';
        if (value.trim().length < 2) return 'State must be at least 2 characters';
        return null;
      case 'pincode':
        if (!value.trim()) return 'PIN code is required';
        if (!/^[1-9][0-9]{5}$/.test(value.trim())) {
          return 'Please enter a valid 6-digit Indian PIN code';
        }
        return null;
      case 'societyPhone':
        if (!value.trim()) return 'Official contact phone is required';
        const cleanedPhone = value.replace(/\D/g, '');
        if (cleanedPhone.length !== 10) return 'Please enter a valid 10-digit mobile number';
        if (!/^[6-9]/.test(cleanedPhone)) return 'Must start with 6, 7, 8, or 9';
        return null;
      case 'societyEmail':
        if (!value.trim()) return 'Official contact email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return 'Please enter a valid email address';
        }
        return null;
      default:
        return null;
    }
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error || '' }));
  };

  const handleCopyJoinCode = () => {
    if (createdSociety?.join_code) {
      navigator.clipboard.writeText(createdSociety.join_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const allTouched = {
      societyName: true,
      region: true,
      city: true,
      stateName: true,
      pincode: true,
      societyPhone: true,
      societyEmail: true,
    };
    setTouched(allTouched);

    const newErrors: Record<string, string> = {
      societyName: validateField('societyName', societyName) || '',
      region: validateField('region', region) || '',
      city: validateField('city', city) || '',
      stateName: validateField('stateName', stateName) || '',
      pincode: validateField('pincode', pincode) || '',
      societyPhone: validateField('societyPhone', societyPhone) || '',
      societyEmail: validateField('societyEmail', societyEmail) || '',
    };
    setErrors(newErrors);

    const hasError = Object.values(newErrors).some((err) => !!err);
    if (hasError) {
      return;
    }

    setIsCreating(true);

    const formattedPhone = `+91${societyPhone.replace(/\D/g, '')}`;

    try {
      const response = await authService.createSociety({
        name: societyName.trim(),
        region: region.trim(),
        address: address.trim() || undefined,
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
        phone: formattedPhone,
        email: societyEmail.trim(),
      });

      setCreatedSociety(response);

      // Update session with new society association
      if (user) {
        updateUser({
          ...user,
          society_id: response.id,
          approval_status: 'APPROVED',
        });
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to create residency. Please verify details and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-background flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans text-secondary">
      {/* Top Navbar / Stepper */}
      <header className="w-full max-w-3xl mx-auto flex items-center justify-between pb-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-glow">
            <Building2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <span className="font-headline font-bold text-2xl text-secondary tracking-tight">HomeSync</span>
            <span className="block text-xs font-medium text-secondary-muted">Residency Onboarding</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/onboarding/residency-choice')}
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-secondary-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Choices</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-3xl mx-auto my-6 sm:my-8 bg-surface rounded-3xl border border-surface-border shadow-card p-6 sm:p-10 lg:p-12">
        {createdSociety ? (
          /* ==================================================== */
          /* SUCCESS STATE: RESIDENCY CREATED & JOIN CODE DISPLAY */
          /* ==================================================== */
          <div className="text-center space-y-6 animate-fadeIn py-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Residency Created</span>
              </div>
              <h1 className="font-headline text-3xl font-bold text-secondary">
                {createdSociety.name}
              </h1>
              <p className="text-secondary-muted text-sm mt-1">
                {[createdSociety.region, createdSociety.city, createdSociety.state].filter(Boolean).join(', ')}
              </p>
            </div>

            {/* Unique Join Code Box */}
            {createdSociety.join_code && (
              <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-50 border border-surface-border space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-secondary-muted">
                  Unique Residency Join Code
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-primary bg-white px-4 py-2 rounded-xl border border-surface-border shadow-sm">
                    {createdSociety.join_code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyJoinCode}
                    className="p-3 rounded-xl border border-surface-border bg-white hover:bg-slate-50 text-secondary transition-all shadow-sm active:scale-95"
                    title="Copy Join Code"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-secondary-muted leading-relaxed">
                  Share this code with your residents, owners, and tenants so they can join your society.
                </p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs text-left space-y-1 max-w-md mx-auto">
              <p className="font-bold flex items-center gap-1.5 text-indigo-950">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Administrative Access Activated
              </p>
              <p>You have been assigned as the <strong>Society Admin</strong> for this residency.</p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/onboarding/structure-setup')}
              className="w-full max-w-md mx-auto h-12 bg-primary hover:bg-primary-hover text-white font-semibold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-card"
            >
              <span>Continue to Structure Setup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ==================================================== */
          /* FORM STATE: CREATE A RESIDENCY */
          /* ==================================================== */
          <>
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
                <Building2 className="w-3.5 h-3.5" />
                <span>Create Residency</span>
              </div>
              <h1 className="font-headline text-2xl sm:text-3xl font-bold text-secondary mb-2 tracking-tight">
                Create your residency
              </h1>
              <p className="text-secondary-muted text-sm sm:text-base leading-relaxed">
                Set up your residency on HomeSync and start managing your community digitally.
              </p>
            </div>

            {apiError && (
              <div 
                role="alert" 
                className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-fadeIn"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 font-medium">{apiError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* 1. Residency / Society Name */}
              <div>
                <label htmlFor="society-name" className="block text-sm font-semibold text-secondary mb-1.5">
                  Residency / Society Name <span className="text-red-500">*</span>
                </label>
                <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
                  errors.societyName && touched.societyName
                    ? 'border-red-400 ring-2 ring-red-100'
                    : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                }`}>
                  <div className="pl-3.5 pr-2 text-slate-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <input
                    id="society-name"
                    type="text"
                    value={societyName}
                    onChange={(e) => {
                      setSocietyName(e.target.value);
                      if (touched.societyName) setErrors((prev) => ({ ...prev, societyName: validateField('societyName', e.target.value) || '' }));
                    }}
                    onBlur={() => handleBlur('societyName', societyName)}
                    placeholder="e.g. Greenwood Heights Co-Op Housing Society"
                    className="flex-1 w-full px-2 py-2.5 text-sm sm:text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                    disabled={isCreating}
                  />
                </div>
                {errors.societyName && touched.societyName && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.societyName}
                  </p>
                )}
              </div>

              {/* 2. Region / Locality & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Region */}
                <div>
                  <label htmlFor="society-region" className="block text-sm font-semibold text-secondary mb-1.5">
                    Locality / Region <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
                    errors.region && touched.region
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                  }`}>
                    <div className="pl-3.5 pr-2 text-slate-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <input
                      id="society-region"
                      type="text"
                      value={region}
                      onChange={(e) => {
                        setRegion(e.target.value);
                        if (touched.region) setErrors((prev) => ({ ...prev, region: validateField('region', e.target.value) || '' }));
                      }}
                      onBlur={() => handleBlur('region', region)}
                      placeholder="e.g. Sector 45 or Baner"
                      className="flex-1 w-full px-2 py-2.5 text-sm sm:text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isCreating}
                    />
                  </div>
                  {errors.region && touched.region && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.region}
                    </p>
                  )}
                </div>

                {/* Street Address */}
                <div>
                  <label htmlFor="society-address" className="block text-sm font-semibold text-secondary mb-1.5">
                    Street Address (Optional)
                  </label>
                  <div className="flex items-center rounded-xl border border-surface-border bg-white overflow-hidden transition-all shadow-sm hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
                    <input
                      id="society-address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Near City Park, Main Road"
                      className="flex-1 w-full px-3.5 py-2.5 text-sm sm:text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isCreating}
                    />
                  </div>
                </div>
              </div>

              {/* 3. City, State, PIN Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* City */}
                <div>
                  <label htmlFor="society-city" className="block text-sm font-semibold text-secondary mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
                    errors.city && touched.city
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                  }`}>
                    <input
                      id="society-city"
                      type="text"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        if (touched.city) setErrors((prev) => ({ ...prev, city: validateField('city', e.target.value) || '' }));
                      }}
                      onBlur={() => handleBlur('city', city)}
                      placeholder="e.g. Pune"
                      className="flex-1 w-full px-3 py-2.5 text-sm sm:text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isCreating}
                    />
                  </div>
                  {errors.city && touched.city && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.city}
                    </p>
                  )}
                </div>

                {/* State */}
                <div>
                  <label htmlFor="society-state" className="block text-sm font-semibold text-secondary mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
                    errors.stateName && touched.stateName
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                  }`}>
                    <input
                      id="society-state"
                      type="text"
                      value={stateName}
                      onChange={(e) => {
                        setStateName(e.target.value);
                        if (touched.stateName) setErrors((prev) => ({ ...prev, stateName: validateField('stateName', e.target.value) || '' }));
                      }}
                      onBlur={() => handleBlur('stateName', stateName)}
                      placeholder="e.g. Maharashtra"
                      className="flex-1 w-full px-3 py-2.5 text-sm sm:text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isCreating}
                    />
                  </div>
                  {errors.stateName && touched.stateName && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.stateName}
                    </p>
                  )}
                </div>

                {/* PIN Code */}
                <div>
                  <label htmlFor="society-pincode" className="block text-sm font-semibold text-secondary mb-1.5">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
                    errors.pincode && touched.pincode
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                  }`}>
                    <input
                      id="society-pincode"
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPincode(raw);
                        if (touched.pincode) setErrors((prev) => ({ ...prev, pincode: validateField('pincode', raw) || '' }));
                      }}
                      onBlur={() => handleBlur('pincode', pincode)}
                      placeholder="411045"
                      className="flex-1 w-full px-3 py-2.5 text-sm sm:text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isCreating}
                    />
                  </div>
                  {errors.pincode && touched.pincode && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.pincode}
                    </p>
                  )}
                </div>
              </div>

              {/* 4. Society Official Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Official Phone */}
                <div>
                  <label htmlFor="society-phone" className="block text-sm font-semibold text-secondary mb-1.5">
                    Official Society Phone <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
                    errors.societyPhone && touched.societyPhone
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                  }`}>
                    <div className="px-3 py-2.5 bg-slate-50 border-r border-surface-border text-secondary font-medium text-sm flex items-center gap-1 select-none">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      id="society-phone"
                      type="tel"
                      inputMode="numeric"
                      value={societyPhone}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setSocietyPhone(raw);
                        if (touched.societyPhone) setErrors((prev) => ({ ...prev, societyPhone: validateField('societyPhone', raw) || '' }));
                      }}
                      onBlur={() => handleBlur('societyPhone', societyPhone)}
                      placeholder="98765 43210"
                      className="flex-1 w-full px-3 py-2.5 text-sm sm:text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isCreating}
                    />
                  </div>
                  {errors.societyPhone && touched.societyPhone && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.societyPhone}
                    </p>
                  )}
                </div>

                {/* Official Email */}
                <div>
                  <label htmlFor="society-email" className="block text-sm font-semibold text-secondary mb-1.5">
                    Official Society Email <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
                    errors.societyEmail && touched.societyEmail
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                  }`}>
                    <div className="pl-3.5 pr-2 text-slate-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id="society-email"
                      type="email"
                      value={societyEmail}
                      onChange={(e) => {
                        setSocietyEmail(e.target.value);
                        if (touched.societyEmail) setErrors((prev) => ({ ...prev, societyEmail: validateField('societyEmail', e.target.value) || '' }));
                      }}
                      onBlur={() => handleBlur('societyEmail', societyEmail)}
                      placeholder="admin@societyname.com"
                      className="flex-1 w-full px-2 py-2.5 text-sm sm:text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isCreating}
                    />
                  </div>
                  {errors.societyEmail && touched.societyEmail && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.societyEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-6 border-t border-surface-border mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/onboarding/residency-choice')}
                  className="w-full sm:w-auto px-6 h-12 rounded-xl border border-surface-border hover:bg-slate-50 text-secondary font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  disabled={isCreating}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full sm:w-auto px-8 h-12 bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-semibold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-card hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      <span>Creating residency...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Residency</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-3xl mx-auto pt-6 text-center text-xs text-secondary-muted border-t border-surface-border">
        <p>© {new Date().getFullYear()} HomeSync Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default CreateResidencyPage;
