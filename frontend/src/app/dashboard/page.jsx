"use client";
import dynamic from "next/dynamic";

// Import the original monolithic App component for the dashboard
// This will be incrementally refactored into separate components
const ElimuAI = dynamic(() => import("@/App"), { ssr: false });

export default function DashboardPage() {
  return <ElimuAI />;
}
