export interface JwtPayload {
  sub?: string;
  user_id?: string;
  role?: string;
  permissions?: string[];
  society_id?: string | null;
  session_id?: string;
  token_type?: string;
  exp?: number;
}

/**
 * Safely decodes base64 JWT payload in browser environment
 */
export function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT payload:', error);
    return null;
  }
}

/**
 * Returns the conceptual destination route based on user role returned by backend.
 */
export function getRoleRedirectRoute(role: string): string {
  const normalized = role?.toLowerCase()?.trim() || '';

  if (normalized.includes('super admin') || normalized === 'super_admin') {
    return '/super-admin';
  }
  if (normalized.includes('society admin') || normalized === 'society_admin') {
    return '/admin';
  }
  if (normalized.includes('treasurer')) {
    return '/admin/billing';
  }
  if (normalized.includes('committee')) {
    return '/admin';
  }
  if (normalized.includes('vendor')) {
    return '/vendor';
  }
  if (normalized.includes('resident') || normalized.includes('owner') || normalized.includes('tenant')) {
    return '/resident';
  }

  return '/login';
}
