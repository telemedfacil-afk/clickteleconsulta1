import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async (filters = {}) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('reviews').select(`
        *,
        agendamentos ( id, appointment_date, appointment_time ),
        review_disputes ( id, reason, status )
      `);

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.patientId) query = query.eq('patient_id', filters.patientId);
      if (filters.doctorUserId) query = query.eq('doctor_user_id', filters.doctorUserId);

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      if (fetchError) throw fetchError;

      setReviews(data || []);
      return data;
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createReview = async (appointmentId, rating, comment) => {
    if (!user) throw new Error("User not authenticated");
    try {
      // 1. Get agendamento and medicos info to find doctor_user_id
      const { data: agendamento, error: apptError } = await supabase
        .from('agendamentos')
        .select('medico_id')
        .eq('id', appointmentId)
        .single();
        
      if (apptError) throw apptError;

      const { data: medico, error: medError } = await supabase
        .from('medicos')
        .select('user_id')
        .eq('id', agendamento.medico_id)
        .single();

      if (medError) throw medError;

      // 2. Insert Review
      const { data, error: insertError } = await supabase
        .from('reviews')
        .insert({
          appointment_id: appointmentId,
          patient_id: user.id,
          doctor_user_id: medico.user_id,
          rating,
          comment,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (err) {
      console.error('Error creating review:', err);
      throw err;
    }
  };

  const updateReview = async (reviewId, rating, comment) => {
    try {
      const { data, error: updateError } = await supabase
        .from('reviews')
        .update({ rating, comment, updated_at: new Date().toISOString() })
        .eq('id', reviewId)
        .eq('patient_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err) {
      console.error('Error updating review:', err);
      throw err;
    }
  };

  const createDispute = async (reviewId, reason) => {
    if (!user) throw new Error("User not authenticated");
    try {
      // Create dispute
      const { error: disputeError } = await supabase
        .from('review_disputes')
        .insert({
          review_id: reviewId,
          doctor_user_id: user.id,
          reason,
          status: 'pending'
        });

      if (disputeError) throw disputeError;

      // Update review status
      const { error: updateError } = await supabase
        .from('reviews')
        .update({ status: 'disputed', updated_at: new Date().toISOString() })
        .eq('id', reviewId)
        .eq('doctor_user_id', user.id);

      if (updateError) throw updateError;
      
      return true;
    } catch (err) {
      console.error('Error creating dispute:', err);
      throw err;
    }
  };

  return {
    reviews,
    loading,
    error,
    fetchReviews,
    createReview,
    updateReview,
    createDispute
  };
};