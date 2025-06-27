import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Users,
  FileText,
  CreditCard,
  PillBottle,
  Bed,
  ChartBar,
  Settings,
  LogOut,
  Hospital,
} from "lucide-react";

const mainMenuItems = [
  { path: "/", label: "Dashboard", icon: BarChart3 },
  { path: "/patients", label: "Patients", icon: Users },
  { path: "/billing", label: "Billing & Invoices", icon: FileText },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/inventory", label: "Medicine Inventory", icon: PillBottle },
  { path: "/rooms", label: "Room Management", icon: Bed },
];

const accountItems = [{ path: "/settings", label: "Settings", icon: Settings }];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 fixed h-full z-10">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-medical-teal rounded-lg flex items-center justify-center">
            <Hospital className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-professional-dark">
              Mirror Hospital
            </h1>
            <p className="text-sm text-gray-500">Billing Management</p>
          </div>
        </div>
      </div>

      <nav className="mt-6">
        <div className="px-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Main Menu
          </p>
        </div>
        <div className="mt-4 space-y-1">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-medical-teal transition-colors cursor-pointer relative",
                    isActive &&
                      "text-medical-teal bg-medical-teal/10 border-r-4 border-medical-teal font-semibold",
                  )}
                >
                  <Icon className="mr-3" size={18} />
                  <span className="font-medium truncate">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="px-6 mt-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Account
          </p>
        </div>
        <div className="mt-4 space-y-1">
          {accountItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.path} href={item.path}>
                <div className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-medical-teal transition-colors cursor-pointer">
                  <Icon className="mr-3" size={18} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
          <button className="w-full flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-medical-teal transition-colors">
            <LogOut className="mr-3" size={18} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
