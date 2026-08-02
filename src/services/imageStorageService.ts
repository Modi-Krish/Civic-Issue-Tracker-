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
   * Uploads an image to the Next.js API route with client-side fallback.
   */
  private async uploadToApi(
    file: File,
    token: string,
    cityId: string,
    folder: 'before' | 'after' | 'profile' | 'attachments'
  ): Promise<ImageMetadata> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cityId', cityId || 'global');
      formData.append('folder', folder);

      const headers: Record<string, string> = {};
      if (token && token !== 'anonymous-token') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) return data;
      }

      console.warn('API upload response not OK, using client-side Data URL fallback.');
    } catch (err) {
      console.warn('Network / API upload error, using client-side Data URL fallback:', err);
    }

    // Client-side fallback if server route is unreachable
    const dataUrl = await this.fileToDataUrl(file);
    return {
      url: dataUrl,
      path: `local/${folder}/${Date.now()}_${file.name}`,
      size: file.size,
      mimeType: file.type || 'image/jpeg',
      uploadedAt: new Date().toISOString()
    };
  }

  async uploadIssueImage(file: File, token: string, cityId: string, type: 'before' | 'after'): Promise<ImageMetadata> {
    return this.uploadToApi(file, token, cityId, type);
  }

  async uploadProfileImage(file: File, token: string): Promise<ImageMetadata> {
    return this.uploadToApi(file, token, 'global', 'profile');
  }

  async uploadAttachment(file: File, token: string, cityId: string): Promise<ImageMetadata> {
    return this.uploadToApi(file, token, cityId, 'attachments');
  }

  async deleteIssueImage(issueId: string, token: string, cityId: string): Promise<void> {
    try {
      await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ issueId, cityId }),
      });
    } catch (e) {
      console.warn('Delete issue image notice:', e);
    }
  }

  async replaceIssueImage(issueId: string, newFile: File, token: string, cityId: string, type: 'before' | 'after'): Promise<ImageMetadata> {
    return this.uploadToApi(newFile, token, cityId, type);
  }
}

export const imageStorageService = new ImageStorageService();
