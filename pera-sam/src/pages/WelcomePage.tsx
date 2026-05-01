import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeScreen } from '@/components/WelcomeScreen';

export const WelcomePage = () => {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // Ensuring the welcome screen plays for the user during this session
    localStorage.setItem('pera-sam-last-welcome', Date.now().toString());
  }, []);

  const handleComplete = () => {
    setShowWelcome(false);
    navigate('/dashboard');
  };

  if (!showWelcome) {
    return null;
  }

  return <WelcomeScreen onComplete={handleComplete} />;
};
