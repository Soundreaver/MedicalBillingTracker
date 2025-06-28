import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  PillBottle, 
  Bed, 
  DollarSign,
  Building,
  Tag,
  Users
} from "lucide-react";
import { Medicine, Room, insertMedicineSchema, insertRoomSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

// Medicine Category Schema
const medicineCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

type MedicineCategoryFormData = z.infer<typeof medicineCategorySchema>;

// Room Type Schema
const roomTypeSchema = z.object({
  name: z.string().min(1, "Room type name is required"),
  basePrice: z.string().min(1, "Base price is required"),
  description: z.string().optional(),
});

type RoomTypeFormData = z.infer<typeof roomTypeSchema>;

// Medicine Form Schema (for adding medicines from settings)
const addMedicineFormSchema = insertMedicineSchema.extend({
  stock: z.coerce.number().min(0, "Stock must be 0 or greater"),
  price: z.string().min(1, "Price is required"),
  lowStockThreshold: z.coerce.number().min(1, "Low stock threshold must be at least 1"),
});

type AddMedicineFormData = z.infer<typeof addMedicineFormSchema>;

// Room Form Schema (for adding rooms from settings)
const addRoomFormSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  roomType: z.string().min(1, "Room type is required"),
});

type AddRoomFormData = z.infer<typeof addRoomFormSchema>;

export default function Settings() {
  const [activeTab, setActiveTab] = useState("medicine-categories");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingRoomType, setIsAddingRoomType] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingRoomType, setEditingRoomType] = useState<string | null>(null);
  const [isAddingMedicine, setIsAddingMedicine] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const { toast } = useToast();

  // Queries
  const { data: medicines = [], isLoading: medicinesLoading } = useQuery({
    queryKey: ["/api/medicines"],
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["/api/rooms"],
  });

  // Mock data for categories and room types (would come from API in real implementation)
  const [medicineCategories, setMedicineCategories] = useState([
    { id: 1, name: "Analgesics", description: "Pain relief medications" },
    { id: 2, name: "Antibiotics", description: "Infection treatment medications" },
    { id: 3, name: "Antacids", description: "Stomach acid relief medications" },
    { id: 4, name: "Vitamins", description: "Nutritional supplements" },
  ]);

  const [roomTypes, setRoomTypes] = useState([
    { id: 1, name: "Standard Room", basePrice: "2000.00", description: "Basic room with essential amenities" },
    { id: 2, name: "Private Room", basePrice: "3500.00", description: "Single occupancy room with private facilities" },
    { id: 3, name: "Deluxe Room", basePrice: "5000.00", description: "Premium room with enhanced comfort" },
    { id: 4, name: "ICU", basePrice: "8000.00", description: "Intensive care unit with specialized equipment" },
  ]);

  // Forms
  const categoryForm = useForm<MedicineCategoryFormData>({
    resolver: zodResolver(medicineCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const roomTypeForm = useForm<RoomTypeFormData>({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: {
      name: "",
      basePrice: "",
      description: "",
    },
  });

  const medicineForm = useForm<AddMedicineFormData>({
    resolver: zodResolver(addMedicineFormSchema),
    defaultValues: {
      name: "",
      category: "",
      stock: 0,
      price: "",
      lowStockThreshold: 10,
    },
  });

  const roomForm = useForm<AddRoomFormData>({
    resolver: zodResolver(addRoomFormSchema),
    defaultValues: {
      roomNumber: "",
      roomType: "",
    },
  });

  // Mutations
  const addMedicineMutation = useMutation({
    mutationFn: async (data: AddMedicineFormData) => {
      const response = await apiRequest("POST", "/api/medicines", {
        ...data,
        stock: Number(data.stock),
        lowStockThreshold: Number(data.lowStockThreshold),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({
        title: "Success",
        description: "Medicine added successfully",
      });
      medicineForm.reset();
      setIsAddingMedicine(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add medicine",
        variant: "destructive",
      });
    },
  });

  const addRoomMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/rooms", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/occupancy"] });
      toast({
        title: "Success",
        description: "Room added successfully",
      });
      roomForm.reset();
      setIsAddingRoom(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add room",
        variant: "destructive",
      });
    },
  });

  const onSubmitCategory = (data: MedicineCategoryFormData) => {
    if (editingCategory) {
      // Update existing category
      setMedicineCategories(prev => 
        prev.map(cat => 
          cat.id === parseInt(editingCategory) 
            ? { ...cat, name: data.name, description: data.description || "" }
            : cat
        )
      );
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      setEditingCategory(null);
    } else {
      // Add new category
      const newId = Math.max(...medicineCategories.map(c => c.id)) + 1;
      setMedicineCategories(prev => [...prev, {
        id: newId,
        name: data.name,
        description: data.description || ""
      }]);
      toast({
        title: "Success",
        description: "Category added successfully",
      });
    }
    categoryForm.reset();
    setIsAddingCategory(false);
  };

  const onSubmitRoomType = (data: RoomTypeFormData) => {
    if (editingRoomType) {
      // Update existing room type
      setRoomTypes(prev => 
        prev.map(room => 
          room.id === parseInt(editingRoomType)
            ? { ...room, name: data.name, basePrice: data.basePrice, description: data.description || "" }
            : room
        )
      );
      toast({
        title: "Success",
        description: "Room type updated successfully",
      });
      setEditingRoomType(null);
    } else {
      // Add new room type
      const newId = Math.max(...roomTypes.map(r => r.id)) + 1;
      setRoomTypes(prev => [...prev, {
        id: newId,
        name: data.name,
        basePrice: data.basePrice,
        description: data.description || ""
      }]);
      toast({
        title: "Success",
        description: "Room type added successfully",
      });
    }
    roomTypeForm.reset();
    setIsAddingRoomType(false);
  };

  const onSubmitMedicine = (data: AddMedicineFormData) => {
    addMedicineMutation.mutate(data);
  };

  const onSubmitRoom = (data: AddRoomFormData) => {
    // Find the selected room type and set the daily rate
    const selectedRoomType = roomTypes.find(rt => rt.name === data.roomType);
    const dailyRate = selectedRoomType ? selectedRoomType.basePrice : "0";
    
    // Create complete room data for the API
    const roomData = {
      roomNumber: data.roomNumber,
      roomType: data.roomType,
      dailyRate: dailyRate,
      isOccupied: false,
      currentPatientId: null
    };
    
    addRoomMutation.mutate(roomData);
  };

  // Category management functions
  const handleEditCategory = (categoryId: number) => {
    const category = medicineCategories.find(c => c.id === categoryId);
    if (category) {
      categoryForm.setValue("name", category.name);
      categoryForm.setValue("description", category.description || "");
      setEditingCategory(categoryId.toString());
      setIsAddingCategory(true);
    }
  };

  const handleDeleteCategory = (categoryId: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      setMedicineCategories(prev => prev.filter(c => c.id !== categoryId));
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    }
  };

  const handleEditRoomType = (roomTypeId: number) => {
    const roomType = roomTypes.find(r => r.id === roomTypeId);
    if (roomType) {
      roomTypeForm.setValue("name", roomType.name);
      roomTypeForm.setValue("basePrice", roomType.basePrice);
      roomTypeForm.setValue("description", roomType.description || "");
      setEditingRoomType(roomTypeId.toString());
      setIsAddingRoomType(true);
    }
  };

  const handleDeleteRoomType = (roomTypeId: number) => {
    if (confirm("Are you sure you want to delete this room type?")) {
      setRoomTypes(prev => prev.filter(r => r.id !== roomTypeId));
      toast({
        title: "Success",
        description: "Room type deleted successfully",
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-medical-teal" />
        <div>
          <h1 className="text-3xl font-bold text-professional-dark">Admin Settings</h1>
          <p className="text-gray-600">Manage system configuration and master data</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="medicine-categories">Medicine Categories</TabsTrigger>
          <TabsTrigger value="room-types">Room Types</TabsTrigger>
          <TabsTrigger value="add-medicine">Add Medicine</TabsTrigger>
          <TabsTrigger value="add-room">Add Room</TabsTrigger>
        </TabsList>

        {/* Medicine Categories Tab */}
        <TabsContent value="medicine-categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-medical-teal" />
                  <CardTitle>Medicine Categories</CardTitle>
                </div>
                <Button
                  onClick={() => setIsAddingCategory(true)}
                  className="bg-medical-teal hover:bg-medical-teal/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAddingCategory && (
                <Card className="bg-gray-50">
                  <CardContent className="pt-6">
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter category name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter category description"
                                  className="min-h-[80px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsAddingCategory(false);
                              setEditingCategory(null);
                              categoryForm.reset();
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button type="submit" className="bg-medical-teal hover:bg-medical-teal/90">
                            <Save className="h-4 w-4 mr-2" />
                            {editingCategory ? "Update Category" : "Save Category"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                {medicineCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold text-professional-dark">{category.name}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditCategory(category.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Room Types Tab */}
        <TabsContent value="room-types" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-medical-teal" />
                  <CardTitle>Room Types & Pricing</CardTitle>
                </div>
                <Button
                  onClick={() => setIsAddingRoomType(true)}
                  className="bg-medical-teal hover:bg-medical-teal/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room Type
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAddingRoomType && (
                <Card className="bg-gray-50">
                  <CardContent className="pt-6">
                    <Form {...roomTypeForm}>
                      <form onSubmit={roomTypeForm.handleSubmit(onSubmitRoomType)} className="space-y-4">
                        <FormField
                          control={roomTypeForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Room Type Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter room type name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={roomTypeForm.control}
                          name="basePrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base Price (BDT per day) *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  placeholder="0.00" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={roomTypeForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter room type description"
                                  className="min-h-[80px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsAddingRoomType(false);
                              setEditingRoomType(null);
                              roomTypeForm.reset();
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button type="submit" className="bg-medical-teal hover:bg-medical-teal/90">
                            <Save className="h-4 w-4 mr-2" />
                            {editingRoomType ? "Update Room Type" : "Save Room Type"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                {roomTypes.map((roomType) => (
                  <div key={roomType.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold text-professional-dark">{roomType.name}</h3>
                      <p className="text-sm text-gray-600">{roomType.description}</p>
                      <div className="mt-1">
                        <Badge variant="secondary" className="bg-success-green/10 text-success-green">
                          ৳{parseFloat(roomType.basePrice).toFixed(2)}/day
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditRoomType(roomType.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteRoomType(roomType.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Medicine Tab */}
        <TabsContent value="add-medicine" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PillBottle className="h-5 w-5 text-medical-teal" />
                <CardTitle>Add New Medicine</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...medicineForm}>
                <form onSubmit={medicineForm.handleSubmit(onSubmitMedicine)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={medicineForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicine Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter medicine name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={medicineForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {medicineCategories.map((category) => (
                                <SelectItem key={category.id} value={category.name}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={medicineForm.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Stock *</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={medicineForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price (BDT) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={medicineForm.control}
                      name="lowStockThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Low Stock Alert Threshold *</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => medicineForm.reset()}
                    >
                      Clear Form
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addMedicineMutation.isPending}
                      className="bg-medical-teal hover:bg-medical-teal/90"
                    >
                      <PillBottle className="h-4 w-4 mr-2" />
                      {addMedicineMutation.isPending ? "Adding..." : "Add Medicine"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Room Tab */}
        <TabsContent value="add-room" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-medical-teal" />
                <CardTitle>Add New Room</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...roomForm}>
                <form onSubmit={roomForm.handleSubmit(onSubmitRoom)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={roomForm.control}
                      name="roomNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 101, A-205" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={roomForm.control}
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
                              {roomTypes.map((roomType) => (
                                <SelectItem key={roomType.id} value={roomType.name}>
                                  {roomType.name} - ৳{parseFloat(roomType.basePrice).toFixed(2)}/day
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>
                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => roomForm.reset()}
                    >
                      Clear Form
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addRoomMutation.isPending}
                      className="bg-medical-teal hover:bg-medical-teal/90"
                    >
                      <Bed className="h-4 w-4 mr-2" />
                      {addRoomMutation.isPending ? "Adding..." : "Add Room"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}