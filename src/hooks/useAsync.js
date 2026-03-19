import React, { useState, useCallback, useEffect } from 'react';

const useAsync = (asyncFunction, immediate = true) => {
  const [status, setStatus] = useState("idle");
  const [value, setValue] = useState(null);
  const [error, setError] = useState(null);
  const [retries, setRetries] = useState(0);

  const execute = useCallback(async (...args) => {
    setStatus("pending");
    setValue(null);
    setError(null);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("A requisição demorou muito para responder. Verifique sua conexão.")), 20000)
    );

    try {
      const response = await Promise.race([asyncFunction(...args), timeoutPromise]);
      setValue(response);
      setStatus("success");
      setRetries(0);
      return response;
    } catch (error) {
      console.error("useAsync error:", error);
      setError(error);
      setStatus("error");
      throw error;
    }
  }, [asyncFunction]);

  const retry = useCallback(() => {
    if (retries < 3) {
        setRetries(r => r + 1);
        const delay = Math.pow(1.5, retries) * 1000;
        setTimeout(() => execute(), delay);
    } else {
        setError(new Error("Não foi possível carregar os dados após várias tentativas."));
        setStatus("error");
    }
  }, [execute, retries]);

  useEffect(() => {
    if (immediate && status === 'idle') {
      execute();
    }
  }, [execute, immediate, status]);

  return { execute, retry, status, value, error, setValue };
};

export default useAsync;