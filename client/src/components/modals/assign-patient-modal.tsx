import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, UserCheck, Plus, Trash2 } from "lucide-react";
import { Room, Patient, Medicine } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, generateInvoiceNumber } from "@/lib/utils";

interface AssignPatientModalProps {
  room: Room;
  patients: Patient[];
  isOpen: boolean;
  onClose: () => void;
}

const medicineItemSchema = z.object({
  medicineId: z.number(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

const assignPatientSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  stayDuration: z.number().min(1, "Stay duration must be at least 1 day"),
  notes: z.string().optional(),
  medicines: z.array(medicineItemSchema).optional(),
});

type AssignPatientFormData = z.infer<typeof assignPatientSchema>;
type MedicineItem = z.infer<typeof medicineItemSchema>;

export default function AssignPatientModal({ room, patients, isOpen, onClose }: AssignPatientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMedicines, setSelectedMedicines] = useState<MedicineItem[]>([]);
  const { toast } = useToast();

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });

  // Filter out patients who are already assigned to other rooms
  const availablePatients = patients.filter(patient => {
    // You could add logic here to check if patient is already assigned to another room
    return true; // For now, show all patients
  });

  const form = useForm<AssignPatientFormData>({
    resolver: zodResolver(assignPatientSchema),
    defaultValues: {
      patientId: "",
      stayDuration: 1,
      notes: "",
      medicines: [],
    },
  });

  const assignPatientMutation = useMutation({
    mutationFn: async (data: AssignPatientFormData) => {
      // Step 1: Assign patient to room
      const roomResponse = await apiRequest("PUT", `/api/rooms/${room.id}`, {
        isOccupied: true,
        currentPatientId: parseInt(data.patientId),
      });

      // Step 2: Create automatic invoice for room stay and medicines
      const stayDurationDays = data.stayDuration;
      const roomRate = parseFloat(room.dailyRate);
      const totalRoomCharges = roomRate * stayDurationDays;

      // Create invoice items
      const invoiceItems = [];
      
      // Add room charges
      invoiceItems.push({
        itemType: "room",
        itemId: room.id,
        itemName: `Room ${room.roomNumber} (${room.roomType}) - ${stayDurationDays} day${stayDurationDays > 1 ? 's' : ''}`,
        quantity: stayDurationDays,
        unitPrice: room.dailyRate,
        totalPrice: totalRoomCharges.toString(),
      });

      // Add medicine items
      let totalMedicineCharges = 0;
      for (const med of selectedMedicines) {
        const medicine = medicines.find(m => m.id === med.medicineId);
        if (medicine) {
          const medicineTotal = parseFloat(medicine.unitPrice) * med.quantity;
          totalMedicineCharges += medicineTotal;
          invoiceItems.push({
            itemType: "medicine",
            itemId: medicine.id,
            itemName: medicine.name,
            quantity: med.quantity,
            unitPrice: medicine.unitPrice,
            totalPrice: medicineTotal.toString(),
          });
        }
      }

      const totalAmount = totalRoomCharges + totalMedicineCharges;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

      const invoiceData = {
        invoice: {
          invoiceNumber: generateInvoiceNumber(),
          patientId: parseInt(data.patientId),
          totalAmount: totalAmount.toString(),
          paidAmount: "0",
          status: "pending",
          dueDate: dueDate.toISOString(),
          description: data.notes || `Room assignment: ${room.roomNumber} for ${stayDurationDays} day${stayDurationDays > 1 ? 's' : ''}`,
        },
        items: invoiceItems,
      };

      // Step 3: Create the invoice
      const invoiceResponse = await apiRequest("POST", "/api/invoices", invoiceData);
      
      return { room: roomResponse.json(), invoice: invoiceResponse.json() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({
        title: "Success",
        description: "Patient assigned to room and invoice created successfully",
      });
      onClose();
      form.reset();
      setSelectedMedicines([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign patient to room",
        variant: "destructive",
      });
    },
  });

  const addMedicine = () => {
    setSelectedMedicines([...selectedMedicines, { medicineId: 0, quantity: 1 }]);
  };

  const removeMedicine = (index: number) => {
    setSelectedMedicines(selectedMedicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: keyof MedicineItem, value: number) => {
    const updated = [...selectedMedicines];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedMedicines(updated);
  };

  const calculateTotal = () => {
    const stayDuration = form.watch("stayDuration") || 1;
    const roomTotal = parseFloat(room.dailyRate) * stayDuration;
    
    const medicineTotal = selectedMedicines.reduce((sum, item) => {
      const medicine = medicines.find(m => m.id === item.medicineId);
      return sum + (medicine ? parseFloat(medicine.unitPrice) * item.quantity : 0);
    }, 0);
    
    return roomTotal + medicineTotal;
  };

  const onSubmit = async (data: AssignPatientFormData) => {
    setIsSubmitting(true);
    try {
      await assignPatientMutation.mutateAsync({ ...data, medicines: selectedMedicines });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const selectedPatient = form.watch("patientId");
  const patient = availablePatients.find(p => p.id.toString() === selectedPatient);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-professional-dark">
                Assign Patient to Room
              </DialogTitle>
              <p className="text-gray-600 mt-1">Room {room.roomNumber} - {room.roomType}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="py-6 space-y-6">
            {/* Room Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-professional-dark mb-2">Room Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Room Number:</span>
                <span className="ml-2 font-medium">Room {room.roomNumber}</span>
              </div>
              <div>
                <span className="text-gray-600">Room Type:</span>
                <span className="ml-2 font-medium">{room.roomType}</span>
              </div>
              <div>
                <span className="text-gray-600">Daily Rate:</span>
                <span className="ml-2 font-medium">৳{parseFloat(room.dailyRate).toFixed(2)}/day</span>
              </div>
              <div>
                <span className="text-gray-600">Current Status:</span>
                <span className={`ml-2 font-medium ${room.isOccupied ? 'text-red-600' : 'text-green-600'}`}>
                  {room.isOccupied ? 'Occupied' : 'Available'}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Patient *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a patient to assign" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePatients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            <div className="flex items-center">
                              <div>
                                <div className="font-medium">{patient.name}</div>
                                <div className="text-sm text-gray-500">ID: {patient.patientId}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Selected Patient Details */}
              {patient && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-professional-dark mb-2">Selected Patient</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{patient.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Patient ID:</span>
                      <span className="ml-2 font-medium">{patient.patientId}</span>
                    </div>
                    {patient.phone && (
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <span className="ml-2 font-medium">{patient.phone}</span>
                      </div>
                    )}
                    {patient.email && (
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2 font-medium">{patient.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="stayDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Stay Duration (Days) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Enter number of days"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Medicine Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-professional-dark">Medicines (Optional)</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMedicine}
                    className="border-medical-teal text-medical-teal hover:bg-medical-teal hover:text-white"
                  >
                    <Plus className="mr-1" size={14} />
                    Add Medicine
                  </Button>
                </div>

                {selectedMedicines.length > 0 && (
                  <div className="space-y-3">
                    {selectedMedicines.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className="flex-1">
                          <Select 
                            value={item.medicineId.toString()} 
                            onValueChange={(value) => updateMedicine(index, 'medicineId', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select medicine" />
                            </SelectTrigger>
                            <SelectContent>
                              {medicines.map((medicine) => (
                                <SelectItem key={medicine.id} value={medicine.id.toString()}>
                                  <div className="flex justify-between items-center w-full">
                                    <span>{medicine.name}</span>
                                    <span className="text-sm text-gray-500 ml-2">{formatCurrency(medicine.unitPrice)}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateMedicine(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="w-24 text-right">
                          {(() => {
                            const medicine = medicines.find(m => m.id === item.medicineId);
                            return medicine ? formatCurrency((parseFloat(medicine.unitPrice) * item.quantity).toString()) : '৳0.00';
                          })()}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedicine(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cost Summary */}
              <Card className="bg-gray-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Cost Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Room charges ({form.watch("stayDuration") || 1} day{(form.watch("stayDuration") || 1) > 1 ? 's' : ''}):</span>
                      <span>{formatCurrency((parseFloat(room.dailyRate) * (form.watch("stayDuration") || 1)).toString())}</span>
                    </div>
                    {selectedMedicines.length > 0 && (
                      <div className="flex justify-between">
                        <span>Medicine charges:</span>
                        <span>{formatCurrency(selectedMedicines.reduce((sum, item) => {
                          const medicine = medicines.find(m => m.id === item.medicineId);
                          return sum + (medicine ? parseFloat(medicine.unitPrice) * item.quantity : 0);
                        }, 0).toString())}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                      <span>Total Amount:</span>
                      <span className="text-medical-teal">{formatCurrency(calculateTotal().toString())}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this room assignment..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || assignPatientMutation.isPending || !selectedPatient}
                  className="bg-medical-teal hover:bg-medical-teal/90"
                >
                  <UserCheck className="mr-2" size={16} />
                  {isSubmitting ? "Assigning..." : "Assign Patient"}
                </Button>
              </div>
            </form>
          </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}