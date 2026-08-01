export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

export const validateImageFile = (file: File): string | null => {
  if (!file) return 'No file selected.';

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Invalid file format. Only JPG, PNG, and WebP are allowed. SVG is explicitly rejected.';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB.`;
  }

  return null; // Valid
};
