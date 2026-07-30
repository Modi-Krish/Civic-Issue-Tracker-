/**
 * Platform detection utility for Capacitor.
 * Detects whether the app is running inside a Capacitor native container
 * or in a regular web browser.
 */
import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): 'android' | 'ios' | 'web' {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}
