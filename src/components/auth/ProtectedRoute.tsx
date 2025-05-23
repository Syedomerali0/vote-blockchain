import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: 'admin' | 'voter';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  

//   if (!isAuthenticated) {
//     // Redirect to the appropriate login page
//     return <Navigate to={`/${requiredRole}/login`} state={{ from: location }} replace />;
//   }

  // Check if user has the required role
//   if (userType !== requiredRole) {
//     // Redirect to home if user doesn't have the required role
//     return <Navigate to="/" replace />;
//   }

  return <>{children}</>;
};

export default ProtectedRoute;
