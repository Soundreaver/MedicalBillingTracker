import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRoomSchema, type InsertRoom } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AddRoomFormData = InsertRoom;

export default function AddRoomModal({ isOpen, onClose }: AddRoomModalProps) {
  const { toast } = useToast();

  const form = useForm<AddRoomFormData>({
    resolver: zodResolver(insertRoomSchema),
    defaultValues: {
      roomNumber: "",
      roomType: "General",
      dailyRate: "0",
      isOccupied: false,
      currentPatientId: null,
      checkInDate: null,
      currentInvoiceId: null,
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: AddRoomFormData) => {
      const response = await apiRequest("POST", "/api/rooms", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Room added successfully",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add room",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: AddRoomFormData) => {
    await createRoomMutation.mutateAsync(data);
  };

  const handleClose = () => {
    form.reset({
      roomNumber: "",
      roomType: "General",
      dailyRate: "0",
      isOccupied: false,
      currentPatientId: null,
      checkInDate: null,
      currentInvoiceId: null,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div>
            <DialogTitle className="text-xl font-bold text-professional-dark">
              Add New Room
            </DialogTitle>
            <p className="text-gray-600 mt-1">Add a new room to the system</p>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="roomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter room number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Type *</FormLabel>
                    <FormControl>
                      <select 
                        {...field} 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="General">General</option>
                        <option value="ICU">ICU</option>
                        <option value="Private">Private</option>
                        <option value="Emergency">Emergency</option>
                        <option value="Surgery">Surgery</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dailyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Rate *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter daily rate"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createRoomMutation.isPending}
                className="bg-medical-teal hover:bg-medical-teal/90"
              >
                {createRoomMutation.isPending ? "Adding..." : "Add Room"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
