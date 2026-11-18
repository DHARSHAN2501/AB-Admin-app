import { supabase } from './supabase.js';

const BUCKET_NAME = 'restaurant-images';

/**
 * Resizes and compresses an image File or Data URL using HTML5 Canvas.
 * Produces a lightweight Blob (WebP or JPEG) under 60KB from 10MB+ phone photos.
 */
export function compressImageToBlob(source, maxWidth = 800, maxHeight = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Canvas compression only supported in browser environment.'));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        return reject(new Error('Image dimensions not available.'));
      }

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get 2D canvas context'));
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP, fallback to JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, mimeType: 'image/webp', width, height });
          } else {
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve({ blob: jpegBlob, mimeType: 'image/jpeg', width, height });
                } else {
                  reject(new Error('Canvas toBlob failed.'));
                }
              },
              'image/jpeg',
              quality
            );
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = (err) => reject(new Error(`Failed to load image for compression: ${err}`));

    if (source instanceof Blob || source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else if (typeof source === 'string') {
      img.src = source;
    } else {
      reject(new Error('Invalid image source type.'));
    }
  });
}

/**
 * Uploads an image to Supabase Storage and returns its permanent public CDN URL.
 * If the Supabase bucket is not yet provisioned, falls back to a compact WebP/JPEG data URL (<50KB).
 */
export async function uploadRestaurantImage(fileOrData, folder = 'dishes') {
  try {
    if (!fileOrData) return '';

    // If already a hosted HTTPS URL, keep it
    if (typeof fileOrData === 'string' && (fileOrData.startsWith('http://') || fileOrData.startsWith('https://'))) {
      return fileOrData;
    }

    const { blob, mimeType } = await compressImageToBlob(fileOrData, 800, 800, 0.75);
    const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = `${folder}/${filename}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year CDN cache
        upsert: false
      });

    if (error) {
      console.warn('Supabase storage upload fallback to compact Base64 (<50KB):', error.message);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || '';
  } catch (err) {
    console.warn('Image upload processing warning:', err?.message || err);
    if (typeof fileOrData === 'string' && fileOrData.startsWith('http')) {
      return fileOrData;
    }
    throw err;
  }
}
