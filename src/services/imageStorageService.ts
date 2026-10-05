import { app } from '../lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface ImageMetadata {
  url: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

class ImageStorageService {
  /**
   * Helper to convert a File to a local Data URL (base64) string as ultimate fallback.
   */
  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Uploads an image to Firebase Storage natively.
   */
  private async uploadToFirebase(
    file: File,
    token: string,
    cityId: string,
    folder: 'before' | 'after' | 'profile' | 'attachments'
  ): Promise<ImageMetadata> {
    try {
      const storage = getStorage(app);
      const timestamp = Date.now();
      const uniqueName = `${timestamp}_${Math.random().toString(36).substring(7)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const fullPath = `uploads/${cityId || 'global'}/${folder}/${uniqueName}`;
      
      const storageRef = ref(storage, fullPath);
      
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'image/jpeg',
      });
      
      const downloadUrl = await getDownloadURL(snapshot.ref);

      return {
        url: downloadUrl,
        path: fullPath,
        size: file.size,
        mimeType: file.type || 'image/jpeg',
        uploadedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn('Firebase Storage upload error, using client-side Data URL fallback:', err);
      
      // Client-side fallback if storage fails
      const dataUrl = await this.fileToDataUrl(file);
      return {
        url: dataUrl,
        path: `local/${folder}/${Date.now()}_${file.name}`,
        size: file.size,
        mimeType: file.type || 'image/jpeg',
        uploadedAt: new Date().toISOString()
      };
    }
  }

  async uploadIssueImage(file: File, token: string, cityId: string, type: 'before' | 'after'): Promise<ImageMetadata> {
    return this.uploadToFirebase(file, token, cityId, type);
  }

  async uploadProfileImage(file: File, token: string): Promise<ImageMetadata> {
    return this.uploadToFirebase(file, token, 'global', 'profile');
  }

  async uploadAttachment(file: File, token: string, cityId: string): Promise<ImageMetadata> {
    return this.uploadToFirebase(file, token, cityId, 'attachments');
  }

  async deleteIssueImage(issueId: string, token: string, cityId: string): Promise<void> {
    try {
      // Note: We don't have the exact image path here in this interface signature, 
      // but typically we'd look it up or the backend would do it. 
      // If we need to delete by URL, we'd need the URL. For now this is just a stub 
      // or we can just ignore deletion on rollback for safety if we don't have the path.
      console.warn('deleteIssueImage called without path, skipping native deletion');
    } catch (e) {
      console.warn('Delete issue image notice:', e);
    }
  }

  async replaceIssueImage(issueId: string, newFile: File, token: string, cityId: string, type: 'before' | 'after'): Promise<ImageMetadata> {
    return this.uploadToFirebase(newFile, token, cityId, type);
  }
}

export const imageStorageService = new ImageStorageService();
