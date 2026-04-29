"use client";
import RegisterPage from "@/views/RegisterPage";
import { useApp } from "@/context/AppContext";

export default function Register() {
  const { lang, handleAuthSuccess } = useApp();
  return <RegisterPage lang={lang} onAuthSuccess={handleAuthSuccess} />;
}
