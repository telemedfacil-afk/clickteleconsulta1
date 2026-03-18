/**
 * WhatsApp Integration Configuration
 * Controls feature flags and API endpoints for WhatsApp notifications
 */

// Feature Flags - Disabled by default as requested
export const WHATSAPP_CONFIG = {
  APPOINTMENT_NOTIFICATIONS_ENABLED: false,
  MESSAGE_NOTIFICATIONS_ENABLED: false,
  TEST_MODE: true, // If true, only logs to console instead of sending API requests
  API_URL: import.meta.env.VITE_WHATSAPP_API_URL || '',
  API_KEY: import.meta.env.VITE_WHATSAPP_API_KEY || ''
};

/**
 * Sends a WhatsApp notification if enabled
 * @param {string} phone - Recipient phone number
 * @param {string} template - Template name
 * @param {object} variables - Template variables
 * @returns {Promise<boolean>} success status
 */
export const sendWhatsAppNotification = async (phone, template, variables = {}) => {
  if (!WHATSAPP_CONFIG.APPOINTMENT_NOTIFICATIONS_ENABLED && !WHATSAPP_CONFIG.MESSAGE_NOTIFICATIONS_ENABLED) {
    return false;
  }

  // Check specific flags based on template type if needed
  // For now, global check or specific logic:
  
  if (WHATSAPP_CONFIG.TEST_MODE) {
    console.log(`[WHATSAPP TEST MODE] Would send template '${template}' to ${phone} with vars:`, variables);
    return true;
  }

  if (!WHATSAPP_CONFIG.API_URL || !WHATSAPP_CONFIG.API_KEY) {
    console.warn('[WHATSAPP] Missing API configuration');
    return false;
  }

  try {
    // Implement actual fetch call here when enabled
    // const response = await fetch(...)
    console.log('[WHATSAPP] Sending (simulated)...');
    return true;
  } catch (error) {
    console.error('[WHATSAPP] Error sending notification:', error);
    return false;
  }
};