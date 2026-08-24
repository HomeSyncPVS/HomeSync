import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Receipt, 
  Headphones, 
  ShieldCheck 
} from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { parseJwt, getRoleRedirectRoute } from '../utils/rbac';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { saveAuthSession } = useAuth();

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation States
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [touchedIdentifier, setTouchedIdentifier] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  // Async States
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);

  // Social Auth Loading States
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  // Validation Helpers
  const validateIdentifier = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) {
      return 'Email or phone number is required';
    }
    // Check if user is typing phone or email
    const isPhoneLike = /^[0-9+\s()-]+$/.test(trimmed);
    if (isPhoneLike) {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length < 10) {
        return 'Please enter a valid 10-digit mobile number';
      }
      if (digits.length > 13) {
        return 'Phone number cannot exceed 13 digits';
      }
    } else if (trimmed.includes('@')) {
      // Basic email regex
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(trimmed)) {
        return 'Please enter a valid email address';
      }
    }
    return null;
  };

  const validatePassword = (val: string): string | null => {
    if (!val) {
      return 'Password is required';
    }
    if (val.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIdentifier(val);
    setApiError(null);
    setApiSuccess(null);
    if (touchedIdentifier) {
      setIdentifierError(validateIdentifier(val));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setApiError(null);
    setApiSuccess(null);
    if (touchedPassword) {
      setPasswordError(validatePassword(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedIdentifier(true);
    setTouchedPassword(true);
    setApiError(null);
    setApiSuccess(null);

    const idErr = validateIdentifier(identifier);
    const passErr = validatePassword(password);

    if (idErr || passErr) {
      setIdentifierError(idErr);
      setPasswordError(passErr);
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.login({
        email: identifier.trim(),
        password: password,
      });

      saveAuthSession(result);
      
      // If user has NO society association, automatically route to onboarding profile setup (Page B01)
      if (!result.user.society_id) {
        navigate('/onboarding/setup');
      } else {
        const payload = parseJwt(result.access_token);
        const userRole = payload?.role || 'Resident';
        const targetRoute = getRoleRedirectRoute(userRole);
        navigate(targetRoute);
      }
    } catch (err: any) {
      setApiError(err.message || 'Invalid credentials or account error. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Handler
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setApiError(null);
    try {
      const url = await authService.getGoogleOAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setApiError(err.message || 'Unable to initiate Google Sign-in.');
      setIsGoogleLoading(false);
    }
  };

  // Apple OAuth Handler
  const handleAppleLogin = async () => {
    setIsAppleLoading(true);
    setApiError(null);
    try {
      const url = await authService.getAppleOAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setApiError(err.message || 'Unable to initiate Apple Sign-in.');
      setIsAppleLoading(false);
    }
  };

  // Determine which icon to display based on user input
  const isInputEmail = identifier.includes('@');

  return (
    <div className="flex w-full min-h-screen bg-surface-background text-secondary">
      {/* ============================================================ */}
      {/* LEFT COLUMN: AUTHENTICATION FORM (DESKTOP & RESPONSIVE) */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 bg-surface min-h-screen overflow-y-auto">
        {/* Top Header / Brand Logo */}
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-glow">
            <Building2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <span className="font-headline font-bold text-2xl text-secondary tracking-tight">HomeSync</span>
            <span className="block text-xs font-medium text-secondary-muted">Smart Society Management</span>
          </div>
        </header>

        {/* Main Content Card Container */}
        <main className="w-full max-w-md mx-auto my-auto py-8">
          {/* Welcome Heading */}
          <div className="mb-8">
            <h1 className="font-headline text-3xl sm:text-4xl font-bold text-secondary mb-2 tracking-tight">
              Sign in to HomeSync
            </h1>
            <p className="text-secondary-muted text-base">
              Enter your registered phone number or email address and password.
            </p>
          </div>

          {/* Feedback Alerts */}
          {apiError && (
            <div 
              role="alert" 
              className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-fadeIn"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 font-medium">{apiError}</div>
            </div>
          )}

          {apiSuccess && (
            <div 
              role="status" 
              className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 text-sm animate-fadeIn"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 font-medium">{apiSuccess}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Phone or Email Identifier */}
            <div>
              <label 
                htmlFor="identifier-input" 
                className="block text-sm font-semibold text-secondary mb-1.5"
              >
                Phone Number or Email Address
              </label>

              <div 
                className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all duration-200 shadow-sm ${
                  identifierError && touchedIdentifier
                    ? 'border-red-400 ring-2 ring-red-100' 
                    : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                }`}
              >
                <div className="pl-3.5 pr-2 text-slate-400">
                  {isInputEmail ? (
                    <Mail className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Phone className="w-5 h-5" aria-hidden="true" />
                  )}
                </div>

                <input
                  id="identifier-input"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  onBlur={() => {
                    setTouchedIdentifier(true);
                    setIdentifierError(validateIdentifier(identifier));
                  }}
                  placeholder="name@example.com or 9876543210"
                  aria-invalid={!!identifierError && touchedIdentifier}
                  aria-describedby={identifierError && touchedIdentifier ? 'identifier-error' : undefined}
                  className="flex-1 w-full px-2 py-3 text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                  disabled={isLoading}
                />
              </div>

              {identifierError && touchedIdentifier && (
                <p id="identifier-error" className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  {identifierError}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="password-input" 
                  className="block text-sm font-semibold text-secondary"
                >
                  Password
                </label>
                <a 
                  href="#forgot-password" 
                  className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              <div 
                className={`flex items-center rounded-xl border bg-white overflow-hidden transition-all duration-200 shadow-sm ${
                  passwordError && touchedPassword
                    ? 'border-red-400 ring-2 ring-red-100' 
                    : 'border-surface-border hover:border-slate-400 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
                }`}
              >
                <div className="pl-3.5 pr-2 text-slate-400">
                  <Lock className="w-5 h-5" aria-hidden="true" />
                </div>

                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => {
                    setTouchedPassword(true);
                    setPasswordError(validatePassword(password));
                  }}
                  placeholder="Enter your password"
                  aria-invalid={!!passwordError && touchedPassword}
                  aria-describedby={passwordError && touchedPassword ? 'password-error' : undefined}
                  className="flex-1 w-full px-2 py-3 text-base text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0 font-medium"
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-3 text-slate-400 hover:text-secondary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {passwordError && touchedPassword && (
                <p id="password-error" className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  {passwordError}
                </p>
              )}
            </div>

            {/* Primary Action Button: Sign In */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-semibold text-base rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-card hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center">
            <div className="flex-grow border-t border-surface-border"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-medium uppercase tracking-wider text-secondary-muted bg-surface px-2">
              Or continue with
            </span>
            <div className="flex-grow border-t border-surface-border"></div>
          </div>

          {/* Social OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="h-11 bg-white hover:bg-slate-50 text-secondary border border-surface-border hover:border-slate-300 font-medium text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 shadow-subtle disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden="true" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>Google</span>
            </button>

            {/* Apple OAuth Button */}
            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={isAppleLoading}
              className="h-11 bg-white hover:bg-slate-50 text-secondary border border-surface-border hover:border-slate-300 font-medium text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 shadow-subtle disabled:opacity-60"
            >
              {isAppleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-secondary" aria-hidden="true" />
              ) : (
                <svg className="w-4 h-4 fill-current text-secondary" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.65-.79 1.1-1.89.98-3-.95.04-2.1 1.01-2.78 1.8-.59.68-1.12 1.8-1.01 2.89 1.07.08 2.16-.9 2.81-1.69z" />
                </svg>
              )}
              <span>Apple</span>
            </button>
          </div>

          {/* Registration Prompt */}
          <div className="mt-6 text-center text-sm text-secondary-muted">
            <span>Don't have an account? </span>
            <Link
              to="/register"
              className="font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md px-1 py-0.5"
            >
              Create an account
            </Link>
          </div>

          {/* Supported Roles Badge */}
          <div className="mt-8 pt-6 border-t border-surface-border text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-secondary-muted text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-secondary-muted" aria-hidden="true" />
              <span>Unified Portal: Admins, Committee, Residents & Vendors</span>
            </div>
          </div>
        </main>

        {/* Footer Legal & Security */}
        <footer className="pt-6 text-center text-xs text-secondary-muted">
          <div className="flex justify-center items-center gap-4 mb-2 font-medium">
            <a href="#terms" className="hover:text-primary transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="#privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#help" className="hover:text-primary transition-colors">Support</a>
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
          {/* Main Visual Headline */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-6 border border-white/15 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>Commercial-Grade Society SaaS</span>
          </div>

          <h2 className="font-display text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            All-in-one Smart Living & Society Administration
          </h2>

          <p className="text-slate-300 text-base xl:text-lg mb-10 leading-relaxed font-normal">
            Experience modern community management with automated billing, instant complaint tracking, and enterprise-grade security.
          </p>

          {/* Showcase Feature Cards */}
          <div className="space-y-4">
            {/* Feature 1: Maintenance */}
            <div className="glass-panel rounded-2xl p-4 xl:p-5 flex items-center gap-4 transition-all duration-300 hover:translate-x-1.5 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0 shadow-md">
                <Receipt className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-headline font-semibold text-white text-base">Instant Maintenance Bills & UPI</h3>
                <p className="text-indigo-200/80 text-xs xl:text-sm mt-0.5">Automated invoicing, email alerts, and one-click reconciliation.</p>
              </div>
            </div>

            {/* Feature 2: Complaints */}
            <div className="glass-panel rounded-2xl p-4 xl:p-5 flex items-center gap-4 transition-all duration-300 hover:translate-x-1.5 shadow-lg ml-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shrink-0 shadow-md">
                <Headphones className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-headline font-semibold text-white text-base">Complaint Resolution Hub</h3>
                <p className="text-indigo-200/80 text-xs xl:text-sm mt-0.5">SLA tracking, technician assignment, and real-time status updates.</p>
              </div>
            </div>

            {/* Feature 3: Security & Community */}
            <div className="glass-panel rounded-2xl p-4 xl:p-5 flex items-center gap-4 transition-all duration-300 hover:translate-x-1.5 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                <ShieldCheck className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-headline font-semibold text-white text-base">Verified Resident Directory</h3>
                <p className="text-indigo-200/80 text-xs xl:text-sm mt-0.5">Multi-tenant isolation, role-based access, and audited operations.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
