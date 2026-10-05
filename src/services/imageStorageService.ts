import { supabase } from '../lib/supabase/client';

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
   * Uploads an image to Supabase Storage natively.
   */
  private async uploadToSupabase(
    file: File,
    token: string,
    cityId: string,
    folder: 'before' | 'after' | 'profile' | 'attachments'
  ): Promise<ImageMetadata> {
    try {
      const timestamp = Date.now();
      const uniqueName = `${timestamp}_${Math.random().toString(36).substring(7)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const fullPath = `${cityId || 'global'}/${folder}/${year}/${month}/${uniqueName}`;
      
      const { error } = await supabase.storage
        .from('issues')
        .upload(fullPath, file, {
          upsert: true,
          contentType: file.type || 'image/jpeg',
        });
      
      if (error) {
        throw error;
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('issues')
        .getPublicUrl(fullPath);

      return {
        url: publicUrlData.publicUrl,
        path: fullPath,
        size: file.size,
        mimeType: file.type || 'image/jpeg',
        uploadedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn('Supabase Storage upload error, using client-side Data URL fallback:', err);
      
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
    return this.uploadToSupabase(file, token, cityId, type);
  }

  async uploadProfileImage(file: File, token: string): Promise<ImageMetadata> {
    return this.uploadToSupabase(file, token, 'global', 'profile');
  }

  async uploadAttachment(file: File, token: string, cityId: string): Promise<ImageMetadata> {
    return this.uploadToSupabase(file, token, cityId, 'attachments');
  }

  async deleteIssueImage(issueId: string, token: string, cityId: string): Promise<void> {
    try {
      console.warn('deleteIssueImage called without path, skipping native deletion');
    } catch (e) {
      console.warn('Delete issue image notice:', e);
    }
  }

  async replaceIssueImage(issueId: string, newFile: File, token: string, cityId: string, type: 'before' | 'after'): Promise<ImageMetadata> {
    return this.uploadToSupabase(newFile, token, cityId, type);
  }
}

export const imageStorageService = new ImageStorageService();
