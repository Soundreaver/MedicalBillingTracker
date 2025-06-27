import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, UserCheck } from "lucide-react";
import { Room, Patient } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AssignPatientModalProps {
  room: Room;
  patients: Patient[];
  isOpen: boolean;
  onClose: () => void;
}

const assignPatientSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  notes: z.string().optional(),
});

type AssignPatientFormData = z.infer<typeof assignPatientSchema>;

export default function AssignPatientModal({ room, patients, isOpen, onClose }: AssignPatientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Filter out patients who are already assigned to other rooms
  const availablePatients = patients.filter(patient => {
    // You could add logic here to check if patient is already assigned to another room
    return true; // For now, show all patients
  });

  const form = useForm<AssignPatientFormData>({
    resolver: zodResolver(assignPatientSchema),
    defaultValues: {
      patientId: "",
      notes: "",
    },
  });

  const assignPatientMutation = useMutation({
    mutationFn: async (data: AssignPatientFormData) => {
      const response = await apiRequest("PUT", `/api/rooms/${room.id}`, {
        isOccupied: true,
        currentPatientId: parseInt(data.patientId),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/occupancy"] });
      toast({
        title: "Success",
        description: "Patient assigned to room successfully",
      });
      onClose();
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign patient to room",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: AssignPatientFormData) => {
    setIsSubmitting(true);
    try {
      await assignPatientMutation.mutateAsync(data);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader className="border-b pb-4">
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

        <div className="py-6">
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
      </DialogContent>
    </Dialog>
  );
}