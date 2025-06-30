import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, X, Save, Package, Bed, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Medicine, Room, MedicalService, InvoiceWithDetails } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EditInvoiceModalProps {
  invoice: InvoiceWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

type InvoiceItem = {
  id: string;
  itemType: "medicine" | "room" | "service" | "medical_service";
  itemId: number | null;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export default function EditInvoiceModal({ invoice, isOpen, onClose }: EditInvoiceModalProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: medicalServices = [] } = useQuery<MedicalService[]>({
    queryKey: ["/api/medical-services"],
  });

  // Initialize items from existing invoice
  useEffect(() => {
    if (invoice) {
      const initialItems = invoice.items.map((item, index) => ({
        id: `existing-${index}`,
        itemType: item.itemType as "medicine" | "room" | "service",
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));
      setItems(initialItems);
      setDescription(invoice.description || "");
    }
  }, [invoice]);

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `new-${Date.now()}`,
      itemType: "medicine",
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

  const updateItem = (id: string, updates: Partial<InvoiceItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        
        // Auto-calculate total price when quantity or unit price changes
        if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
          const quantity = updates.quantity ?? updatedItem.quantity;
          const unitPrice = parseFloat(updates.unitPrice ?? updatedItem.unitPrice);
          updatedItem.totalPrice = (quantity * unitPrice).toString();
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleItemTypeChange = (id: string, type: "medicine" | "room" | "service" | "medical_service") => {
    updateItem(id, {
      itemType: type,
      itemId: null,
      itemName: "",
      unitPrice: "0",
      totalPrice: "0",
    });
  };

  const handleItemSelection = (id: string, selectedId: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (item.itemType === "medicine") {
      const medicine = medicines.find(m => m.id.toString() === selectedId);
      if (medicine) {
        updateItem(id, {
          itemId: medicine.id,
          itemName: medicine.name,
          unitPrice: medicine.unitPrice,
          totalPrice: (item.quantity * parseFloat(medicine.unitPrice)).toString(),
        });
      }
    } else if (item.itemType === "room") {
      const room = rooms.find(r => r.id.toString() === selectedId);
      if (room) {
        updateItem(id, {
          itemId: room.id,
          itemName: `Room ${room.roomNumber} (${room.roomType})`,
          unitPrice: room.dailyRate,
          totalPrice: (item.quantity * parseFloat(room.dailyRate)).toString(),
        });
      }
    } else if (item.itemType === "medical_service") {
      const service = medicalServices.find(s => s.id.toString() === selectedId);
      if (service) {
        updateItem(id, {
          itemId: service.id,
          itemName: service.name,
          unitPrice: "0.00", // User will set their own price
          totalPrice: "0.00",
        });
      }
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0);
  };

  const updateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const totalAmount = calculateTotal();
      
      // Prepare the update data
      const updateData = {
        totalAmount: totalAmount.toString(),
        description,
        items: items.map(item => ({
          itemType: item.itemType,
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      };

      const response = await apiRequest("PUT", `/api/invoices/${invoice.id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await updateInvoiceMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "medicine": return <Package className="h-4 w-4" />;
      case "room": return <Bed className="h-4 w-4" />;
      case "medical_service": return <Wrench className="h-4 w-4" />;
      case "service": return <Wrench className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const isInvoicePaid = invoice.outstandingAmount === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-professional-dark">
                Edit Invoice #{invoice.invoiceNumber}
              </DialogTitle>
              <p className="text-gray-600 mt-1">
                Patient: {invoice.patient.name} | 
                Status: <Badge variant={isInvoicePaid ? "default" : "secondary"} className={isInvoicePaid ? "bg-success-green" : "bg-yellow-500"}>
                  {isInvoicePaid ? "Paid" : "Pending"}
                </Badge>
              </p>
            </div>
          </div>
        </DialogHeader>

        {isInvoicePaid && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">
              ⚠️ This invoice has been fully paid. Editing a paid invoice may affect financial records.
            </p>
          </div>
        )}

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            {/* Invoice Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-professional-dark">Invoice Items</h3>
                  <p className="text-sm text-gray-600">Room charges are daily, other items are one-time charges</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="border-medical-teal text-medical-teal hover:bg-medical-teal hover:text-white"
                >
                  <Plus className="mr-1" size={14} />
                  Add Item
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items in this invoice. Click "Add Item" to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                        {/* Item Type */}
                        <div>
                          <Select
                            value={item.itemType}
                            onValueChange={(value) => handleItemTypeChange(item.id, value as "medicine" | "room" | "service" | "medical_service")}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="medicine">
                                <div className="flex items-center">
                                  <Package className="mr-2" size={14} />
                                  Medicine
                                </div>
                              </SelectItem>
                              <SelectItem value="room">
                                <div className="flex items-center">
                                  <Bed className="mr-2" size={14} />
                                  Room
                                </div>
                              </SelectItem>
                              <SelectItem value="medical_service">
                                <div className="flex items-center">
                                  <Wrench className="mr-2" size={14} />
                                  Medical Service
                                </div>
                              </SelectItem>
                              <SelectItem value="service">
                                <div className="flex items-center">
                                  <Wrench className="mr-2" size={14} />
                                  Custom Service
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Item Selection */}
                        <div className="md:col-span-2">
                          {item.itemType === "medicine" ? (
                            <Select
                              value={item.itemId?.toString() || ""}
                              onValueChange={(value) => handleItemSelection(item.id, value)}
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
                          ) : item.itemType === "room" ? (
                            <Select
                              value={item.itemId?.toString() || ""}
                              onValueChange={(value) => handleItemSelection(item.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select room" />
                              </SelectTrigger>
                              <SelectContent>
                                {rooms.map((room) => (
                                  <SelectItem key={room.id} value={room.id.toString()}>
                                    Room {room.roomNumber} ({room.roomType}) - {formatCurrency(room.dailyRate)}/day
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : item.itemType === "medical_service" ? (
                            <Select
                              value={item.itemId?.toString() || ""}
                              onValueChange={(value) => handleItemSelection(item.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select medical service" />
                              </SelectTrigger>
                              <SelectContent>
                                {medicalServices.map((service) => (
                                  <SelectItem key={service.id} value={service.id.toString()}>
                                    {service.name} ({service.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="Service name"
                              value={item.itemName}
                              onChange={(e) => updateItem(item.id, { itemName: e.target.value })}
                            />
                          )}
                        </div>

                        {/* Quantity */}
                        <div>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                          />
                        </div>

                        {/* Unit Price */}
                        <div>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, { unitPrice: e.target.value })}
                            disabled={item.itemType !== "service" && item.itemType !== "medical_service"}
                          />
                        </div>

                        {/* Total & Remove */}
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                placeholder="Add invoice description or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Total Summary */}
            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Updated Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total Amount:</span>
                  <span className="text-medical-teal">{formatCurrency(calculateTotal().toString())}</span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Original: {formatCurrency(invoice.totalAmount)} | 
                  Outstanding: {formatCurrency(invoice.outstandingAmount.toString())}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0}
            className="bg-medical-teal hover:bg-medical-teal/90"
          >
            <Save className="mr-2" size={16} />
            {isSubmitting ? "Updating..." : "Update Invoice"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}