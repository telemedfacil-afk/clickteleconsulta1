import React from 'react';
import { Navigate } from 'react-router-dom';

const CheckoutRedirect = () => {
  // This component is deprecated and now redirects to the main checkout page.
  // The logic has been moved to CheckoutPage.jsx
  return <Navigate to="/checkout" replace />;
};

export default CheckoutRedirect;