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

import { X, UserCheck, Plus, Trash2 } from "lucide-react";
import { Room, Patient, Medicine, MedicalService } from "@shared/schema";
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

const medicalServiceItemSchema = z.object({
  serviceId: z.number(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.string().min(1, "Unit price is required"),
});

const assignPatientSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  notes: z.string().optional(),
  medicines: z.array(medicineItemSchema).optional(),
  medicalServices: z.array(medicalServiceItemSchema).optional(),
});

type AssignPatientFormData = z.infer<typeof assignPatientSchema>;
type MedicineItem = z.infer<typeof medicineItemSchema>;
type MedicalServiceItem = z.infer<typeof medicalServiceItemSchema>;

export default function AssignPatientModal({ room, patients, isOpen, onClose }: AssignPatientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMedicines, setSelectedMedicines] = useState<MedicineItem[]>([]);
  const [selectedMedicalServices, setSelectedMedicalServices] = useState<MedicalServiceItem[]>([]);
  const { toast } = useToast();

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });

  const { data: medicalServices = [] } = useQuery<MedicalService[]>({
    queryKey: ["/api/medical-services"],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  // Filter out patients who are already assigned to other rooms
  const availablePatients = patients.filter(patient => {
    // Check if this patient is already assigned to any room
    const isAssigned = rooms.some(r => r.isOccupied && r.currentPatientId === patient.id);
    return !isAssigned;
  });

  const form = useForm<AssignPatientFormData>({
    resolver: zodResolver(assignPatientSchema),
    defaultValues: {
      patientId: "",
      notes: "",
      medicines: [],
    },
  });

  const assignPatientMutation = useMutation({
    mutationFn: async (data: AssignPatientFormData) => {
      // Step 1: Assign patient to room with check-in date
      const roomResponse = await apiRequest("PUT", `/api/rooms/${room.id}`, {
        isOccupied: true,
        currentPatientId: parseInt(data.patientId),
        checkInDate: new Date().toISOString(),
      });

      // Step 2: Create automatic invoice for initial services and medicines
      // Room charges will be added daily automatically
      const invoiceItems = [];

      // Add fixed admission & registration fee (600 BDT)
      invoiceItems.push({
        itemType: "medical_service",
        itemId: 1, // Assuming the admission fee service has ID 1
        itemName: "Admission & Registration Fee",
        quantity: 1,
        unitPrice: "600.00",
        totalPrice: "600.00",
      });

      // Add room charge for initial day
      const roomDailyRate = parseFloat(room.dailyRate);
      invoiceItems.push({
        itemType: "room",
        itemId: room.id,
        itemName: `Room ${room.roomNumber} (${room.roomType})`,
        quantity: 1,
        unitPrice: room.dailyRate,
        totalPrice: room.dailyRate,
      });

      let totalCharges = 600 + roomDailyRate; // Start with admission fee + room charge

      // Add medical service items
      for (const service of selectedMedicalServices) {
        const medicalService = medicalServices.find(s => s.id === service.serviceId);
        if (medicalService) {
          const serviceTotal = parseFloat(service.unitPrice || "0") * service.quantity;
          totalCharges += serviceTotal;
          invoiceItems.push({
            itemType: "medical_service",
            itemId: medicalService.id,
            itemName: medicalService.name,
            quantity: service.quantity,
            unitPrice: service.unitPrice,
            totalPrice: serviceTotal.toString(),
          });
        }
      }

      // Add medicine items
      for (const med of selectedMedicines) {
        const medicine = medicines.find(m => m.id === med.medicineId);
        if (medicine) {
          const medicineTotal = parseFloat(medicine.unitPrice) * med.quantity;
          totalCharges += medicineTotal;
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

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

      // Calculate subtotal, service charge, and total
      const subtotal = totalCharges;
      const serviceCharge = subtotal * 0.20; // 20% service charge
      const total = subtotal + serviceCharge;

      const invoiceData = {
        invoice: {
          invoiceNumber: generateInvoiceNumber(),
          patientId: parseInt(data.patientId),
          subtotalAmount: subtotal.toString(),
          serviceCharge: serviceCharge.toString(),
          totalAmount: total.toString(),
          paidAmount: "0",
          status: "pending",
          dueDate: dueDate.toISOString(),
          description: data.notes || `Room assignment: ${room.roomNumber} - Daily charges will accumulate automatically`,
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
      setSelectedMedicalServices([]);
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

  const addMedicalService = () => {
    setSelectedMedicalServices([...selectedMedicalServices, { serviceId: 0, quantity: 1, unitPrice: "0.00" }]);
  };

  const removeMedicalService = (index: number) => {
    setSelectedMedicalServices(selectedMedicalServices.filter((_, i) => i !== index));
  };

  const updateMedicalService = (index: number, field: keyof MedicalServiceItem, value: number | string) => {
    const updated = [...selectedMedicalServices];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedMedicalServices(updated);
  };

  const calculateSubtotal = () => {
    // Fixed admission fee
    let subtotal = 600;
    
    // Add room daily rate for initial charge
    const roomDailyRate = parseFloat(room.dailyRate);
    subtotal += roomDailyRate;
    
    // Add medicine costs
    const medicineTotal = selectedMedicines.reduce((sum, item) => {
      const medicine = medicines.find(m => m.id === item.medicineId);
      return sum + (medicine ? parseFloat(medicine.unitPrice) * item.quantity : 0);
    }, 0);
    
    // Add medical service costs
    const serviceTotal = selectedMedicalServices.reduce((sum, item) => {
      return sum + (parseFloat(item.unitPrice || "0") * item.quantity);
    }, 0);
    
    return subtotal + medicineTotal + serviceTotal;
  };

  const calculateServiceCharge = () => {
    return calculateSubtotal() * 0.20; // 20% service charge
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateServiceCharge();
  };

  const onSubmit = async (data: AssignPatientFormData) => {
    setIsSubmitting(true);
    try {
      await assignPatientMutation.mutateAsync({ 
        ...data, 
        medicines: selectedMedicines,
        medicalServices: selectedMedicalServices 
      });
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-professional-dark">
            Assign Patient to Room
          </DialogTitle>
          <p className="text-gray-600 mt-1">Room {room.roomNumber} - {room.roomType}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-scroll px-1 max-h-[40vh] border border-gray-200 rounded scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
          <div className="py-6 space-y-6 pr-4">
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
            <form id="assign-patient-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        {availablePatients.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            No patients available (all patients are already assigned to rooms)
                          </div>
                        ) : (
                          availablePatients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id.toString()}>
                              <div className="flex items-center">
                                <div>
                                  <div className="font-medium">{patient.name}</div>
                                  <div className="text-sm text-gray-500">ID: {patient.patientId}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
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



              {/* Medicine Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-professional-dark">Medicines (Optional)</h4>
                    <p className="text-sm text-gray-600">One-time medicine dispensed during admission</p>
                  </div>
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

              {/* Medical Services Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-professional-dark">Medical Services (Optional)</h4>
                    <p className="text-sm text-gray-600">One-time charges during room assignment</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMedicalService}
                    className="border-medical-teal text-medical-teal hover:bg-medical-teal hover:text-white"
                  >
                    <Plus className="mr-1" size={14} />
                    Add Service
                  </Button>
                </div>

                {selectedMedicalServices.length > 0 && (
                  <div className="space-y-3">
                    {selectedMedicalServices.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className="flex-1">
                          <Select 
                            value={item.serviceId.toString()} 
                            onValueChange={(value) => updateMedicalService(index, 'serviceId', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select medical service" />
                            </SelectTrigger>
                            <SelectContent>
                              {medicalServices.map((service) => (
                                <SelectItem key={service.id} value={service.id.toString()}>
                                  <div className="flex justify-between items-center w-full">
                                    <span>{service.name}</span>
                                    <span className="text-sm text-gray-500 ml-2">({service.unit})</span>
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
                            onChange={(e) => updateMedicalService(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="w-28">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Price"
                            value={item.unitPrice}
                            onChange={(e) => updateMedicalService(index, 'unitPrice', e.target.value)}
                          />
                        </div>
                        <div className="w-24 text-right">
                          {formatCurrency((parseFloat(item.unitPrice || "0") * item.quantity).toString())}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedicalService(index)}
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
                      <span>Admission & Registration Fee:</span>
                      <span>{formatCurrency("600.00")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Initial room charge (1 day):</span>
                      <span>{formatCurrency(room.dailyRate)}</span>
                    </div>
                    <div className="text-sm text-gray-500 italic">
                      Additional room charges will accumulate daily automatically
                    </div>
                    {selectedMedicalServices.length > 0 && (
                      <div className="flex justify-between">
                        <span>Medical services (one-time):</span>
                        <span>{formatCurrency(selectedMedicalServices.reduce((sum, item) => {
                          return sum + (parseFloat(item.unitPrice || "0") * item.quantity);
                        }, 0).toString())}</span>
                      </div>
                    )}
                    {selectedMedicines.length > 0 && (
                      <div className="flex justify-between">
                        <span>Medicines (one-time):</span>
                        <span>{formatCurrency(selectedMedicines.reduce((sum, item) => {
                          const medicine = medicines.find(m => m.id === item.medicineId);
                          return sum + (medicine ? parseFloat(medicine.unitPrice) * item.quantity : 0);
                        }, 0).toString())}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 space-y-1">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(calculateSubtotal().toString())}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Service Charge (20%):</span>
                        <span>{formatCurrency(calculateServiceCharge().toString())}</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between font-semibold text-lg">
                        <span>Total Amount:</span>
                        <span className="text-medical-teal">{formatCurrency(calculateTotal().toString())}</span>
                      </div>
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
            </form>
          </Form>
          </div>
        </div>

        {/* Action buttons outside scrollable area */}
        <div className="flex justify-end space-x-3 pt-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit"
            form="assign-patient-form"
            disabled={isSubmitting || assignPatientMutation.isPending || !selectedPatient || availablePatients.length === 0}
            className="bg-medical-teal hover:bg-medical-teal/90"
          >
            <UserCheck className="mr-2" size={16} />
            {availablePatients.length === 0 ? "No Patients Available" : (isSubmitting ? "Assigning..." : "Assign Patient")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}