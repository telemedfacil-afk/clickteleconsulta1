/**
 * @deprecated
 * This hook is deprecated. Use buildJitsiRoomId and openJitsiRoom from src/utils instead.
 * 
 * Logic has been moved to src/utils/jitsiRoomId.js and src/utils/telemedicineUtils.js
 * to ensure deterministic room IDs and consistent behavior across the app.
 */
export const useJitsiRoom = () => {
  console.warn("useJitsiRoom hook is deprecated and should not be used.");
  return {
    generateRoomInfo: () => ({ roomName: '', password: '' }),
    openRoom: () => {},
    closeRoom: () => {},
    jitsiState: { isOpen: false, appointment: null, role: null },
    error: null
  };
};