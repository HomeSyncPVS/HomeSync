export interface UserResponse {
  id: string;
  email: string;
  phone?: string | null;
  full_name: string;
  role_id: string;
  society_id?: string | null;
  flat_id?: string | null;
  profile_image_url?: string | null;
  is_active: boolean;
  is_verified: boolean;
  approval_status: string;
  created_at: string;
}

export interface UserUpdateRequest {
  full_name?: string;
  phone?: string;
  society_id?: string | null;
  flat_id?: string | null;
}

export interface RegisterRequest {
  email: string;
  phone?: string;
  password: string;
  full_name: string;
  role?: string;
}

export interface RegisterResponse {
  success?: boolean;
  message: string;
  user: UserResponse;
}

export interface LoginRequest {
  email: string; // Can be email address or phone number
  password: string;
  device_type?: string;
  push_token?: string | null;
  device_model?: string | null;
  os_version?: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  session_id: string;
  user: UserResponse;
}

export interface SendOtpRequest {
  target: string;
  purpose: 'login' | 'verify' | 'register' | 'reset';
}

export interface VerifyOtpRequest {
  target: string;
  code: string;
  purpose: 'login' | 'verify' | 'register' | 'reset';
}

export interface VerifyOtpResponse {
  success?: boolean;
  message: string;
  token?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  session_id?: string | null;
  user?: UserResponse | null;
}

export interface SocietyCreateRequest {
  name: string;
  address?: string;
  region: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
}

export interface SocietyResponse {
  id: string;
  name: string;
  address?: string;
  region: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  join_code?: string;
  logo_url?: string | null;
  banner_url?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface FlatJoinInfo {
  id: string;
  flat_number: string;
  flat_type: string;
}

export interface FloorJoinInfo {
  id: string;
  floor_number: number;
  flats: FlatJoinInfo[];
}

export interface WingJoinInfo {
  id: string;
  name: string;
  floors: FloorJoinInfo[];
}

export interface SocietyJoinVerifyResponse {
  id: string;
  name: string;
  address?: string;
  region: string;
  city: string;
  state: string;
  wings: WingJoinInfo[];
}

export interface JoinSocietyRequest {
  join_code: string;
  flat_id: string;
}

export interface WingCreateRequest {
  name: string;
  society_id: string;
}

export interface WingUpdateRequest {
  name: string;
}

export interface WingResponse {
  id: string;
  name: string;
  society_id: string;
  created_at: string;
}

export interface FloorCreateRequest {
  floor_number: number;
  wing_id: string;
}

export interface FloorUpdateRequest {
  floor_number: number;
}

export interface FloorResponse {
  id: string;
  floor_number: number;
  wing_id: string;
  created_at: string;
}

export interface FlatCreateRequest {
  flat_number: string;
  flat_type: string;
  flat_size: number;
  occupancy_status?: string;
  floor_id: string;
  wing_id: string;
  society_id: string;
}

export interface FlatUpdateRequest {
  flat_number?: string;
  flat_type?: string;
  flat_size?: number;
  occupancy_status?: string;
}

export interface FlatResponse {
  id: string;
  flat_number: string;
  flat_type: string;
  flat_size: number;
  occupancy_status: string;
  floor_id: string;
  wing_id: string;
  society_id: string;
  created_at: string;
}

export interface SuccessResponse {
  success?: boolean;
  message: string;
  data?: any;
}

export interface ApiErrorDetail {
  success?: boolean;
  detail?: string;
  error_code?: string;
  timestamp?: string;
}
