import React, { createContext, useContext, useState, useMemo } from 'react';
import type { UserResponse, LoginResponse } from '../types/auth';
import { parseJwt } from '../utils/rbac';

export interface AuthContextType {
  user: UserResponse | null;
  role: string | null;
  permissions: string[];
  accessToken: string | null;
  pendingRegistrationTarget: string | null;
  setPendingRegistrationTarget: (target: string | null) => void;
  isAuthenticated: boolean;
  saveAuthSession: (session: LoginResponse) => void;
  updateUser: (updatedUser: UserResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('homesync_access_token');
  });

  const [user, setUser] = useState<UserResponse | null>(() => {
    const saved = localStorage.getItem('homesync_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [pendingRegistrationTarget, setPendingRegistrationTargetState] = useState<string | null>(() => {
    return sessionStorage.getItem('homesync_pending_registration_target');
  });

  const setPendingRegistrationTarget = (target: string | null) => {
    if (target) {
      sessionStorage.setItem('homesync_pending_registration_target', target);
    } else {
      sessionStorage.removeItem('homesync_pending_registration_target');
    }
    setPendingRegistrationTargetState(target);
  };

  // Derive role and permissions directly from accessToken using useMemo
  const { role, permissions } = useMemo(() => {
    if (!accessToken) {
      return { role: null, permissions: [] };
    }
    const payload = parseJwt(accessToken);
    return {
      role: payload?.role || null,
      permissions: payload?.permissions || [],
    };
  }, [accessToken]);

  const saveAuthSession = (session: LoginResponse) => {
    localStorage.setItem('homesync_access_token', session.access_token);
    localStorage.setItem('homesync_refresh_token', session.refresh_token);
    localStorage.setItem('homesync_user', JSON.stringify(session.user));
    
    setAccessToken(session.access_token);
    setUser(session.user);
  };

  const updateUser = (updatedUser: UserResponse) => {
    localStorage.setItem('homesync_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem('homesync_access_token');
    localStorage.removeItem('homesync_refresh_token');
    localStorage.removeItem('homesync_user');
    sessionStorage.removeItem('homesync_pending_registration_target');
    setAccessToken(null);
    setUser(null);
    setPendingRegistrationTargetState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        permissions,
        accessToken,
        pendingRegistrationTarget,
        setPendingRegistrationTarget,
        isAuthenticated: !!accessToken && !!user,
        saveAuthSession,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
