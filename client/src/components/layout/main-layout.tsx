import { ReactNode } from "react";
import Sidebar from "./sidebar";
import Header from "./header";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex bg-clinical-white">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        {children}
      </main>
    </div>
  );
}
