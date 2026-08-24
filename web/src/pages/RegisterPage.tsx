import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Receipt, 
  Headphones,
  Home
} from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setPendingRegistrationTarget } = useAuth();

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Async States
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);

  // Validation Logic
  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'fullName':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Full name must be at least 2 characters';
        return null;
      case 'phone':
        if (!value.trim()) return 'Mobile number is required';
        const cleanedPhone = value.replace(/\D/g, '');
        if (cleanedPhone.length !== 10) return 'Please enter a valid 10-digit mobile number';
        if (!/^[6-9]/.test(cleanedPhone)) return 'Mobile number must start with 6, 7, 8, or 9';
        return null;
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return 'Please enter a valid email address';
        }
        return null;
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters long';
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/\d/.test(value)) return 'Password must contain at least one digit';
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Password must contain at least one special character';
        return null;
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== password) return 'Passwords do not match';
        return null;
      case 'terms':
        if (!value) return 'You must agree to the Terms and Privacy Policy';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    // Touch all fields
    const allTouched = {
      fullName: true,
      phone: true,
      email: true,
      password: true,
      confirmPassword: true,
      terms: true,
    };
    setTouched(allTouched);

    const newErrors: Record<string, string> = {
      fullName: validateField('fullName', fullName) || '',
      phone: validateField('phone', phone) || '',
      email: validateField('email', email) || '',
      password: validateField('password', password) || '',
      confirmPassword: validateField('confirmPassword', confirmPassword) || '',
      terms: validateField('terms', agreedToTerms) || '',
    };
    setErrors(newErrors);

    const hasError = Object.values(newErrors).some((err) => !!err);
    if (hasError) {
      return;
    }

    setIsLoading(true);

    const fullPhone = `+91${phone.replace(/\D/g, '')}`;

    try {
      const response = await authService.register({
        email: email.trim(),
        phone: fullPhone,
        password: password,
        full_name: fullName.trim(),
      });

      // Store target for A03 OTP flow
      setPendingRegistrationTarget(email.trim());

      setRegistrationSuccess(
        response.message || 'Account created successfully! An email verification OTP has been sent.'
      );
    } catch (err: any) {
      setApiError(err.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-surface-background text-secondary">
      {/* ============================================================ */}
      {/* LEFT COLUMN: CREATE ACCOUNT FORM (DESKTOP & RESPONSIVE) */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 bg-surface min-h-screen overflow-y-auto">
        {/* Top Header / Brand Logo */}
        <header className="flex items-center justify-between pb-6 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-glow">
              <Building2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <span className="font-headline font-bold text-2xl text-secondary tracking-tight">HomeSync</span>
              <span className="block text-xs font-medium text-secondary-muted">Smart Society Management</span>
            </div>
          </div>

          <Link
            to="/login"
            className="text-xs sm:text-sm font-semibold text-primary hover:text-primary-hover hover:underline transition-colors"
          >
            Sign in instead →
          </Link>
        </header>

        {/* Main Form Container */}
        <main className="w-full max-w-md mx-auto my-auto py-8">
          {/* Welcome Heading */}
          <div className="mb-8">
            <h1 className="font-headline text-3xl sm:text-4xl font-bold text-secondary mb-2 tracking-tight">
              Create your HomeSync account
            </h1>
            <p className="text-secondary-muted text-base">
              Create your account to get started with HomeSync.
            </p>
          </div>

          {/* Success Banner */}
          {registrationSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 animate-fadeIn space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-headline font-bold text-lg text-emerald-900">Account Created Successfully</h3>
                  <p className="text-sm text-emerald-800 mt-1">{registrationSuccess}</p>
                </div>
              </div>

              <div className="p-4 bg-white/80 rounded-xl border border-emerald-100 text-xs text-emerald-700 space-y-1">
                <p className="font-semibold text-emerald-900">Next Step:</p>
                <p>Verify your account with the OTP sent to your registered email address.</p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/verify-otp', { state: { email: email.trim(), phone: `+91${phone.replace(/\D/g, '')}` } })}
                className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-card"
              >
                <span>Verify Account (Enter OTP)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* API Error Alert */}
              {apiError && (
                <div 
                  role="alert" 
                  className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-fadeIn"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 font-medium">{apiError}</div>
                </div>
              )}

              {/* Create Account Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (touched.fullName) setErrors((prev) => ({ ...prev, fullName: validateField('fullName', e.target.value) || '' }));
                      }}
                      onBlur={() => handleBlur('fullName', fullName)}
                      placeholder="e.g. Rahul Sharma"
                      className="flex-1 w-full px-2 py-2.5 text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.fullName && touched.fullName && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* 2. Mobile Number (+91) */}
                <div>
                  <label htmlFor="phone-number" className="block text-sm font-semibold text-secondary mb-1.5">
                    Mobile Number <span className="text-red-500">*</span>
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
                      className="flex-1 w-full px-3 py-2.5 text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.phone && touched.phone && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* 3. Email Address */}
                <div>
                  <label htmlFor="email-address" className="block text-sm font-semibold text-secondary mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
                    errors.email && touched.email
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                  }`}>
                    <div className="pl-3.5 pr-2 text-slate-400">
                      <Mail className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <input
                      id="email-address"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (touched.email) setErrors((prev) => ({ ...prev, email: validateField('email', e.target.value) || '' }));
                      }}
                      onBlur={() => handleBlur('email', email)}
                      placeholder="name@example.com"
                      className="flex-1 w-full px-2 py-2.5 text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && touched.email && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* 4. Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-secondary mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
                    errors.password && touched.password
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                  }`}>
                    <div className="pl-3.5 pr-2 text-slate-400">
                      <Lock className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (touched.password) setErrors((prev) => ({ ...prev, password: validateField('password', e.target.value) || '' }));
                      }}
                      onBlur={() => handleBlur('password', password)}
                      placeholder="Min. 8 characters"
                      className="flex-1 w-full px-2 py-2.5 text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-3 text-slate-400 hover:text-secondary transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && touched.password ? (
                    <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.password}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-secondary-muted">
                      Must contain uppercase, lowercase, digit, and special character.
                    </p>
                  )}
                </div>

                {/* 5. Confirm Password */}
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-semibold text-secondary mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all shadow-sm ${
                    errors.confirmPassword && touched.confirmPassword
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                  }`}>
                    <div className="pl-3.5 pr-2 text-slate-400">
                      <Lock className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (touched.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: validateField('confirmPassword', e.target.value) || '' }));
                      }}
                      onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                      placeholder="Re-enter your password"
                      className="flex-1 w-full px-2 py-2.5 text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="p-3 text-slate-400 hover:text-secondary transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && touched.confirmPassword && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* 6. Terms & Privacy Agreement */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked);
                        if (e.target.checked) {
                          setErrors((prev) => ({ ...prev, terms: '' }));
                        }
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-secondary-muted leading-relaxed">
                      I agree to the <a href="#terms" className="font-semibold text-secondary hover:underline">Terms &amp; Conditions</a> and <a href="#privacy" className="font-semibold text-secondary hover:underline">Privacy Policy</a>.
                    </span>
                  </label>
                  {errors.terms && touched.terms && (
                    <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.terms}
                    </p>
                  )}
                </div>

                {/* 7. Primary CTA: Create Account */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-semibold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-card hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>

                {/* Already have an account prompt */}
                <div className="pt-4 text-center text-sm text-secondary-muted border-t border-surface-border">
                  <span>Already have an account? </span>
                  <Link
                    to="/login"
                    className="font-semibold text-primary hover:text-primary-hover hover:underline transition-colors rounded-md px-1 py-0.5"
                  >
                    Sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="pt-6 text-center text-xs text-secondary-muted border-t border-surface-border mt-auto">
          <div className="flex justify-center items-center gap-4 mb-1.5 font-medium">
            <a href="#terms" className="hover:text-primary transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="#privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#support" className="hover:text-primary transition-colors">Support</a>
          </div>
          <p>© {new Date().getFullYear()} HomeSync Technologies. All rights reserved.</p>
        </footer>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: SAAS DESKTOP VISUAL SHOWCASE (HIDDEN ON MOBILE) */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-1/2 bg-mesh-gradient relative overflow-hidden flex-col justify-center items-center p-12 xl:p-16 select-none">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary rounded-full mix-blend-screen filter blur-[90px] opacity-30 animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-[110px] opacity-20"></div>

        <div className="relative z-10 w-full max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-6 border border-white/15 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>Join HomeSync</span>
          </div>

          <h2 className="font-display text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            All-in-one Smart Living &amp; Society Administration
          </h2>

          <p className="text-slate-300 text-base xl:text-lg mb-10 leading-relaxed font-normal">
            Create your account to get started with seamless community living, instant maintenance payments, and automated service requests.
          </p>

          {/* Showcase Feature Cards */}
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-4 xl:p-5 flex items-center gap-4 transition-all duration-300 hover:translate-x-1.5 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0 shadow-md">
                <Receipt className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-headline font-semibold text-white text-base">Instant Maintenance Bills &amp; UPI</h3>
                <p className="text-indigo-200/80 text-xs xl:text-sm mt-0.5">Automated invoicing, payment reminders, and one-click reconciliation.</p>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 xl:p-5 flex items-center gap-4 transition-all duration-300 hover:translate-x-1.5 shadow-lg ml-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shrink-0 shadow-md">
                <Headphones className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-headline font-semibold text-white text-base">Complaint Resolution Hub</h3>
                <p className="text-indigo-200/80 text-xs xl:text-sm mt-0.5">Track, manage, and resolve facility issues with technician assignment.</p>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 xl:p-5 flex items-center gap-4 transition-all duration-300 hover:translate-x-1.5 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                <Home className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-headline font-semibold text-white text-base">Verified Community Network</h3>
                <p className="text-indigo-200/80 text-xs xl:text-sm mt-0.5">Secure multi-tenant isolation, verified directory, and notices.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
