import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export default function Signup({ showToast }) {
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                    },
                },
            });

            if (error) throw error;

            showToast('Check your email to confirm your account!', 'success');


            navigate('/login');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 font-mono">
            <div className="w-full max-w-sm space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
                    <p className="text-sm text-text-primary/60">
                        Enter your details to get started
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-text-primary/80">
                            Name
                        </label>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={handleChange}
                            className="h-10 bg-overlay/5 border-overlay/10 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-overlay/20"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-text-primary/80">
                            Email
                        </label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="name@example.com"
                            value={formData.email}
                            onChange={handleChange}
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
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
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
                        <p className="text-xs text-text-primary/60">
                            Must be at least 8 characters long
                        </p>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-10 bg-overlay/5 hover:bg-overlay/10 text-text-primary border border-overlay/10 rounded-lg transition-colors group"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Creating account...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <span>Create account</span>
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        )}
                    </Button>
                </form>

                {/* Footer */}
                <div className="space-y-4 pt-4 border-t border-overlay/10">
                    <div className="text-center text-sm text-text-primary/60">
                        Already have an account?{' '}
                        <a 
                            href="/login" 
                            className="text-text-primary hover:text-white transition-colors"
                        >
                            Sign in
                        </a>
                    </div>

                    {/* Terms */}
                    <p className="text-xs text-center text-text-primary/60">
                        By creating an account, you agree to our{' '}
                        <a href="/terms" className="underline hover:text-text-primary">
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="underline hover:text-text-primary">
                            Privacy Policy
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
} 