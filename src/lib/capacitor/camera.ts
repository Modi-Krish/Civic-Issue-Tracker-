/**
 * Camera wrapper for Capacitor.
 * Falls back to HTML file input on web.
 */
import { Camera, CameraResultType, CameraSource, type Photo } from '@capacitor/camera';
import { isNativePlatform } from './platform';

export interface CapturedPhoto {
  dataUrl: string;
  file: File | null;
  format: string;
}

/**
 * Take a photo using the native camera (on Android) or file picker (on web).
 */
export async function takePhoto(): Promise<CapturedPhoto | null> {
  if (!isNativePlatform()) {
    // On web, we fall back to regular file input — handled by the component
    return null;
  }

  try {
    const photo: Photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // Let user choose camera or gallery
      quality: 85,
      width: 1920,
      height: 1080,
      correctOrientation: true,
      allowEditing: false,
    });

    if (!photo.dataUrl) return null;

    // Convert data URL to File object for upload
    const response = await fetch(photo.dataUrl);
    const blob = await response.blob();
    const file = new File([blob], `photo_${Date.now()}.${photo.format}`, {
      type: `image/${photo.format}`,
    });

    return {
      dataUrl: photo.dataUrl,
      file,
      format: photo.format || 'jpeg',
    };
  } catch (error: any) {
    // User cancelled or permission denied
    console.warn('Camera error:', error?.message);
    return null;
  }
}

/**
 * Request camera permissions (Android requires runtime permissions).
 */
export async function requestCameraPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return true; // Web doesn't need explicit permission

  try {
    const status = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    return status.camera === 'granted' && status.photos === 'granted';
  } catch {
    return false;
  }
}
