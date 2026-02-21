import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeScreen } from '@/components/WelcomeScreen';

export const WelcomePage = () => {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // Check if user has seen welcome screen recently
    const lastWelcome = localStorage.getItem('pera-sam-last-welcome');
    const now = Date.now();
    
    if (lastWelcome && now - parseInt(lastWelcome) < 3600000) {
      // Skip welcome if seen within last hour
      navigate('/dashboard');
      return;
    }
    
    localStorage.setItem('pera-sam-last-welcome', now.toString());
  }, [navigate]);

  const handleComplete = () => {
    setShowWelcome(false);
    navigate('/dashboard');
  };

  if (!showWelcome) {
    return null;
  }

  return <WelcomeScreen onComplete={handleComplete} />;
};
