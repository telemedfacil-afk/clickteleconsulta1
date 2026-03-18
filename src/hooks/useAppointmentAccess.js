import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook to verify if a patient and doctor have a valid appointment relationship
 * to allow messaging.
 * @param {string} patientId - The UUID of the patient
 * @param {string} doctorId - The UUID of the doctor (medicos.id)
 */
export function useAppointmentAccess(patientId, doctorId) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkAccess() {
      if (!patientId || !doctorId) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Query agendamentos to check if at least one appointment exists
        const { data, error: queryError } = await supabase
          .from('agendamentos')
          .select('id')
          .eq('patient_id', patientId)
          .eq('medico_id', doctorId)
          .limit(1);

        if (queryError) throw queryError;

        setHasAccess(data && data.length > 0);
      } catch (err) {
        console.error('Error checking appointment access:', err);
        setError(err.message);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [patientId, doctorId]);

  return { hasAccess, loading, error };
}