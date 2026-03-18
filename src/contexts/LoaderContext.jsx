import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LoaderContext = createContext();

export const LoaderProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  const showLoader = useCallback(() => {
    setIsVisible(true);
    setProgress(0);
  }, []);

  const hideLoader = useCallback(() => {
    setProgress(100);
    setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 200); // 200ms fade out delay matching CSS transition
  }, []);

  useEffect(() => {
    let interval;
    if (isVisible && progress < 90) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          // Random increment between 1 and 10
          return prev + Math.random() * 10;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isVisible, progress]);

  return (
    <LoaderContext.Provider value={{ isVisible, progress, showLoader, hideLoader }}>
      {children}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
};