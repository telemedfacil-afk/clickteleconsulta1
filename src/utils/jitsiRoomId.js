/**
 * Generates a deterministic Jitsi room ID based on the appointment ID.
 * This is the single source of truth for Jitsi room naming.
 * 
 * Format: clicktele-{appointmentId}
 * 
 * @param {string} appointmentId - The UUID of the appointment.
 * @returns {string} The formatted room ID.
 */
export const buildJitsiRoomId = (appointmentId) => {
  if (!appointmentId) return '';
  // Ensure we trim any whitespace just in case and convert to lowercase
  return `clicktele-${appointmentId.trim().toLowerCase()}`;
};