import React, { useState } from 'react';
import { User, GraduationCap, Calendar, Phone, Mail, ArrowRight } from 'lucide-react';
import api from '../services/api';

interface OnboardingData {
  name: string;
  branch: string;
  year: string;
  phone: string;
  googleAccount: string;
}

interface OnboardingProps {
  onComplete: (studentData: OnboardingData) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [name, setName] = useState(() => localStorage.getItem('temp_signup_name') || '');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [phone, setPhone] = useState('');
  const [googleAccount, setGoogleAccount] = useState(
    () => localStorage.getItem('temp_signup_email') || '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!branch) {
      setError('Please select your academic Branch.');
      return;
    }
    if (!year) {
      setError('Please select your Academic Year.');
      return;
    }
    if (!name || !phone || !googleAccount) return;

    setLoading(true);

    try {
      const yearToSemester: Record<string, number> = {
        '1st Year': 1,
        '2nd Year': 3,
        '3rd Year': 5,
        '4th Year': 7,
      };
      const semester = yearToSemester[year] || 1;

      await api.put('/onboard', {
        branch,
        semester,
        attendanceTarget: 75,
      });

      setLoading(false);
      localStorage.removeItem('temp_signup_name');
      localStorage.removeItem('temp_signup_email');

      const studentData = {
        name,
        branch,
        year,
        phone,
        googleAccount,
      };

      localStorage.setItem('campus_onboarded', 'true');
      localStorage.setItem('campus_student_info', JSON.stringify(studentData));

      onComplete(studentData);
    } catch (err) {
      setLoading(false);
      const msg = (err as any).response?.data?.error || (err as Error).message || 'Failed to complete onboarding';
      setError(msg);
    }
  };

  return (
    <div className="min-height-screen flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg bg-card/65 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-8 relative overflow-hidden transition-all duration-300">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary/15 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="mb-6">
            <span className="text-xs font-semibold px-2.5 py-1 bg-accent text-secondary rounded-full inline-block border border-secondary/20 mb-2">
              Step 2 of 2: Profile Onboarding
            </span>
            <h2 className="text-2xl font-bold text-foreground">Welcome to CampusFlow</h2>
            <p className="text-muted-foreground text-sm">
              Please finalize your profile details to establish n8n automation linkages.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-semibold flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-muted/50 border border-border/80 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            {/* Branch and Year Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Branch / Stream
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <GraduationCap className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-muted/50 border border-border/80 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>
                      Select Branch...
                    </option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Civil">Civil</option>
                    <option value="Information Technology">Information Technology</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Academic Year
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-muted/50 border border-border/80 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>
                      Select Year...
                    </option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Phone (for Telegram automation notification) */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Phone Number (For Telegram Reminders)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-muted/50 border border-border/80 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                  placeholder="+91 99999 99999"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                This number triggers smart reminders directly to Telegram via n8n.
              </p>
            </div>

            {/* Google Account (for Calendar sync) */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Google Calendar Account
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <input
                  type="email"
                  value={googleAccount}
                  onChange={(e) => setGoogleAccount(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-muted/50 border border-border/80 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                  placeholder="student@gmail.com"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Automates Google Calendar invites & reminder blocks via Google API.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 bg-secondary hover:bg-secondary/95 text-secondary-foreground text-sm font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <span>Complete Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
