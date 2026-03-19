import React, { useEffect, useRef } from 'react';

const APP_ID = 'vpaas-magic-cookie-c837d3d52a48449b8d190279cac3b770';

/**
 * JitsiMeetComponent — Embed inline da videochamada JaaS (8x8.vc).
 *
 * Props:
 *   - isOpen {boolean}     Exibe/oculta o componente
 *   - onClose {function}   Callback ao encerrar a chamada
 *   - jaasToken {string}   JWT RS256 gerado pela Edge Function generate-jaas-token
 *   - roomName {string}    Nome completo da sala: "{APP_ID}/clicktele-{appointmentId}"
 *   - appId {string}       JaaS APP_ID (usado como fallback)
 *   - appointment {object} Dados do agendamento (passado para compatibilidade)
 *   - userRole {string}    'doctor' | 'patient'
 */
const JitsiMeetComponent = ({ isOpen, onClose, jaasToken, roomName, appId, appointment, userRole }) => {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !jaasToken || !roomName) return;

    const effectiveAppId = appId || APP_ID;

    const initJitsi = () => {
      // Dispose de qualquer instância anterior
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch (_) {}
      }

      apiRef.current = new window.JitsiMeetExternalAPI('8x8.vc', {
        roomName: roomName, // já inclui o APP_ID prefix: "{APP_ID}/clicktele-{id}"
        parentNode: containerRef.current,
        jwt: jaasToken,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'hangup',
            'chat',
            'settings',
            'fullscreen',
          ],
        },
      });

      apiRef.current.on('readyToClose', () => {
        try { apiRef.current?.dispose(); } catch (_) {}
        onClose?.();
      });
    };

    if (window.JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const script = document.createElement('script');
      script.src = `https://8x8.vc/${effectiveAppId}/external_api.js`;
      script.async = true;
      script.onload = initJitsi;
      script.onerror = () => {
        console.error('Falha ao carregar JitsiMeetExternalAPI script');
      };
      document.head.appendChild(script);
    }

    return () => {
      try { apiRef.current?.dispose(); } catch (_) {}
    };
  }, [isOpen, jaasToken, roomName]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh', background: '#1a1a2e' }}
    />
  );
};

export default JitsiMeetComponent;
