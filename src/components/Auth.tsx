import React, { useState } from 'react';
import { Lock, Mail, User, ShieldAlert } from 'lucide-react';
import api from '../services/api';

interface AuthProps {
  onAuthSuccess: (token: string, needsOnboarding: boolean) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginEmail || !loginPassword) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/login', {
        email: loginEmail,
        password: loginPassword,
      });

      const data = response.data as {
        token: string;
        user: {
          name: string;
          email: string;
          branch?: string;
          semester?: number;
          attendanceTarget?: number;
        };
      };

      setLoading(false);
      localStorage.setItem('campus_token', data.token);

      const needsOnboarding =
        !data.user.branch || !data.user.semester || data.user.attendanceTarget === undefined;
      localStorage.setItem('campus_onboarded', needsOnboarding ? 'false' : 'true');

      localStorage.setItem('campus_user_name', data.user.name);
      localStorage.setItem('campus_user_email', data.user.email);

      if (!needsOnboarding) {
        const yearToText: Record<number, string> = {
          1: '1st Year',
          2: '1st Year',
          3: '2nd Year',
          4: '2nd Year',
          5: '3rd Year',
          6: '3rd Year',
          7: '4th Year',
          8: '4th Year',
        };
        const studentInfo = {
          name: data.user.name,
          branch: data.user.branch || '',
          year: yearToText[data.user.semester || 1] || '1st Year',
          phone: '',
          googleAccount: data.user.email,
        };
        localStorage.setItem('campus_student_info', JSON.stringify(studentInfo));
      }

      onAuthSuccess(data.token, needsOnboarding);
    } catch (err) {
      setLoading(false);
      const msg = (err as any).response?.data?.error || (err as Error).message || 'Invalid email or password';
      setError(msg);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!signupName || !signupEmail || !signupPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/signup', {
        name: signupName,
        email: signupEmail,
        password: signupPassword,
      });

      const data = response.data as {
        token: string;
        user: { name: string; email: string };
      };

      setLoading(false);
      localStorage.setItem('campus_token', data.token);
      localStorage.setItem('campus_onboarded', 'false');

      localStorage.setItem('campus_user_name', data.user.name);
      localStorage.setItem('campus_user_email', data.user.email);

      localStorage.setItem('temp_signup_name', data.user.name);
      localStorage.setItem('temp_signup_email', data.user.email);

      onAuthSuccess(data.token, true);
    } catch (err) {
      setLoading(false);
      const msg = (err as any).response?.data?.error || (err as Error).message || 'Failed to sign up';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center px-4 py-8 bg-background transition-colors duration-300">
      {/* Centered Card Wrapper */}
      <div className="my-auto w-full max-w-md bg-card border border-border shadow-lg rounded-xl overflow-hidden transition-all duration-300">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground m-0">
              CampusFlow
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Smart Academic Platform & Automations
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => {
                setActiveTab('login');
                setError('');
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-all relative ${
                activeTab === 'login'
                  ? 'text-secondary border-b-2 border-secondary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                setError('');
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-all relative ${
                activeTab === 'signup'
                  ? 'text-secondary border-b-2 border-secondary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                    placeholder="Enter your college email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-secondary hover:bg-secondary/95 text-secondary-foreground text-sm font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                ) : (
                  <span>Login</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                    placeholder="Enter your college email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                    placeholder="Create a password (min. 8 chars)"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                    placeholder="Re-enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-secondary hover:bg-secondary/95 text-secondary-foreground text-sm font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                ) : (
                  <span>Signup</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Press 'd' to toggle theme prompt, placed at the bottom of the screen */}
      <div className="text-center pb-2 select-none">
        <span className="text-[11px] text-muted-foreground px-3 py-1 bg-muted rounded-full inline-block border border-border/80">
          Press <kbd className="font-bold border px-1.5 py-0.5 rounded bg-card">d</kbd> anywhere to
          toggle theme
        </span>
      </div>
    </div>
  );
};
