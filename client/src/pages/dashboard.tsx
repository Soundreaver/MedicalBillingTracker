import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, Package, BarChart3, Clock } from "lucide-react";
import StatsCards from "@/components/stats-cards";
import RecentActivity from "@/components/recent-activity";
import OutstandingInvoicesTable from "@/components/outstanding-invoices-table";
import { DashboardStats, RoomOccupancy, Medicine } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import CreateInvoiceModal from "@/components/modals/create-invoice-modal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const { toast } = useToast();

  const processDailyChargesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rooms/process-daily-charges");
      return await response.json();
    },
    onSuccess: (data: { processed: number; totalCharges: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({
        title: "Daily Charges Processed",
        description: `Updated ${data.processed} room(s) with total charges of ${formatCurrency(data.totalCharges.toString())}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process daily room charges",
        variant: "destructive",
      });
    },
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: roomOccupancy } = useQuery<RoomOccupancy>({
    queryKey: ["/api/rooms/occupancy"],
  });

  const { data: lowStockMedicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines/low-stock"],
  });

  if (!stats || !roomOccupancy) {
    return <div>Loading...</div>;
  }

  const quickActions = [
    {
      title: "Create New Invoice",
      description: "Generate invoice for patient services",
      icon: Plus,
      color: "bg-medical-teal",
      onClick: () => setShowCreateInvoice(true),
    },
    {
      title: "Record Payment",
      description: "Add payment for existing invoice",
      icon: CreditCard,
      color: "bg-soft-blue",
      onClick: () => {},
    },
    {
      title: "Manage Inventory",
      description: "Update medicine stock levels",
      icon: Package,
      color: "bg-success-green",
      onClick: () => {},
    },
    {
      title: "Process Daily Charges",
      description: roomOccupancy.occupied > 0 
        ? `Update charges for ${roomOccupancy.occupied} occupied room(s)`
        : "No occupied rooms to process",
      icon: Clock,
      color: roomOccupancy.occupied > 0 ? "bg-purple-500" : "bg-gray-400",
      onClick: roomOccupancy.occupied > 0 ? () => processDailyChargesMutation.mutate() : undefined,
    },
  ];

  return (
    <div className="space-y-8">
      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-professional-dark">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-between p-4 h-auto"
                    onClick={action.onClick}
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center mr-3`}>
                        <Icon className="text-white" size={16} />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-professional-dark">{action.title}</div>
                        <div className="text-sm text-gray-500">{action.description}</div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>

      {/* Outstanding Invoices */}
      <OutstandingInvoicesTable />

      {/* Medicine Inventory & Room Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Medicine Inventory Alerts */}
        <Card className="border border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-professional-dark">Medicine Inventory Alerts</CardTitle>
              <Button variant="ghost" size="sm" className="text-medical-teal hover:text-soft-blue">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {lowStockMedicines.slice(0, 3).map((medicine) => (
                <div 
                  key={medicine.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    medicine.stockQuantity <= 10 
                      ? 'bg-urgent-red/5 border-urgent-red/20' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                      medicine.stockQuantity <= 10 
                        ? 'bg-urgent-red/10' 
                        : 'bg-yellow-100'
                    }`}>
                      <Package className={medicine.stockQuantity <= 10 ? 'text-urgent-red' : 'text-yellow-600'} size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-professional-dark">{medicine.name}</p>
                      <p className="text-sm text-gray-600">
                        Stock: <span className={`font-medium ${medicine.stockQuantity <= 10 ? 'text-urgent-red' : 'text-yellow-600'}`}>
                          {medicine.stockQuantity} {medicine.unit}
                        </span>
                      </p>
                    </div>
                  </div>

                </div>
              ))}
              
              {lowStockMedicines.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No low stock alerts</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Room Occupancy Status */}
        <Card className="border border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-professional-dark">Room Occupancy Status</CardTitle>
              <Button variant="ghost" size="sm" className="text-medical-teal hover:text-soft-blue">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Total Rooms</span>
                <span className="text-sm font-bold text-professional-dark">{roomOccupancy.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Occupied</span>
                <span className="text-sm font-bold text-urgent-red">{roomOccupancy.occupied}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Available</span>
                <span className="text-sm font-bold text-success-green">{roomOccupancy.available}</span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Occupancy Rate</span>
                  <span className="text-sm font-bold text-professional-dark">{roomOccupancy.occupancyRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-medical-teal h-2 rounded-full" 
                    style={{ width: `${roomOccupancy.occupancyRate}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-professional-dark mb-3">Room Types</h4>
                <div className="space-y-2">
                  {roomOccupancy.roomTypes.map((type, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{type.name}</span>
                      <span className="text-sm font-medium text-professional-dark">
                        {type.occupied}/{type.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateInvoiceModal
        isOpen={showCreateInvoice}
        onClose={() => setShowCreateInvoice(false)}
      />
    </div>
  );
}
