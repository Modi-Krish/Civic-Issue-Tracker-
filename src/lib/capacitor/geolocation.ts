/**
 * Geolocation wrapper for Capacitor.
 * Uses native GPS on Android, falls back to browser API on web.
 */
import { Geolocation, type Position } from '@capacitor/geolocation';
import { isNativePlatform } from './platform';

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Get current position using native GPS or browser geolocation.
 */
export async function getCurrentPosition(): Promise<LocationResult> {
  if (isNativePlatform()) {
    // Use Capacitor native geolocation
    const position: Position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  }

  // Fallback: Browser geolocation API
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        reject(new Error(`Geolocation error: ${err.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  });
}

/**
 * Request location permissions (needed on Android).
 */
export async function requestLocationPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return true;

  try {
    const status = await Geolocation.requestPermissions();
    return status.location === 'granted';
  } catch {
    return false;
  }
}
