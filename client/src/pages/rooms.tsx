import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Bed, Users, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Room, RoomOccupancy, Patient, InvoiceWithDetails } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AssignPatientModal from "@/components/modals/assign-patient-modal";
import PaymentModal from "@/components/modals/payment-modal";

export default function Rooms() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRoomForAssignment, setSelectedRoomForAssignment] = useState<Room | null>(null);
  const [selectedRoomForCheckout, setSelectedRoomForCheckout] = useState<Room | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { toast } = useToast();

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: occupancy } = useQuery<RoomOccupancy>({
    queryKey: ["/api/rooms/occupancy"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: invoices = [] } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Room> }) => {
      const response = await apiRequest("PUT", `/api/rooms/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/occupancy"] });
      toast({
        title: "Success",
        description: "Room updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update room",
        variant: "destructive",
      });
    },
  });

  const roomTypes = rooms.reduce((acc: string[], room) => {
    if (!acc.includes(room.roomType)) {
      acc.push(room.roomType);
    }
    return acc;
  }, []);
  
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.roomType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || room.roomType === typeFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "occupied" && room.isOccupied) ||
                         (statusFilter === "available" && !room.isOccupied);
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleRoomStatusToggle = (room: Room) => {
    if (room.isOccupied) {
      // For checkout, find the outstanding invoice for this patient and room
      const outstandingInvoice = invoices.find(invoice => 
        invoice.patientId === room.currentPatientId && 
        invoice.outstandingAmount > 0 &&
        invoice.items.some(item => item.itemType === 'room' && item.itemId === room.id)
      );

      if (outstandingInvoice) {
        // Show payment modal for the outstanding invoice
        setSelectedRoomForCheckout(room);
        setShowPaymentModal(true);
      } else {
        // No outstanding invoice, just checkout
        updateRoomMutation.mutate({
          id: room.id,
          data: { 
            isOccupied: false,
            currentPatientId: null
          }
        });
      }
    } else {
      // This shouldn't happen as we only show assign button for available rooms
      // But keeping for safety
      updateRoomMutation.mutate({
        id: room.id,
        data: { 
          isOccupied: true,
          currentPatientId: room.currentPatientId
        }
      });
    }
  };

  const handlePaymentComplete = () => {
    // After payment, checkout the room
    if (selectedRoomForCheckout) {
      updateRoomMutation.mutate({
        id: selectedRoomForCheckout.id,
        data: { 
          isOccupied: false,
          currentPatientId: null
        }
      });
    }
    setShowPaymentModal(false);
    setSelectedRoomForCheckout(null);
  };

  const getPatientName = (patientId: number | null) => {
    if (!patientId) return null;
    const patient = patients.find(p => p.id === patientId);
    return patient?.name || "Unknown Patient";
  };

  const totalRevenue = rooms
    .filter(room => room.isOccupied)
    .reduce((sum, room) => sum + parseFloat(room.dailyRate), 0);

  if (isLoading) {
    return <div className="flex justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-professional-dark">Room Management</h1>
          <p className="text-gray-600">Manage room occupancy and patient assignments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                <p className="text-2xl font-bold text-professional-dark mt-2">{rooms.length}</p>
              </div>
              <div className="w-12 h-12 bg-medical-teal/10 rounded-lg flex items-center justify-center">
                <Bed className="text-medical-teal" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Occupied</p>
                <p className="text-2xl font-bold text-urgent-red mt-2">{occupancy?.occupied || 0}</p>
              </div>
              <div className="w-12 h-12 bg-urgent-red/10 rounded-lg flex items-center justify-center">
                <Users className="text-urgent-red" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-success-green mt-2">{occupancy?.available || 0}</p>
              </div>
              <div className="w-12 h-12 bg-success-green/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-success-green" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Daily Revenue</p>
                <p className="text-2xl font-bold text-professional-dark mt-2">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-soft-blue/10 rounded-lg flex items-center justify-center">
                <Bed className="text-soft-blue" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Overview */}
      {occupancy && (
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>Occupancy Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-600">Overall Occupancy Rate</span>
                <span className="text-lg font-bold text-professional-dark">{occupancy.occupancyRate}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-medical-teal h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${occupancy.occupancyRate}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {occupancy.roomTypes.map((type, index) => {
                  const occupancyRate = Math.round((type.occupied / type.total) * 100);
                  
                  return (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-professional-dark mb-2">{type.name}</h4>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">
                          {type.occupied}/{type.total} rooms
                        </span>
                        <span className="text-sm font-medium">{occupancyRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-medical-teal h-2 rounded-full" 
                          style={{ width: `${occupancyRate}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rooms Table */}
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle>All Rooms</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search rooms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-medical-teal focus:border-transparent"
              >
                <option value="all">All Types</option>
                {roomTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-medical-teal focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="occupied">Occupied</option>
                <option value="available">Available</option>
              </select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Daily Rate</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Current Patient</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-professional-dark">Room {room.roomNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{room.roomType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-professional-dark">
                        {formatCurrency(room.dailyRate)}/day
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {room.isOccupied && room.currentPatientId 
                          ? getPatientName(room.currentPatientId) 
                          : 'Not assigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={room.isOccupied 
                        ? 'bg-urgent-red/10 text-urgent-red' 
                        : 'bg-success-green/10 text-success-green'}>
                        {room.isOccupied ? 'Occupied' : 'Available'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {!room.isOccupied && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRoomForAssignment(room)}
                            disabled={updateRoomMutation.isPending}
                            className="text-medical-teal hover:text-medical-teal/80"
                          >
                            <UserPlus className="mr-1" size={14} />
                            Assign Patient
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRoomStatusToggle(room)}
                          disabled={updateRoomMutation.isPending}
                          className={room.isOccupied 
                            ? 'text-urgent-red hover:text-red-700' 
                            : 'text-success-green hover:text-green-700'}
                        >
                          {room.isOccupied ? (
                            <>
                              <XCircle className="mr-1" size={14} />
                              Check Out
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-1" size={14} />
                              Check In
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredRooms.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No rooms found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRoomForAssignment && (
        <AssignPatientModal
          room={selectedRoomForAssignment}
          patients={patients}
          isOpen={!!selectedRoomForAssignment}
          onClose={() => setSelectedRoomForAssignment(null)}
        />
      )}
    </div>
  );
}
