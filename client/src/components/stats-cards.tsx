import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, FileText, PillBottle, Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DashboardStats } from "@shared/schema";

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Outstanding",
      value: formatCurrency(stats.totalOutstanding),
      change: `+${stats.outstandingChange}% from last month`,
      changeType: "negative" as const,
      icon: AlertTriangle,
      iconColor: "text-urgent-red",
      iconBg: "bg-urgent-red/10",
    },
    {
      title: "Revenue This Month",
      value: formatCurrency(stats.monthlyRevenue),
      change: `+${stats.revenueChange}% from last month`,
      changeType: "positive" as const,
      icon: DollarSign,
      iconColor: "text-success-green",
      iconBg: "bg-success-green/10",
    },
    {
      title: "Pending Invoices",
      value: stats.pendingInvoices.toString(),
      change: `${formatCurrency(stats.pendingAmount)} pending payment`,
      changeType: "neutral" as const,
      icon: FileText,
      iconColor: "text-soft-blue",
      iconBg: "bg-soft-blue/10",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems.toString(),
      change: "Items requiring restock",
      changeType: stats.lowStockItems > 0 ? "negative" as const : "positive" as const,
      icon: PillBottle,
      iconColor: stats.lowStockItems > 0 ? "text-urgent-red" : "text-success-green",
      iconBg: stats.lowStockItems > 0 ? "bg-urgent-red/10" : "bg-success-green/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const ChangeIcon = card.changeType === "positive" ? TrendingUp : TrendingDown;
        
        return (
          <Card key={index} className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-professional-dark mt-2">{card.value}</p>
                  <p className={`text-sm mt-1 flex items-center ${
                    card.changeType === "positive" ? "text-success-green" : 
                    card.changeType === "negative" ? "text-urgent-red" : "text-gray-500"
                  }`}>
                    {card.changeType !== "neutral" && <ChangeIcon className="mr-1" size={12} />}
                    {card.change}
                  </p>
                </div>
                <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${card.iconColor}`} size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
