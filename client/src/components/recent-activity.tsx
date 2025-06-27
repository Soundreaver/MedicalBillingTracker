import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, FileText, AlertTriangle, UserPlus, Package, Bed, Settings } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { ActivityLog } from "@shared/schema";

const getActivityIcon = (type: string) => {
  switch (type) {
    case "payment":
      return Check;
    case "invoice":
      return FileText;
    case "patient":
      return UserPlus;
    case "medicine":
      return Package;
    case "room":
      return Bed;
    case "alert":
      return AlertTriangle;
    default:
      return Settings;
  }
};

const getActivityStyle = (type: string) => {
  switch (type) {
    case "payment":
      return {
        iconColor: "text-success-green",
        iconBg: "bg-success-green/10",
      };
    case "invoice":
      return {
        iconColor: "text-medical-teal",
        iconBg: "bg-medical-teal/10",
      };
    case "patient":
      return {
        iconColor: "text-soft-blue",
        iconBg: "bg-soft-blue/10",
      };
    case "medicine":
      return {
        iconColor: "text-purple-600",
        iconBg: "bg-purple-600/10",
      };
    case "room":
      return {
        iconColor: "text-orange-600",
        iconBg: "bg-orange-600/10",
      };
    case "alert":
      return {
        iconColor: "text-urgent-red",
        iconBg: "bg-urgent-red/10",
      };
    default:
      return {
        iconColor: "text-gray-600",
        iconBg: "bg-gray-600/10",
      };
  }
};

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
  const { data: activities = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-semibold text-professional-dark">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-300 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

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
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No recent activity</p>
            <p className="text-sm text-gray-400">Activity will appear here as you use the system</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const style = getActivityStyle(activity.type);
              
              return (
                <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`w-10 h-10 ${style.iconBg} rounded-full flex items-center justify-center`}>
                    <Icon className={style.iconColor} size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-professional-dark">{activity.title}</p>
                    {activity.description && (
                      <p className="text-sm text-gray-600">{activity.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{getTimeAgo(new Date(activity.createdAt))}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
