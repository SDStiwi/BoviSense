import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC = () => {
  const { language, toggleLanguage } = useTheme();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title={language === 'en' ? 'العربية' : 'English'}
    >
      <Globe className="w-4 h-4" />
      <span className="text-sm font-medium">{language === 'en' ? 'AR' : 'EN'}</span>
    </button>
  );
};