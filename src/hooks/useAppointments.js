import { useContext } from 'react';
import { AppointmentsContext } from '@/contexts/AppointmentsContext';

export const useAppointments = () => {
    const context = useContext(AppointmentsContext);
    if (!context) {
        throw new Error('useAppointments must be used within an AppointmentsProvider');
    }
    return context;
};