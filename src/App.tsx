import { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';

interface StudentInfo {
  name: string;
  branch: string;
  year: string;
  phone: string;
  googleAccount: string;
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('campus_token'));
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('campus_onboarded') === 'true';
  });
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(() => {
    const saved = localStorage.getItem('campus_student_info');
    return saved ? JSON.parse(saved) : null;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Check if the html class list already contains dark, or check media pref
    return (
      document.documentElement.classList.contains('dark') ||
      (!('color-scheme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  // Effect to toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('color-scheme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('color-scheme', 'light');
    }
  }, [darkMode]);

  // Effect to listen for "d" key anywhere on the document
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle theme if "d" or "D" is pressed
      // Ignore if user is typing in input or textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (event.key.toLowerCase() === 'd') {
        setDarkMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleAuthSuccess = (newToken: string, needsOnboarding: boolean) => {
    setToken(newToken);
    if (needsOnboarding) {
      setIsOnboarded(false);
      localStorage.setItem('campus_onboarded', 'false');
    } else {
      setIsOnboarded(true);
      localStorage.setItem('campus_onboarded', 'true');
      const savedInfo = localStorage.getItem('campus_student_info');
      if (savedInfo) {
        setStudentInfo(JSON.parse(savedInfo));
      } else {
        const defaultInfo = {
          name: 'Alex Mercer',
          branch: 'Computer Science',
          year: '3rd Year',
          phone: '+1 (555) 019-2834',
          googleAccount: 'alex.mercer.academic@gmail.com',
        };
        setStudentInfo(defaultInfo);
        localStorage.setItem('campus_student_info', JSON.stringify(defaultInfo));
      }
    }
  };

  const handleOnboardingComplete = (info: StudentInfo) => {
    const currentToken = localStorage.getItem('campus_token') || token;
    const isMock = !currentToken || currentToken.startsWith('temp_token_');
    const properToken = isMock
      ? `auth_token_${Math.random().toString(36).substring(2, 15)}`
      : currentToken!;

    setToken(properToken);
    setIsOnboarded(true);
    setStudentInfo(info);

    localStorage.setItem('campus_token', properToken);
    localStorage.setItem('campus_onboarded', 'true');
    localStorage.setItem('campus_student_info', JSON.stringify(info));
  };

  const handleLogout = () => {
    setToken(null);
    setIsOnboarded(false);
    setStudentInfo(null);
    localStorage.removeItem('campus_token');
    localStorage.removeItem('campus_onboarded');
    localStorage.removeItem('campus_student_info');
  };

  // Determine current routing view
  const renderView = () => {
    if (!token) {
      return <Auth onAuthSuccess={handleAuthSuccess} />;
    }

    if (!isOnboarded) {
      return <Onboarding onComplete={handleOnboardingComplete} />;
    }

    // Otherwise, render full Dashboard console
    return (
      <Dashboard
        onLogout={handleLogout}
        studentInfo={
          studentInfo || {
            name: 'Academic Student',
            branch: 'Engineering',
            year: 'Graduate',
            phone: '+91 9999999999',
            googleAccount: 'student@campusflow.in',
          }
        }
      />
    );
  };

  return <div className="flex-1 flex flex-col min-h-screen">{renderView()}</div>;
}

export default App;
