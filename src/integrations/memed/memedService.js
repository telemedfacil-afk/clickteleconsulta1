import { supabase } from '@/lib/customSupabaseClient';

/**
 * MEMED INTEGRATION
 * Fetches the authentication token for the Memed prescription module.
 * 
 * @param {string} prescriberId - The internal ID of the doctor (user_id)
 * @returns {Promise<string>} - The Memed authentication token
 */
export const getMemedToken = async (prescriberId) => {
  try {
    const { data, error } = await supabase.functions.invoke('memed-auth', {
      body: { prescriberId }
    });

    if (error) throw error;
    
    // Adjust based on actual response structure from the edge function
    return data?.data?.attributes?.token || data?.token;
  } catch (error) {
    console.error('Error fetching Memed token:', error);
    throw new Error('Falha ao autenticar com o serviço de prescrição.');
  }
};