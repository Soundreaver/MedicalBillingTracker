import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Package } from "lucide-react";
import StatsCards from "@/components/stats-cards";
import RecentActivity from "@/components/recent-activity";
import OutstandingInvoicesTable from "@/components/outstanding-invoices-table";
import { DashboardStats, RoomOccupancy, Medicine } from "@shared/schema";

export default function Dashboard() {

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

  return (
    <div className="space-y-8">
      <StatsCards stats={stats} />

      {/* Recent Activity */}
      <RecentActivity />

      {/* Outstanding Invoices */}
      <OutstandingInvoicesTable />

      {/* Medicine Inventory & Room Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Medicine Inventory Alerts */}
        <Card className="border border-gray-200">
          <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-professional-dark">Medicine Inventory Alerts</CardTitle>
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
              <CardTitle className="text-lg font-semibold text-professional-dark">Room Occupancy Status</CardTitle>
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

    </div>
  );
}