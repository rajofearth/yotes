import { useNavigate } from 'react-router-dom';
import GoogleButton from '../../components/ui/google-button';
import { useLoginLogic } from '../../hooks/loginLogic';
import { useToast } from '../../contexts/ToastContext';
import { useOnlineStatus } from '../../contexts/OnlineStatusContext';

export default function Login() {
  const navigate = useNavigate();
  const showToast = useToast();
  const isOnline = useOnlineStatus();
  const { isGoogleLoading, handleGoogleLogin } = useLoginLogic(showToast, navigate);

  const attemptLogin = () => {
    if (!isOnline) {
      showToast("Cannot log in while offline.", "error");
      return;
    }
    handleGoogleLogin();
  }

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
          onClick={attemptLogin}
          isLoading={isGoogleLoading}
          disabled={!isOnline || isGoogleLoading}
          className={!isOnline ? 'opacity-50 cursor-not-allowed' : ''}
        />
         {!isOnline && (
            <p className="text-center text-yellow-500 text-xs -mt-4">
                Offline - Connect to the internet to log in.
            </p>
         )}
        <div className="space-y-4 pt-4 border-t border-overlay/10">
          <p className="text-sm text-text-primary/60 text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}