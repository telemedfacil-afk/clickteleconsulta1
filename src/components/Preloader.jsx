import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLoader } from '@/contexts/LoaderContext';

const Preloader = () => {
  const { isVisible, progress, hideLoader } = useLoader();

  useEffect(() => {
    // Handle initial page load
    const handleLoad = () => {
      setTimeout(() => {
        hideLoader();
      }, 500);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, [hideLoader]);

  // If not visible and animation is done (progress 0), don't render
  if (!isVisible && progress === 0) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-200",
        !isVisible && "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col items-center w-full max-w-[420px] px-4 space-y-6">
        <img 
          src="https://horizons-cdn.hostinger.com/678b5778-a611-4960-82cc-681a679036f7/7054d8417c80717d153aed7ff7ebc683.png" 
          alt="Logo" 
          className="h-24 w-auto object-contain animate-in fade-in zoom-in duration-500 mb-4" 
        />
        
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-sm font-medium text-gray-400 animate-pulse">
          Carregando...
        </p>
      </div>
    </div>
  );
};

export default Preloader;