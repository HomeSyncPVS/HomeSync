import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ArrowRight, 
  ArrowLeft, 
  PlusCircle, 
  Users, 
  CheckCircle2, 
  Lock, 
  ShieldCheck,
  Check
} from 'lucide-react';

export const ResidencyChoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedChoice, setSelectedChoice] = useState<'create' | 'join' | null>('create');

  const handleContinue = () => {
    if (selectedChoice === 'create') {
      navigate('/onboarding/create-residency');
    } else if (selectedChoice === 'join') {
      navigate('/onboarding/join-residency');
    }
  };

  return (
    <div className="min-h-screen bg-surface-background flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans text-secondary">
      {/* Top Header / Stepper Navbar */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-glow">
            <Building2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <span className="font-headline font-bold text-2xl text-secondary tracking-tight">HomeSync</span>
            <span className="block text-xs font-medium text-secondary-muted">Resident Onboarding</span>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-xs uppercase tracking-wider">
            Step 2 of 2
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl mx-auto my-6 sm:my-8 bg-surface rounded-3xl border border-surface-border shadow-card p-6 sm:p-10 lg:p-12">
        {/* Header Titles */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Residency Setup</span>
          </div>
          <h1 className="font-headline text-3xl sm:text-4xl font-bold text-secondary mb-3 tracking-tight">
            Set up your residency
          </h1>
          <p className="text-secondary-muted text-sm sm:text-base leading-relaxed">
            Choose how you want to get started with HomeSync.
          </p>
        </div>

        {/* Two Selectable Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* OPTION 1: CREATE A RESIDENCY */}
          <div
            onClick={() => setSelectedChoice('create')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedChoice('create');
              }
            }}
            tabIndex={0}
            role="radio"
            aria-checked={selectedChoice === 'create'}
            className={`relative rounded-3xl p-6 sm:p-8 border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between text-left focus:outline-none ${
              selectedChoice === 'create'
                ? 'border-primary bg-primary/[0.03] ring-4 ring-primary/15 shadow-md'
                : 'border-surface-border bg-white hover:border-slate-400 hover:shadow-sm'
            }`}
          >
            {/* Top Indicator */}
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md">
                <PlusCircle className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                selectedChoice === 'create'
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-300 bg-white'
              }`}>
                {selectedChoice === 'create' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2 mb-6">
              <h2 className="font-headline text-xl font-bold text-secondary">
                Create a Residency
              </h2>
              <p className="text-sm font-medium text-slate-700 leading-relaxed">
                Set up your society/residency on HomeSync and manage it digitally.
              </p>
              <p className="text-xs text-secondary-muted leading-normal">
                For societies that are not yet set up on HomeSync.
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-2 pt-4 border-t border-slate-100 text-xs text-secondary-muted font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Register new society structure &amp; wings</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Generate resident invite codes</span>
              </div>
            </div>
          </div>

          {/* OPTION 2: JOIN EXISTING RESIDENCY */}
          <div
            onClick={() => setSelectedChoice('join')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedChoice('join');
              }
            }}
            tabIndex={0}
            role="radio"
            aria-checked={selectedChoice === 'join'}
            className={`relative rounded-3xl p-6 sm:p-8 border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between text-left focus:outline-none ${
              selectedChoice === 'join'
                ? 'border-primary bg-primary/[0.03] ring-4 ring-primary/15 shadow-md'
                : 'border-surface-border bg-white hover:border-slate-400 hover:shadow-sm'
            }`}
          >
            {/* Top Indicator */}
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
                <Users className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                selectedChoice === 'join'
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-300 bg-white'
              }`}>
                {selectedChoice === 'join' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2 mb-6">
              <h2 className="font-headline text-xl font-bold text-secondary">
                Join an Existing Residency
              </h2>
              <p className="text-sm font-medium text-slate-700 leading-relaxed">
                Find your society and request access to your residency.
              </p>
              <p className="text-xs text-secondary-muted leading-normal">
                If your society is already using HomeSync.
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-2 pt-4 border-t border-slate-100 text-xs text-secondary-muted font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Search by name or enter society join code</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Select your wing, floor, and flat unit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Locked Features Information Notice */}
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 flex items-center gap-3 text-xs leading-relaxed mb-8">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold">Society Features Locked: </span>
            <span>
              Maintenance billing, complaints, gate passes, notices, and directory will unlock once your residency connection is complete.
            </span>
          </div>
        </div>

        {/* Bottom Actions: Back to B01 & Continue */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-6 border-t border-surface-border">
          <button
            type="button"
            onClick={() => navigate('/onboarding/setup')}
            className="w-full sm:w-auto px-6 h-12 rounded-xl border border-surface-border hover:bg-slate-50 text-secondary font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Profile Setup</span>
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedChoice}
            className="w-full sm:w-auto px-8 h-12 bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-semibold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-card hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto pt-6 text-center text-xs text-secondary-muted border-t border-surface-border">
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

export default ResidencyChoicePage;
