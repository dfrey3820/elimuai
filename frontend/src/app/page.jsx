"use client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LandingPage from "@/views/LandingPage";
import { useApp } from "@/context/AppContext";

export default function Home() {
  const { lang } = useApp();
  return (
    <>
      <Header lang={lang} />
      <LandingPage lang={lang} />
      <Footer lang={lang} />
    </>
  );
}
