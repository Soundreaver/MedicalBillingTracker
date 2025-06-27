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
      <main className="flex-1 ml-64 overflow-x-auto">
        <Header />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
