/**
 * Utility functions for user avatar processing, compression, and Supabase S3 Storage.
 * - Center-crops and scales images to 256x256 square
 * - Uploads image binary to Supabase Storage S3 bucket ('avatars')
 * - Returns public HTTPS S3 URL from Supabase CDN
 * - Gracefully falls back to optimized data URL if cloud storage bucket is pending setup
 */
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface ProcessedAvatarResult {
  url: string;
  isCloudStorage: boolean;
  message?: string;
}

/**
 * Reads a File, center-crops it to square, compresses it to JPEG,
 * and uploads to Supabase S3 Storage ('avatars' bucket).
 */
export async function processAndUploadAvatar(
  file: File,
  userId: string = 'user',
  options: ResizeOptions = {}
): Promise<ProcessedAvatarResult> {
  const { maxWidth = 256, maxHeight = 256, quality = 0.85 } = options;

  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (JPEG, PNG, WebP, etc.).');
  }

  // Max 10MB limit for raw upload before compression
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image file is too large. Please select an image under 10MB.');
  }

  // 1. Render to canvas and extract both Blob and DataURL
  const { blob, dataUrl } = await new Promise<{ blob: Blob; dataUrl: string }>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        reject(new Error('Could not load image format.'));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = maxWidth;
          canvas.height = maxHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas 2D context not available.'));
            return;
          }

          // Center-crop to square
          const srcWidth = img.naturalWidth || img.width;
          const srcHeight = img.naturalHeight || img.height;
          const minDim = Math.min(srcWidth, srcHeight);

          const srcX = (srcWidth - minDim) / 2;
          const srcY = (srcHeight - minDim) / 2;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, maxWidth, maxHeight);

          ctx.drawImage(
            img,
            srcX,
            srcY,
            minDim,
            minDim,
            0,
            0,
            maxWidth,
            maxHeight
          );

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          canvas.toBlob(
            (b) => {
              if (b) {
                resolve({ blob: b, dataUrl: compressedDataUrl });
              } else {
                reject(new Error('Failed to create image blob.'));
              }
            },
            'image/jpeg',
            quality
          );
        } catch (err: any) {
          reject(new Error(err?.message || 'Failed to process image.'));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });

  // 2. Attempt direct upload to Supabase Storage (S3) bucket 'avatars'
  if (isSupabaseConfigured && supabase) {
    try {
      const sanitizedId = (userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `${sanitizedId}-${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          return {
            url: publicUrlData.publicUrl,
            isCloudStorage: true,
            message: 'Image uploaded to Supabase S3 Storage',
          };
        }
      } else if (error) {
        console.warn('Supabase storage upload notice:', error.message);
      }
    } catch (storageErr: any) {
      console.warn('Supabase storage upload exception:', storageErr);
    }
  }

  // 3. Fallback to compact Data URL if bucket is not yet provisioned
  return {
    url: dataUrl,
    isCloudStorage: false,
    message: 'Processed as optimized image',
  };
}

/**
 * Backward-compatible helper that returns the URL string directly.
 */
export async function processAvatarFile(
  file: File,
  options: ResizeOptions = {},
  userId: string = 'user'
): Promise<string> {
  const result = await processAndUploadAvatar(file, userId, options);
  return result.url;
}
