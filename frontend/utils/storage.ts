import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'homesync_access_token';
const REFRESH_TOKEN_KEY = 'homesync_refresh_token';
const USER_ROLE_KEY = 'homesync_user_role';

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Error saving auth tokens:', error);
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving access token:', error);
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    return null;
  }
}

export async function deleteTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ROLE_KEY);
  } catch (error) {
    console.error('Error deleting auth tokens:', error);
  }
}

export async function saveUserRole(role: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_ROLE_KEY, role);
  } catch (error) {
    console.error('Error saving user role:', error);
  }
}

export async function getUserRole(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(USER_ROLE_KEY);
  } catch (error) {
    console.error('Error retrieving user role:', error);
    return null;
  }
}
