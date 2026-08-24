import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Clock,
  Home,
  Check
} from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import type { SocietyJoinVerifyResponse } from '../types/auth';

export const JoinResidencyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  // Search / Code state
  const [joinCode, setJoinCode] = useState('');
  const [verifiedSociety, setVerifiedSociety] = useState<SocietyJoinVerifyResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Unit selection state
  const [selectedWingId, setSelectedWingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [residentType, setResidentType] = useState<'Owner' | 'Tenant'>('Owner');

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Derived hierarchy selections
  const currentWing = verifiedSociety?.wings.find((w) => w.id === selectedWingId);
  const currentFloor = currentWing?.floors.find((f) => f.id === selectedFloorId);
  const currentFlat = currentFloor?.flats.find((fl) => fl.id === selectedFlatId);

  // Verify society join code
  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!joinCode.trim()) {
      setVerifyError('Please enter a society join code or search identifier.');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    setSubmitError(null);

    try {
      const result = await authService.verifySocietyJoinCode(joinCode.trim());
      setVerifiedSociety(result);
      // Reset unit selectors
      setSelectedWingId('');
      setSelectedFloorId('');
      setSelectedFlatId('');
    } catch (err: any) {
      setVerifyError(err.message || 'Society not found. Please verify the join code and try again.');
      setVerifiedSociety(null);
    } finally {
      setIsVerifying(false);
    }
  };

  // Submit join request
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!verifiedSociety) {
      setSubmitError('Please verify your society first.');
      return;
    }

    if (!selectedFlatId) {
      setSubmitError('Please select your wing, floor, and flat unit.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.joinSociety({
        join_code: joinCode.trim(),
        flat_id: selectedFlatId,
      });

      // Update local session
      if (user) {
        updateUser({
          ...user,
          society_id: verifiedSociety.id,
          flat_id: selectedFlatId,
          approval_status: 'PENDING',
        });
      }

      setIsSubmittedSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit join request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-background flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans text-secondary">
      {/* Top Navbar */}
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
        {isSubmittedSuccess ? (
          /* ==================================================== */
          /* SUCCESS STATE: JOIN REQUEST SUBMITTED (PENDING) */
          /* ==================================================== */
          <div className="text-center space-y-6 animate-fadeIn py-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-9 h-9" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold text-xs uppercase tracking-wider mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Admin Approval</span>
              </div>
              <h1 className="font-headline text-3xl font-bold text-secondary">
                Join Request Submitted
              </h1>
              <p className="text-secondary-muted text-sm mt-1 max-w-md mx-auto leading-relaxed">
                Your request to join <strong className="text-secondary">{verifiedSociety?.name}</strong> has been sent to the society administrator for review.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-surface-border max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-secondary-muted font-medium">Society</span>
                <span className="font-bold text-secondary">{verifiedSociety?.name}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-secondary-muted font-medium">Unit / Flat</span>
                <span className="font-bold text-secondary">
                  {currentFlat ? `${currentFlat.flat_number} (${currentFlat.flat_type})` : 'Assigned Unit'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-muted font-medium">Declared Residency</span>
                <span className="font-bold text-primary">{residentType}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 text-amber-900 text-xs text-left space-y-1 max-w-md mx-auto">
              <p className="font-bold text-amber-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Society Features Locked
              </p>
              <p>
                Maintenance billing, complaints, gate passes, and notices will automatically unlock as soon as your society administrator approves your flat membership.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full max-w-md mx-auto h-12 bg-primary hover:bg-primary-hover text-white font-semibold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-card"
            >
              <span>Back to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ==================================================== */
          /* FORM STATE: FIND SOCIETY & SELECT FLAT */
          /* ==================================================== */
          <>
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
                <Home className="w-3.5 h-3.5" />
                <span>Join Residency</span>
              </div>
              <h1 className="font-headline text-2xl sm:text-3xl font-bold text-secondary mb-2 tracking-tight">
                Join an existing residency
              </h1>
              <p className="text-secondary-muted text-sm sm:text-base leading-relaxed">
                Find your society on HomeSync and request access to your residency.
              </p>
            </div>

            {/* Error alerts */}
            {verifyError && (
              <div 
                role="alert" 
                className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-fadeIn"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{verifyError}</div>
              </div>
            )}

            {submitError && (
              <div 
                role="alert" 
                className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-fadeIn"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{submitError}</div>
              </div>
            )}

            <div className="space-y-6">
              {/* 1. Enter Society Join Code */}
              <div>
                <label htmlFor="join-code" className="block text-sm font-semibold text-secondary mb-1.5">
                  Society Join Code <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center rounded-xl border border-surface-border bg-white overflow-hidden focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 shadow-sm">
                    <div className="pl-3.5 pr-2 text-slate-400">
                      <Search className="w-5 h-5" />
                    </div>
                    <input
                      id="join-code"
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Enter 8-character Society Code (e.g. HS849201)"
                      className="flex-1 w-full px-2 py-2.5 text-sm sm:text-base font-mono uppercase tracking-wider text-secondary placeholder-slate-400 bg-transparent border-0 focus:ring-0"
                      disabled={isVerifying || isSubmitting}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={isVerifying || !joinCode.trim()}
                    className="px-6 h-12 bg-secondary hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify Code</span>
                    )}
                  </button>
                </div>
                <p className="text-xs text-secondary-muted mt-1.5">
                  Ask your society admin or committee for the society's unique 8-character join code.
                </p>
              </div>

              {/* 2. Verified Society Info Card */}
              {verifiedSociety && (
                <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-headline font-bold text-base text-emerald-950 flex items-center gap-1.5">
                          {verifiedSociety.name}
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        </h2>
                        <p className="text-xs text-emerald-800 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                          {[verifiedSociety.address, verifiedSociety.region, verifiedSociety.city, verifiedSociety.state].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px] uppercase tracking-wider">
                      Verified
                    </span>
                  </div>

                  {/* 3. Unit / Flat Cascaded Selection */}
                  <div className="pt-3 border-t border-emerald-200/80 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-950 mb-2">
                        Select Your Flat / Unit <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Wing */}
                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-900 mb-1">Wing</label>
                          <select
                            value={selectedWingId}
                            onChange={(e) => {
                              setSelectedWingId(e.target.value);
                              setSelectedFloorId('');
                              setSelectedFlatId('');
                            }}
                            className="w-full p-2 text-xs sm:text-sm rounded-xl border border-emerald-300 bg-white text-secondary font-medium focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Select Wing</option>
                            {verifiedSociety.wings.map((w) => (
                              <option key={w.id} value={w.id}>
                                Wing {w.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Floor */}
                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-900 mb-1">Floor</label>
                          <select
                            value={selectedFloorId}
                            disabled={!selectedWingId}
                            onChange={(e) => {
                              setSelectedFloorId(e.target.value);
                              setSelectedFlatId('');
                            }}
                            className="w-full p-2 text-xs sm:text-sm rounded-xl border border-emerald-300 bg-white text-secondary font-medium disabled:opacity-50 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Select Floor</option>
                            {currentWing?.floors.map((fl) => (
                              <option key={fl.id} value={fl.id}>
                                Floor {fl.floor_number}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Flat */}
                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-900 mb-1">Flat / Unit</label>
                          <select
                            value={selectedFlatId}
                            disabled={!selectedFloorId}
                            onChange={(e) => setSelectedFlatId(e.target.value)}
                            className="w-full p-2 text-xs sm:text-sm rounded-xl border border-emerald-300 bg-white text-secondary font-medium disabled:opacity-50 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Select Flat</option>
                            {currentFloor?.flats.map((fl) => (
                              <option key={fl.id} value={fl.id}>
                                {fl.flat_number} ({fl.flat_type})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 4. Resident Type Selector (Owner vs. Tenant) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-950 mb-2">
                        Residency Type <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-white ${
                          residentType === 'Owner' 
                            ? 'border-emerald-600 ring-2 ring-emerald-500/20' 
                            : 'border-emerald-200 hover:bg-emerald-50/50'
                        }`}>
                          <input
                            type="radio"
                            name="resident-type-join"
                            checked={residentType === 'Owner'}
                            onChange={() => setResidentType('Owner')}
                            className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <div>
                            <span className="block font-semibold text-xs sm:text-sm text-secondary">Owner</span>
                            <span className="block text-[11px] text-secondary-muted">Property owner / Landlord</span>
                          </div>
                        </label>

                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-white ${
                          residentType === 'Tenant' 
                            ? 'border-emerald-600 ring-2 ring-emerald-500/20' 
                            : 'border-emerald-200 hover:bg-emerald-50/50'
                        }`}>
                          <input
                            type="radio"
                            name="resident-type-join"
                            checked={residentType === 'Tenant'}
                            onChange={() => setResidentType('Tenant')}
                            className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <div>
                            <span className="block font-semibold text-xs sm:text-sm text-secondary">Tenant</span>
                            <span className="block text-[11px] text-secondary-muted">Renting the property</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Information Notice */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-surface-border text-xs text-secondary-muted space-y-1">
                <div className="font-semibold text-secondary flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>How Joining Works:</span>
                </div>
                <p>1. Enter and verify your society's join code.</p>
                <p>2. Choose your wing, floor, and flat unit number.</p>
                <p>3. Submit your request for administrator approval.</p>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-6 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => navigate('/onboarding/residency-choice')}
                  className="w-full sm:w-auto px-6 h-12 rounded-xl border border-surface-border hover:bg-slate-50 text-secondary font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleJoinSubmit}
                  disabled={isSubmitting || !verifiedSociety || !selectedFlatId}
                  className="w-full sm:w-auto px-8 h-12 bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-semibold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-card hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      <span>Submitting request...</span>
                    </>
                  ) : (
                    <>
                      <span>Request to Join</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
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

export default JoinResidencyPage;
