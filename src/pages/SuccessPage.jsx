import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const SuccessPage = () => {
  const location = useLocation();
  // This component is deprecated.
  // The logic is now handled by ConfirmationPage.jsx
  // We redirect to preserve any state that might have been passed.
  return <Navigate to="/confirmacao" state={location.state} replace />;
};

export default SuccessPage;