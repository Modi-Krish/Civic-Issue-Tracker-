export interface ImageMetadata {
  url: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: string; // ISO String
}

class ImageStorageService {
  /**
   * Uploads an image to the Next.js API route.
   */
  private async uploadToApi(
    file: File,
    token: string,
    cityId: string,
    folder: 'before' | 'after' | 'profile' | 'attachments'
  ): Promise<ImageMetadata> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cityId', cityId);
    formData.append('folder', folder);

    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMsg = 'Upload failed';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    return response.json();
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
    const response = await fetch('/api/storage/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ issueId, cityId }),
    });

    if (!response.ok) {
      let errorMsg = 'Delete failed';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }
  }

  async replaceIssueImage(issueId: string, newFile: File, token: string, cityId: string, type: 'before' | 'after'): Promise<ImageMetadata> {
    const formData = new FormData();
    formData.append('file', newFile);
    formData.append('issueId', issueId);
    formData.append('cityId', cityId);
    formData.append('folder', type);

    const response = await fetch('/api/storage/replace', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMsg = 'Replace failed';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    return response.json();
  }
}

export const imageStorageService = new ImageStorageService();
