import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import { useLocation } from 'react-router-dom';


export function AuthPage() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="mb-4">
        <button
          className={`px-4 py-2 rounded-l ${isLogin ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => window.location.href = '/login'}
        >
          Login
        </button>
        <button
          className={`px-4 py-2 rounded-r ${!isLogin ? "bg-green-600 text-white" : "bg-gray-200"}`}
          onClick={() => window.location.href = '/register'}
        >
          Sign Up
        </button>
      </div>
      {isLogin ? <LoginForm /> : <RegisterForm />}
    </div>
  );
}