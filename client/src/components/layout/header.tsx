import { useLocation } from "wouter";
import { Bell, LogOut, User, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/theme-provider";
import { getInitials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { user, logout, isLoggingOut } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const pageName = pageNames[location] || "Page";
  const pageDescription = pageDescriptions[location] || "";

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.username || "User";

  const roleDisplay = user?.role === "admin" ? "Administrator" : "Doctor";
  const userInitials = getInitials(displayName);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 h-auto p-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-professional-dark">{displayName}</p>
                  <p className="text-xs text-gray-500">{roleDisplay}</p>
                </div>
                <div className="w-10 h-10 bg-medical-teal rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">{userInitials}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
