import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  KeyRound, 
  Lock, 
  Users, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveAuthSession, pendingRegistrationTarget } = useAuth();

  // Retrieve contact target (email or phone) from navigation state, AuthContext, or sessionStorage
  const locationState = location.state as { email?: string; phone?: string; target?: string } | null;
  const targetEmail = locationState?.email || pendingRegistrationTarget || sessionStorage.getItem('homesync_pending_registration_target') || '';
  const targetPhone = locationState?.phone || '';
  const target = targetEmail || targetPhone;

  // 6-digit OTP input boxes state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 5-minute countdown timer (300 seconds)
  const OTP_EXPIRY_SECONDS = 300;
  const [timeLeft, setTimeLeft] = useState<number>(OTP_EXPIRY_SECONDS);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(true);

  // Async States
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);

  // Focus the first empty input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer countdown interval
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  // Format seconds into MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mask sensitive contact information (Phone or Email)
  const getMaskedTarget = (val: string): string => {
    if (!val) return 'your registered contact';
    if (val.includes('@')) {
      const [user, domain] = val.split('@');
      if (user.length <= 2) return `${user.charAt(0)}*@${domain}`;
      return `${user.slice(0, 2)}${'*'.repeat(Math.max(user.length - 3, 3))}${user.slice(-1)}@${domain}`;
    }
    // Mask Indian phone +91 9876543210 -> +91 ******3210
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      const last4 = cleaned.slice(-4);
      return `+91 ******${last4}`;
    }
    return val;
  };

  // Handle individual OTP input changes
  const handleChange = (index: number, value: string) => {
    // Only accept numeric digits
    const sanitized = value.replace(/\D/g, '');

    if (!sanitized) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    // Handle single character
    const char = sanitized.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);
    setErrorMessage(null);

    // Auto-advance to next input
    if (index < 5 && char) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle pasting full 6-digit OTP
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    setOtp(newOtp);
    setErrorMessage(null);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // Resend OTP Code Handler
  const handleResendOtp = async () => {
    if (!target) {
      setErrorMessage('No registered contact found. Please sign up or log in again.');
      return;
    }
    if (isResending || timeLeft > 240) return; // Prevent spamming within first 60s

    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await authService.resendOtp(target, 'register');
      setSuccessMessage(response.message || 'A new 6-digit verification code has been sent.');
      setTimeLeft(OTP_EXPIRY_SECONDS);
      setIsTimerActive(true);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification code. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  // Verify OTP Form Submission
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullCode = otp.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!target) {
      setErrorMessage('Verification target is missing. Please restart registration.');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await authService.verifyOtp({
        target: target,
        code: fullCode,
        purpose: 'register',
      });

      setIsVerifiedSuccess(true);

      // If backend returned authenticated credentials, save the session
      if (response.access_token && response.user && response.refresh_token && response.session_id) {
        saveAuthSession({
          access_token: response.access_token,
          refresh_token: response.refresh_token,
          session_id: response.session_id,
          token_type: 'bearer',
          user: response.user,
        });
      }

      setSuccessMessage('Account verified successfully! You can now proceed.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-surface-background text-secondary">
      {/* ============================================================ */}
      {/* LEFT COLUMN: OTP VERIFICATION FORM */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 bg-surface min-h-screen overflow-y-auto">
        {/* Top Header / Branding */}
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
            to="/register"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-secondary-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Registration</span>
          </Link>
        </header>

        {/* Main Card Container */}
        <main className="w-full max-w-md mx-auto my-auto py-8">
          {/* Header & Masked Phone / Email Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4 shadow-sm">
              <KeyRound className="w-7 h-7" aria-hidden="true" />
            </div>

            <h1 className="font-headline text-3xl sm:text-4xl font-bold text-secondary mb-2.5 tracking-tight">
              Verify your account
            </h1>

            <p className="text-secondary-muted text-sm sm:text-base leading-relaxed">
              Enter the 6-digit verification code sent to
            </p>

            {/* Masked Contact Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-lg bg-slate-100 border border-surface-border text-secondary font-mono text-sm font-semibold">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>{getMaskedTarget(targetPhone || targetEmail)}</span>
            </div>
          </div>

          {/* Success State Screen */}
          {isVerifiedSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 animate-fadeIn space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl text-emerald-900">Account Verified!</h3>
                <p className="text-sm text-emerald-800 mt-1">
                  Your HomeSync account has been verified successfully.
                </p>
              </div>

              <div className="p-4 bg-white/80 rounded-xl border border-emerald-100 text-xs text-emerald-700 text-left space-y-1">
                <p className="font-semibold text-emerald-900">Next Step: Resident Onboarding</p>
                <p>You can now sign in to your account and set up or join your society residency.</p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/onboarding/setup')}
                className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-card"
              >
                <span>Continue to Profile Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Alert Banners */}
              {errorMessage && (
                <div 
                  role="alert" 
                  className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-fadeIn"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
              )}

              {successMessage && (
                <div 
                  role="status" 
                  className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 text-sm animate-fadeIn"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 font-medium">{successMessage}</div>
                </div>
              )}

              {/* 6-Digit OTP Inputs Form */}
              <form onSubmit={handleVerify} noValidate className="space-y-6">
                <div>
                  <label className="block text-center text-xs font-semibold uppercase tracking-wider text-secondary-muted mb-4">
                    6-Digit Security Code
                  </label>

                  {/* Input Boxes Grid */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        disabled={isVerifying}
                        aria-label={`Digit ${index + 1} of 6`}
                        className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-mono font-bold rounded-xl border bg-white text-secondary transition-all shadow-sm ${
                          digit 
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                            : 'border-surface-border hover:border-slate-400'
                        } focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-50`}
                      />
                    ))}
                  </div>
                </div>

                {/* Live Countdown Timer & Resend Option */}
                <div className="flex flex-col items-center justify-center gap-2 text-center text-sm">
                  {isTimerActive && timeLeft > 0 ? (
                    <div className="flex items-center gap-1.5 text-secondary-muted font-medium">
                      <span>Code expires in</span>
                      <span className="font-mono font-bold text-primary">{formatTime(timeLeft)}</span>
                    </div>
                  ) : (
                    <div className="text-red-600 font-semibold text-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Code expired</span>
                    </div>
                  )}

                  <div className="text-xs text-secondary-muted pt-1">
                    <span>Didn't receive the code? </span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isResending || (isTimerActive && timeLeft > 240)}
                      className="font-semibold text-primary hover:text-primary-hover hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Resending...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          <span>Resend OTP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary CTA: Verify & Continue */}
                <button
                  type="submit"
                  disabled={isVerifying || otp.join('').length !== 6}
                  className="w-full h-12 bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-semibold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-card hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify &amp; Continue</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>

                {/* Back to sign in / change contact prompt */}
                <div className="pt-4 text-center text-sm text-secondary-muted border-t border-surface-border">
                  <span>Entered incorrect information? </span>
                  <Link
                    to="/register"
                    className="font-semibold text-primary hover:text-primary-hover hover:underline transition-colors"
                  >
                    Change details
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
      {/* RIGHT COLUMN: SAAS DESKTOP VISUAL SHOWCASE */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-1/2 bg-mesh-gradient relative overflow-hidden flex-col justify-center items-center p-12 xl:p-16 select-none">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary rounded-full mix-blend-screen filter blur-[90px] opacity-30 animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-[110px] opacity-20"></div>

        <div className="relative z-10 w-full max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-6 border border-white/15 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>Account Security</span>
          </div>

          <h2 className="font-display text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            Protecting Your Society Data with Zero-Trust Security
          </h2>

          <p className="text-slate-300 text-base xl:text-lg mb-10 leading-relaxed font-normal">
            Your verification ensures safe, authenticated access for all residents, committee members, and community staff.
          </p>

          {/* Showcase Feature Cards */}
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-4 xl:p-5 flex items-center gap-4 transition-all duration-300 hover:translate-x-1.5 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0 shadow-md">
                <Lock className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-headline font-semibold text-white text-base">Enterprise-Grade Protection</h3>
                <p className="text-indigo-200/80 text-xs xl:text-sm mt-0.5">Argon2 cryptographic hashing and secure 2FA session tokens.</p>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 xl:p-5 flex items-center gap-4 transition-all duration-300 hover:translate-x-1.5 shadow-lg ml-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shrink-0 shadow-md">
                <Users className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-headline font-semibold text-white text-base">Verified Resident Directory</h3>
                <p className="text-indigo-200/80 text-xs xl:text-sm mt-0.5">Prevent unauthorized entry and protect neighbor privacy.</p>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 xl:p-5 flex items-center gap-4 transition-all duration-300 hover:translate-x-1.5 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-headline font-semibold text-white text-base">Instant Onboarding Gate</h3>
                <p className="text-indigo-200/80 text-xs xl:text-sm mt-0.5">Seamlessly create or join your society after initial verification.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
