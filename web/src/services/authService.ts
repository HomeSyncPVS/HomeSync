import { apiClient } from './apiClient';
import type { 
  FlatCreateRequest,
  FlatResponse,
  FlatUpdateRequest,
  FloorCreateRequest,
  FloorResponse,
  FloorUpdateRequest,
  JoinSocietyRequest,
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse, 
  SocietyCreateRequest,
  SocietyJoinVerifyResponse,
  SocietyResponse,
  SuccessResponse,
  UserResponse,
  UserUpdateRequest,
  VerifyOtpRequest,
  VerifyOtpResponse,
  WingCreateRequest,
  WingResponse,
  WingUpdateRequest 
} from '../types/auth';

export const authService = {
  /**
   * User login with Email or Phone number and password
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email: data.email,
      password: data.password,
      device_type: data.device_type || 'web',
      push_token: data.push_token || null,
      device_model: navigator.userAgent.substring(0, 100),
      os_version: navigator.platform || 'web',
    });
    return response.data;
  },

  /**
   * Register a new general HomeSync user account
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      email: data.email,
      phone: data.phone,
      password: data.password,
      full_name: data.full_name,
    });
    return response.data;
  },

  /**
   * Create a new society / residency
   */
  async createSociety(data: SocietyCreateRequest): Promise<SocietyResponse> {
    const response = await apiClient.post<SocietyResponse>('/societies', data);
    return response.data;
  },

  /**
   * Get single society by ID
   */
  async getSociety(id: string): Promise<SocietyResponse> {
    const response = await apiClient.get<SocietyResponse>(`/societies/${id}`);
    return response.data;
  },

  /**
   * List wings for a society
   */
  async listWings(societyId?: string): Promise<WingResponse[]> {
    const response = await apiClient.get<WingResponse[]>('/wings', {
      params: societyId ? { society_id: societyId } : undefined,
    });
    return response.data;
  },

  /**
   * Create a wing
   */
  async createWing(data: WingCreateRequest): Promise<WingResponse> {
    const response = await apiClient.post<WingResponse>('/wings', data);
    return response.data;
  },

  /**
   * Update a wing
   */
  async updateWing(id: string, data: WingUpdateRequest): Promise<WingResponse> {
    const response = await apiClient.put<WingResponse>(`/wings/${id}`, data);
    return response.data;
  },

  /**
   * Delete a wing
   */
  async deleteWing(id: string): Promise<SuccessResponse> {
    const response = await apiClient.delete<SuccessResponse>(`/wings/${id}`);
    return response.data;
  },

  /**
   * List floors for a wing
   */
  async listFloors(wingId?: string): Promise<FloorResponse[]> {
    const response = await apiClient.get<FloorResponse[]>('/floors', {
      params: wingId ? { wing_id: wingId } : undefined,
    });
    return response.data;
  },

  /**
   * Create a floor
   */
  async createFloor(data: FloorCreateRequest): Promise<FloorResponse> {
    const response = await apiClient.post<FloorResponse>('/floors', data);
    return response.data;
  },

  /**
   * Update a floor
   */
  async updateFloor(id: string, data: FloorUpdateRequest): Promise<FloorResponse> {
    const response = await apiClient.put<FloorResponse>(`/floors/${id}`, data);
    return response.data;
  },

  /**
   * Delete a floor
   */
  async deleteFloor(id: string): Promise<SuccessResponse> {
    const response = await apiClient.delete<SuccessResponse>(`/floors/${id}`);
    return response.data;
  },

  /**
   * List flats for a wing/floor
   */
  async listFlats(wingId?: string, floorId?: string): Promise<FlatResponse[]> {
    const response = await apiClient.get<FlatResponse[]>('/flats', {
      params: {
        ...(wingId ? { wing_id: wingId } : {}),
        ...(floorId ? { floor_id: floorId } : {}),
      },
    });
    return response.data;
  },

  /**
   * Create a flat
   */
  async createFlat(data: FlatCreateRequest): Promise<FlatResponse> {
    const response = await apiClient.post<FlatResponse>('/flats', data);
    return response.data;
  },

  /**
   * Update a flat
   */
  async updateFlat(id: string, data: FlatUpdateRequest): Promise<FlatResponse> {
    const response = await apiClient.put<FlatResponse>(`/flats/${id}`, data);
    return response.data;
  },

  /**
   * Delete a flat
   */
  async deleteFlat(id: string): Promise<SuccessResponse> {
    const response = await apiClient.delete<SuccessResponse>(`/flats/${id}`);
    return response.data;
  },

  /**
   * Verify society join code and fetch society structure hierarchy
   */
  async verifySocietyJoinCode(code: string): Promise<SocietyJoinVerifyResponse> {
    const response = await apiClient.get<SocietyJoinVerifyResponse>(`/societies/join/verify?code=${encodeURIComponent(code)}`);
    return response.data;
  },

  /**
   * Submit a join request for a flat in a society
   */
  async joinSociety(data: JoinSocietyRequest): Promise<SuccessResponse> {
    const response = await apiClient.post<SuccessResponse>('/societies/join', data);
    return response.data;
  },

  /**
   * Verify 6-digit OTP code for registration / password reset / login
   */
  async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const response = await apiClient.post<VerifyOtpResponse>('/auth/verify-otp', {
      target: data.target,
      code: data.code,
      purpose: data.purpose,
    });
    return response.data;
  },

  /**
   * Resend a fresh OTP to the destination target
   */
  async resendOtp(target: string, purpose: 'login' | 'verify' | 'register' | 'reset' = 'register'): Promise<SuccessResponse> {
    const response = await apiClient.post<SuccessResponse>('/auth/resend-otp', {
      target: target,
      purpose: purpose,
    });
    return response.data;
  },

  /**
   * Get current authenticated user profile
   */
  async getMyProfile(): Promise<UserResponse> {
    const response = await apiClient.get<UserResponse>('/residents/me/profile');
    return response.data;
  },

  /**
   * Update resident profile details
   */
  async updateProfile(userId: string, data: UserUpdateRequest): Promise<UserResponse> {
    const response = await apiClient.put<UserResponse>(`/residents/${userId}`, data);
    return response.data;
  },

  /**
   * Send 6-digit OTP (via Email SMTP for registration / verification / reset)
   */
  async sendOtp(target: string, purpose: 'login' | 'verify' | 'register' | 'reset' = 'verify'): Promise<SuccessResponse> {
    const response = await apiClient.post<SuccessResponse>('/auth/send-otp', {
      target: target,
      purpose: purpose,
    });
    return response.data;
  },

  /**
   * Fetch backend Google OAuth initiation URL
   */
  async getGoogleOAuthUrl(): Promise<string> {
    const response = await apiClient.get<{ login_url: string }>('/auth/google/login');
    return response.data.login_url;
  },

  /**
   * Fetch backend Apple OAuth initiation URL
   */
  async getAppleOAuthUrl(): Promise<string> {
    const response = await apiClient.get<{ login_url: string }>('/auth/apple/login');
    return response.data.login_url;
  },
};
