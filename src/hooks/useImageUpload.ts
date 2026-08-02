import { useState } from 'react';
import { validateImageFile } from '../utils/fileValidation';
import { compressImage } from '../utils/imageCompression';
import { imageStorageService, ImageMetadata } from '../services/imageStorageService';
import { auth } from '../lib/firebase';

interface UseImageUploadOptions {
  cityId: string;
  type: 'before' | 'after';
}

export const useImageUpload = ({ cityId, type }: UseImageUploadOptions) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File): Promise<ImageMetadata | null> => {
    setIsUploading(true);
    setError(null);

    try {
      // 1. Validate file format/size
      const validationError = validateImageFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // 2. Compress image if possible
      let processedFile = file;
      try {
        processedFile = await compressImage(file);
      } catch (cErr) {
        console.warn('Image compression notice (using raw file):', cErr);
      }

      // 3. Get Auth Token with fallback
      let token = 'anonymous-token';
      try {
        const user = auth.currentUser;
        if (user) {
          token = await user.getIdToken();
        }
      } catch (aErr) {
        console.warn('Auth token retrieval notice:', aErr);
      }

      // 4. Upload via storage service (handles server & client fallbacks)
      const metadata = await imageStorageService.uploadIssueImage(
        processedFile,
        token,
        cityId || 'global',
        type
      );

      return metadata;
    } catch (err: any) {
      console.error('Upload hook error:', err);
      setError(err.message || 'An error occurred during upload.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const rollbackUpload = async (issueId: string): Promise<boolean> => {
    try {
      let token = 'anonymous-token';
      const user = auth.currentUser;
      if (user) {
        token = await user.getIdToken();
      }
      await imageStorageService.deleteIssueImage(issueId, token, cityId);
      return true;
    } catch (err) {
      console.error('Failed to rollback image upload:', err);
      return false;
    }
  };

  return {
    uploadImage,
    rollbackUpload,
    isUploading,
    error,
  };
};
