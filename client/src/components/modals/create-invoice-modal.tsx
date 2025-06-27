import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Trash2, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, generateInvoiceNumber } from "@/lib/utils";
import { Patient, Medicine, Room, insertInvoiceSchema, insertInvoiceItemSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const invoiceItemSchema = insertInvoiceItemSchema.extend({
  unitPrice: z.string().min(1, "Unit price is required"),
  totalPrice: z.string().min(1, "Total price is required"),
});

const createInvoiceFormSchema = z.object({
  invoice: insertInvoiceSchema.extend({
    totalAmount: z.string().min(1, "Total amount is required"),
  }),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

type CreateInvoiceFormData = z.infer<typeof createInvoiceFormSchema>;

type InvoiceItem = {
  id: string;
  itemType: "medicine" | "room" | "service";
  itemId: number | null;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export default function CreateInvoiceModal({ isOpen, onClose }: CreateInvoiceModalProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const { toast } = useToast();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const form = useForm<CreateInvoiceFormData>({
    resolver: zodResolver(createInvoiceFormSchema),
    defaultValues: {
      invoice: {
        invoiceNumber: generateInvoiceNumber(),
        patientId: 0,
        totalAmount: "0",
        paidAmount: "0",
        status: "pending",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        description: "",
      },
      items: [],
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: CreateInvoiceFormData) => {
      const invoiceData = {
        ...data.invoice,
        totalAmount: parseFloat(data.invoice.totalAmount),
        paidAmount: parseFloat(data.invoice.paidAmount),
      };

      const itemsData = data.items.map(item => ({
        ...item,
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.totalPrice),
      }));

      const response = await apiRequest("POST", "/api/invoices", {
        invoice: invoiceData,
        items: itemsData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/outstanding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      itemType: "service",
      itemId: null,
      itemName: "",
      quantity: 1,
      unitPrice: "0",
      totalPrice: "0",
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate total price when quantity or unit price changes
        if (field === "quantity" || field === "unitPrice") {
          const quantity = field === "quantity" ? value : updatedItem.quantity;
          const unitPrice = field === "unitPrice" ? parseFloat(value) || 0 : parseFloat(updatedItem.unitPrice) || 0;
          updatedItem.totalPrice = (quantity * unitPrice).toString();
        }

        // Auto-populate item details when medicine or room is selected
        if (field === "itemId" && value) {
          if (updatedItem.itemType === "medicine") {
            const medicine = medicines.find(m => m.id === value);
            if (medicine) {
              updatedItem.itemName = medicine.name;
              updatedItem.unitPrice = medicine.unitPrice;
              updatedItem.totalPrice = (updatedItem.quantity * parseFloat(medicine.unitPrice)).toString();
            }
          } else if (updatedItem.itemType === "room") {
            const room = rooms.find(r => r.id === value);
            if (room) {
              updatedItem.itemName = `Room ${room.roomNumber} (${room.roomType})`;
              updatedItem.unitPrice = room.dailyRate;
              updatedItem.totalPrice = (updatedItem.quantity * parseFloat(room.dailyRate)).toString();
            }
          }
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0);
  };

  const onSubmit = async (data: CreateInvoiceFormData) => {
    const formattedItems = items.map(item => ({
      itemType: item.itemType,
      itemId: item.itemId,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    const total = calculateTotal();
    
    await createInvoiceMutation.mutateAsync({
      invoice: {
        ...data.invoice,
        totalAmount: total.toString(),
      },
      items: formattedItems,
    });
  };

  const handleClose = () => {
    form.reset();
    setItems([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div>
            <DialogTitle className="text-xl font-bold text-professional-dark">
              Create New Invoice
            </DialogTitle>
            <p className="text-gray-600 mt-1">Generate invoice for patient services</p>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="invoice.invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice.patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.name} ({patient.patientId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice.dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice.description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Invoice description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Invoice Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-professional-dark">Invoice Items</h3>
                <Button type="button" onClick={addItem} variant="outline">
                  <Plus className="mr-2" size={16} />
                  Add Item
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
                  No items added yet. Click "Add Item" to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div>
                          <Label>Type</Label>
                          <Select
                            value={item.itemType}
                            onValueChange={(value: "medicine" | "room" | "service") => 
                              updateItem(item.id, "itemType", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="medicine">Medicine</SelectItem>
                              <SelectItem value="room">Room</SelectItem>
                              <SelectItem value="service">Service</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {item.itemType === "medicine" && (
                          <div>
                            <Label>Medicine</Label>
                            <Select
                              value={item.itemId?.toString() || ""}
                              onValueChange={(value) => updateItem(item.id, "itemId", parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select medicine" />
                              </SelectTrigger>
                              <SelectContent>
                                {medicines.map((medicine) => (
                                  <SelectItem key={medicine.id} value={medicine.id.toString()}>
                                    {medicine.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {item.itemType === "room" && (
                          <div>
                            <Label>Room</Label>
                            <Select
                              value={item.itemId?.toString() || ""}
                              onValueChange={(value) => updateItem(item.id, "itemId", parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select room" />
                              </SelectTrigger>
                              <SelectContent>
                                {rooms.map((room) => (
                                  <SelectItem key={room.id} value={room.id.toString()}>
                                    Room {room.roomNumber} ({room.roomType})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {item.itemType === "service" && (
                          <div>
                            <Label>Service Name</Label>
                            <Input
                              value={item.itemName}
                              onChange={(e) => updateItem(item.id, "itemName", e.target.value)}
                              placeholder="Enter service name"
                            />
                          </div>
                        )}

                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                            min="1"
                          />
                        </div>

                        <div>
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                            step="0.01"
                            min="0"
                          />
                        </div>

                        <div>
                          <Label>Total</Label>
                          <Input
                            value={formatCurrency(item.totalPrice)}
                            disabled
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-urgent-red hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            {items.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-professional-dark">Total Amount:</span>
                  <span className="text-2xl font-bold text-professional-dark">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={items.length === 0 || createInvoiceMutation.isPending}
                className="bg-medical-teal hover:bg-medical-teal/90"
              >
                {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
