"use client";
import LoginPage from "@/views/LoginPage";
import CookieConsent from "@/components/CookieConsent";
import { useApp } from "@/context/AppContext";

export default function Login() {
  const { lang, setLang, handleAuthSuccess } = useApp();
  return (
    <>
      <LoginPage lang={lang} setLang={setLang} onLogin={handleAuthSuccess} />
      <CookieConsent />
    </>
  );
}
