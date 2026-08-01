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
      // 1. Check user authentication
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to upload images.');
      }

      // 2. Validate file
      const validationError = validateImageFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // 3. Compress image
      const compressedFile = await compressImage(file);

      // 4. Get Firebase ID token
      const token = await user.getIdToken();

      // 5. Upload via service
      const metadata = await imageStorageService.uploadIssueImage(
        compressedFile,
        token,
        cityId,
        type
      );

      return metadata;
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'An error occurred during upload.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const rollbackUpload = async (issueId: string): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      const token = await user.getIdToken();
      
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
