"use client";
import LoginPage from "@/views/LoginPage";
import CookieConsent from "@/components/CookieConsent";
import { useApp } from "@/context/AppContext";

export default function Login() {
  const { lang, handleAuthSuccess } = useApp();
  return (
    <>
      <LoginPage lang={lang} onAuthSuccess={handleAuthSuccess} />
      <CookieConsent />
    </>
  );
}
