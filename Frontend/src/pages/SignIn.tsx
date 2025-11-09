import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowLeft, BarChart3 } from 'lucide-react';
import { ProceduralBackground } from '../components/ProceduralBackground';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useToast } from '../hooks/useToast';

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      const message = error.message || 'Unable to sign in with the provided credentials.';
      setError(message);
      showToast({
        title: 'Sign-in failed',
        description: message,
        variant: 'error',
      });
      setLoading(false);
    } else {
      showToast({
        title: 'Welcome back!',
        variant: 'success',
      });
      setLoading(false);
      navigate('dashboard');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ProceduralBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <button
            onClick={() => navigate('landing')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>

          <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
                <p className="text-sm text-slate-400">Sign in to your account</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('signup')}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
