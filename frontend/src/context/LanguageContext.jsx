import { createContext, useContext, useState, useCallback } from 'react';
import translations from '../translations';

const LanguageContext = createContext(null);

const LOCALE_MAP = {
  en: 'en-US',
  ru: 'ru-RU',
  uz: 'uz-UZ'
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en');

  const setLang = useCallback((code) => {
    setLangState(code);
    localStorage.setItem('lang', code);
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] || translations.en?.[key] || key;
  }, [lang]);

  const locale = LOCALE_MAP[lang] || 'en-US';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, locale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
