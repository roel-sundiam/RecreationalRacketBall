import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  console.warn('⚠️  Supabase configuration missing - Gallery upload feature will be disabled');
  console.warn('   Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable gallery uploads');
}

// Create Supabase client with service role key for admin operations (only if configured)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Bucket name for gallery images
export const GALLERY_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'tennis-club-gallery';

/**
 * Helper function to get public URL for an image stored in Supabase Storage
 * @param path - The storage path of the image
 * @returns The public URL
 */
export const getPublicUrl = (path: string): string => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Helper function to delete an image from Supabase Storage
 * @param path - The storage path of the image
 * @returns Promise with success/error
 */
export const deleteFromStorage = async (path: string): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([path]);

    if (error) {
      console.error('Error deleting from Supabase Storage:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Exception deleting from Supabase Storage:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Helper function to upload a club logo to Supabase Storage
 * @param clubId - The club ID
 * @param fileBuffer - The file buffer
 * @param fileName - The original file name
 * @returns Promise with public URL or error
 */
export const uploadClubLogo = async (
  clubId: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<{ success: boolean; publicUrl?: string; error?: string }> => {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    // Generate a unique filename with club ID
    const timestamp = Date.now();
    const ext = fileName.split('.').pop();
    const storagePath = `club-logos/${clubId}-${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(GALLERY_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: `image/${ext}`,
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading to Supabase Storage:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const publicUrl = getPublicUrl(storagePath);

    return { success: true, publicUrl };
  } catch (error: any) {
    console.error('Exception uploading to Supabase Storage:', error);
    return { success: false, error: error.message };
  }
};
