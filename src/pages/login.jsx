import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import GoogleButton from '../components/ui/google-button'

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export default function Login({ showToast }) {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            showToast('Successfully logged in!', 'success');
            navigate('/');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    scopes: GOOGLE_DRIVE_SCOPE,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                        include_granted_scopes: 'true'
                    }
                }
            });

            if (error) throw error;
        } catch (error) {
            showToast(error.message, 'error');
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 font-mono">
            <div className="w-full max-w-sm space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">Yotes</h1>
                    <p className="text-sm text-text-primary/60">
                        Welcome back! Please sign in to continue.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-text-primary/80">
                            Email
                        </label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-10 bg-overlay/5 border-overlay/10 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-overlay/20"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-text-primary/80">
                            Password
                        </label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-10 bg-overlay/5 border-overlay/10 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-overlay/20"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-icon-primary hover:text-text-primary"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Button
                            type="submit"
                            className="w-full h-10 bg-overlay/5 hover:bg-overlay/10 text-text-primary border border-overlay/10 rounded-lg transition-colors group"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Signing in...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <span>Sign in</span>
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            )}
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-overlay/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-bg-primary px-2 text-text-primary/60">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <GoogleButton 
                            onClick={handleGoogleLogin}
                            isLoading={isGoogleLoading}
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="space-y-4 pt-4 border-t border-overlay/10">
                    {/* Commented out for now */}
                    {/* <div className="text-center">
                        <a href="/forgot-password" className="text-sm text-text-primary/60 hover:text-text-primary transition-colors">
                            Forgot your password?
                        </a>
                    </div> */}
                    <div className="text-center text-sm text-text-primary/60">
                        Don't have an account?{' '}
                        <a 
                            href="/signup" 
                            className="text-text-primary hover:text-white transition-colors"
                        >
                            Sign up
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
} 