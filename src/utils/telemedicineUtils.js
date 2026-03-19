import { buildJitsiRoomId } from '@/utils/jitsiRoomId';

/**
 * Generates a Jitsi URL for telemedicine consultations.
 * 
 * @param {string} roomName - The unique room name.
 * @param {string} displayName - The name to display for the user in the call.
 * @returns {string} The complete Jitsi URL.
 */
export const generateJitsiURL = (roomName, displayName) => {
  if (!roomName) {
    console.error("generateJitsiURL: Missing room name");
    return '';
  }

  const domain = 'meet.jit.si';
  const encodedName = encodeURIComponent(displayName || 'Participante');
  const url = `https://${domain}/${roomName}#config.prejoinPageEnabled=false&config.requireDisplayName=false&userInfo.displayName="${encodedName}"`;

  return url;
};

/**
 * Returns authentication headers for telemedicine API calls.
 * 
 * @param {object} session - The Supabase session object containing access_token.
 * @returns {object} Headers object with Authorization and Content-Type.
 */
export const getAuthHeaders = (session) => {
  if (!session || !session.access_token) {
    console.warn("getAuthHeaders: No valid session provided");
    return {
      'Content-Type': 'application/json'
    };
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
};

/**
 * Opens a Jitsi Telemedicine room in a new tab.
 * 
 * @param {string} roomName - The unique room name.
 * @param {string} displayName - The name to display for the user in the call.
 * @returns {object} Result object { ok: boolean, error?: string, window?: Window }
 */
export const openJitsiRoom = (roomName, displayName) => {
  if (!roomName) {
    console.error("openJitsiRoom: Missing room name");
    return { ok: false, error: "Missing room name" };
  }

  const url = generateJitsiURL(roomName, displayName);

  if (!url) {
    return { ok: false, error: "Failed to generate Jitsi URL" };
  }

  console.log("Opening Jitsi Room:", { roomName, url });

  // Open in new tab with security best practices
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
  
  if (newWindow) {
    newWindow.opener = null;
    return { ok: true, window: newWindow };
  } else {
    console.warn("Popup blocked for Jitsi room");
    return { ok: false, error: "Popup blocked" };
  }
};

/**
 * Generates a JaaS (8x8.vc) JWT token via Supabase Edge Function.
 * The private key is NEVER exposed to the frontend — signing happens server-side.
 *
 * @param {object} supabase - Supabase client instance
 * @param {object} params
 * @param {string} params.appointmentId - UUID do agendamento
 * @param {string} params.userId - UUID do usuário autenticado
 * @param {string} params.displayName - Nome de exibição na sala
 * @param {string} params.email - Email do usuário
 * @param {boolean} params.isModerator - true para médico, false para paciente
 * @returns {Promise<{ token: string, roomName: string, appId: string }>}
 */
export const generateJaaSToken = async (supabase, { appointmentId, userId, displayName, email, isModerator }) => {
  const { data, error } = await supabase.functions.invoke('generate-jaas-token', {
    body: { appointmentId, userId, displayName, email, isModerator }
  });
  if (error) throw error;
  return data; // { token, roomName, appId }
};