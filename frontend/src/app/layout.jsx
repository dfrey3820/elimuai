import { Raleway, Roboto } from "next/font/google";
import Script from "next/script";
import { AppProvider } from "@/context/AppContext";
import "@/styles.css";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-heading",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "ElimuAI — Elimu · Ujuzi · Mafanikio",
  description:
    "ElimuAI — AI-powered learning for East Africa. Kenya CBC, Tanzania, Uganda.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ElimuAI",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${raleway.variable} ${roboto.variable}`}>
      <body
        className={roboto.className}
        style={{ margin: 0, padding: 0, background: "#FFFFFF" }}
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YYRWH5WLYK"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-YYRWH5WLYK');`}
        </Script>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
