import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/patients": "Patients",
  "/billing": "Billing & Invoices",
  "/payments": "Payments",
  "/inventory": "Medicine Inventory",
  "/rooms": "Room Management",
};

const pageDescriptions: Record<string, string> = {
  "/": "Hospital Billing Management Overview",
  "/patients": "Manage patient information and billing history",
  "/billing": "Create and manage invoices for patients",
  "/payments": "Track and record payment transactions",
  "/inventory": "Monitor medicine stock and inventory levels",
  "/rooms": "Manage room occupancy and charges",
};

export default function Header() {
  const [location] = useLocation();
  
  const pageName = pageNames[location] || "Page";
  const pageDescription = pageDescriptions[location] || "";

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-professional-dark">{pageName}</h2>
          {pageDescription && (
            <p className="text-gray-600 mt-1">{pageDescription}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-gray-400" />
            <span className="absolute top-0 right-0 w-3 h-3 bg-urgent-red rounded-full"></span>
          </Button>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-professional-dark">Dr. Sarah Ahmed</p>
              <p className="text-xs text-gray-500">Billing Administrator</p>
            </div>
            <div className="w-10 h-10 bg-medical-teal rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">SA</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
