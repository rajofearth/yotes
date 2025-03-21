// src/pages/login.jsx
import { useNavigate } from 'react-router-dom';
import GoogleButton from '../components/ui/google-button';
import { useLoginLogic } from '../hooks/loginLogic';
import { useToast } from '../contexts/ToastContext';

export default function Login() {
  //console.log('Rendering Login component');
  const navigate = useNavigate();
  const showToast = useToast();
  const { isGoogleLoading, handleGoogleLogin } = useLoginLogic(showToast, navigate);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Yotes</h1>
          <p className="text-sm text-text-primary/60">
            Welcome back! Please sign in to continue.
          </p>
        </div>
        <GoogleButton 
          onClick={handleGoogleLogin}
          isLoading={isGoogleLoading}
        />
        <div className="space-y-4 pt-4 border-t border-overlay/10">
          <p className="text-sm text-text-primary/60 text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}