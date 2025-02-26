import React from 'react';
import { Navigate } from 'react-router-dom';
import SignupForm from '../components/auth/SignupForm';
import { useApp } from '../context/AppContext';

const SignupPage: React.FC = () => {
  const { isAuthenticated } = useApp();
  
  // Redirect if already logged in
  if (isAuthenticated) {
    return <Navigate to="/discover" replace />;
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-600">MassageExchange</h1>
            <p className="text-gray-600 mt-2">Join our community of massage enthusiasts</p>
          </div>
          
          <SignupForm />
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
