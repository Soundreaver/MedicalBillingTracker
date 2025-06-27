import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, FileText, AlertTriangle, UserPlus } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

// Mock recent activities - in a real app, this would come from an API
const recentActivities = [
  {
    id: 1,
    type: "payment",
    title: "Payment received from Md. Rahman",
    description: "Invoice #INV-2024-001 - ৳ 15,500",
    timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    icon: Check,
    iconColor: "text-success-green",
    iconBg: "bg-success-green/10",
  },
  {
    id: 2,
    type: "invoice",
    title: "New invoice created for Mrs. Fatima",
    description: "Room charges & medications - ৳ 8,750",
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    icon: FileText,
    iconColor: "text-medical-teal",
    iconBg: "bg-medical-teal/10",
  },
  {
    id: 3,
    type: "alert",
    title: "Low stock alert: Paracetamol 500mg",
    description: "Only 45 units remaining",
    timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    icon: AlertTriangle,
    iconColor: "text-urgent-red",
    iconBg: "bg-urgent-red/10",
  },
  {
    id: 4,
    type: "patient",
    title: "New patient registered: Ahmed Hassan",
    description: "Patient ID: PAT-2024-0432",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    icon: UserPlus,
    iconColor: "text-soft-blue",
    iconBg: "bg-soft-blue/10",
  },
];

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}

export default function RecentActivity() {
  return (
    <Card className="border border-gray-200">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-professional-dark">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" className="text-medical-teal hover:text-soft-blue">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {recentActivities.map((activity) => {
            const Icon = activity.icon;
            
            return (
              <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className={`w-10 h-10 ${activity.iconBg} rounded-full flex items-center justify-center`}>
                  <Icon className={activity.iconColor} size={16} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-professional-dark">{activity.title}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{getTimeAgo(activity.timestamp)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
