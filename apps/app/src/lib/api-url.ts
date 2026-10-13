import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * URL de base de l'API (spec api-transport, design D3).
 * - Web : relative, même origine.
 * - Mobile : EXPO_PUBLIC_API_URL, sinon l'hôte de Metro en développement.
 */
export function getApiBaseUrl(): string {
  if (Platform.OS === 'web') return '';
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return `http://${hostUri}`;
  throw new Error('EXPO_PUBLIC_API_URL doit être défini hors développement.');
}
