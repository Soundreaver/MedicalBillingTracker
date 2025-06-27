import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRoomSchema, type InsertRoom } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AddRoomFormData = typeof insertRoomSchema._output;

export default function AddRoomModal({ isOpen, onClose }: AddRoomModalProps) {
  const { toast } = useToast();

  const form = useForm<AddRoomFormData>({
    resolver: zodResolver(insertRoomSchema),
    defaultValues: {
      roomNumber: "",
      roomType: "General Ward",
      capacity: 1,
      dailyRate: "0",
      isOccupied: false,
      patientId: null,
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: AddRoomFormData) => {
      const response = await apiRequest("POST", "/api/rooms", {
        ...data,
        dailyRate: parseFloat(data.dailyRate),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/occupancy"] });
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
      roomType: "General Ward",
      capacity: 1,
      dailyRate: "0",
      isOccupied: false,
      patientId: null,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b pb-4">
          <div>
            <DialogTitle className="text-xl font-bold text-professional-dark">
              Add New Room
            </DialogTitle>
            <p className="text-gray-600 mt-1">Add a room to the hospital inventory</p>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="roomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 101, A-12" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select room type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="General Ward">General Ward</SelectItem>
                        <SelectItem value="Private Room">Private Room</SelectItem>
                        <SelectItem value="ICU">ICU</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                        <SelectItem value="Operating Room">Operating Room</SelectItem>
                        <SelectItem value="Maternity">Maternity</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Number of beds" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        min="1"
                      />
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
                    <FormLabel>Daily Rate (BDT) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        step="0.01"
                        min="0"
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