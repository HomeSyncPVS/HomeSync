import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { ResidentSetupPage } from './pages/ResidentSetupPage';
import { ResidencyChoicePage } from './pages/ResidencyChoicePage';
import { CreateResidencyPage } from './pages/CreateResidencyPage';
import { JoinResidencyPage } from './pages/JoinResidencyPage';
import { ResidencyStructureSetupPage } from './pages/ResidencyStructureSetupPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Page A01: Primary Authentication Entry */}
          <Route path="/login" element={<LoginPage />} />

          {/* Page A02: Create Account / General User Registration */}
          <Route path="/register" element={<RegisterPage />} />

          {/* Page A03: OTP Verification */}
          <Route path="/verify-otp" element={<VerifyOtpPage />} />

          {/* Page B01: Resident Profile Setup */}
          <Route path="/onboarding/setup" element={<ResidentSetupPage />} />

          {/* Page B02: Residency Choice */}
          <Route path="/onboarding/residency-choice" element={<ResidencyChoicePage />} />

          {/* Page B03: Basic Residency Setup */}
          <Route path="/onboarding/create-residency" element={<CreateResidencyPage />} />

          {/* Page B04 (Create Flow): Wing / Floor / Flat Setup */}
          <Route path="/onboarding/structure-setup" element={<ResidencyStructureSetupPage />} />

          {/* Page B04 (Join Flow): Join an Existing Residency */}
          <Route path="/onboarding/join-residency" element={<JoinResidencyPage />} />

          {/* Catch-all redirect to /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
