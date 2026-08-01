import imageCompression from 'browser-image-compression';
import { MAX_FILE_SIZE_MB } from './fileValidation';

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: MAX_FILE_SIZE_MB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp', // Convert to WebP
    // EXIF is automatically stripped by browser-image-compression if exifOrientation is not preserved (default behavior).
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    // Convert Blob to File object for easier handling
    const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    return new File([compressedBlob], newFileName, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Image compression failed.');
  }
};
