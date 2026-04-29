"use client";
import LoginPage from "@/views/LoginPage";
import { useApp } from "@/context/AppContext";

export default function Login() {
  const { lang, handleAuthSuccess } = useApp();
  return <LoginPage lang={lang} onAuthSuccess={handleAuthSuccess} />;
}
