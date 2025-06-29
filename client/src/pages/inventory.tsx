import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Search, Plus, Package, AlertTriangle, Edit, TrendingDown, Upload, MoreHorizontal, Trash2, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Medicine } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddMedicineModal from "@/components/modals/add-medicine-modal";
import BulkImportModal from "@/components/modals/bulk-import-modal";

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null);
  const { toast } = useToast();

  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });

  const { data: lowStockMedicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines/low-stock"],
  });

  const updateMedicineMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Medicine> }) => {
      const response = await apiRequest("PUT", `/api/medicines/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines/low-stock"] });
      toast({
        title: "Success",
        description: "Medicine updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update medicine",
        variant: "destructive",
      });
    },
  });

  const deleteMedicineMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/medicines/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines/low-stock"] });
      toast({
        title: "Success",
        description: "Medicine deleted successfully",
      });
      setDeletingMedicine(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete medicine",
        variant: "destructive",
      });
    },
  });

  const categories = medicines.reduce((acc: string[], medicine) => {
    if (medicine.category && !acc.includes(medicine.category)) {
      acc.push(medicine.category);
    }
    return acc;
  }, []);
  
  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (medicine.category && medicine.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || medicine.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleStockUpdate = (medicine: Medicine, newStock: number) => {
    updateMedicineMutation.mutate({
      id: medicine.id,
      data: { stockQuantity: newStock }
    });
  };

  const getStockStatus = (medicine: Medicine) => {
    if (medicine.stockQuantity <= 10) return "critical";
    if (medicine.stockQuantity <= medicine.lowStockThreshold) return "low";
    return "normal";
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case "critical": return "bg-urgent-red/10 text-urgent-red border-urgent-red/20";
      case "low": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-success-green/10 text-success-green border-success-green/20";
    }
  };

  const totalValue = medicines.reduce((sum, med) => sum + (parseFloat(med.unitPrice) * med.stockQuantity), 0);
  const criticalItems = medicines.filter(med => med.stockQuantity <= 10).length;

  if (isLoading) {
    return <div className="flex justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-professional-dark">Medicine Inventory</h1>
          <p className="text-gray-600">Monitor medicine stock and inventory levels</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            className="bg-medical-teal hover:bg-medical-teal/90"
            onClick={() => setIsAddMedicineModalOpen(true)}
          >
            <Plus className="mr-2" size={16} />
            Add Medicine
          </Button>
          <Button 
            variant="outline"
            className="border-medical-teal text-medical-teal hover:bg-medical-teal hover:text-white"
            onClick={() => setIsBulkImportModalOpen(true)}
          >
            <Upload className="mr-2" size={16} />
            Bulk Import
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-professional-dark mt-2">{medicines.length}</p>
              </div>
              <div className="w-12 h-12 bg-medical-teal/10 rounded-lg flex items-center justify-center">
                <Package className="text-medical-teal" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-professional-dark mt-2">{formatCurrency(totalValue)}</p>
              </div>
              <div className="w-12 h-12 bg-success-green/10 rounded-lg flex items-center justify-center">
                <TrendingDown className="text-success-green" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-urgent-red mt-2">{lowStockMedicines.length}</p>
              </div>
              <div className="w-12 h-12 bg-urgent-red/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-urgent-red" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Items</p>
                <p className="text-2xl font-bold text-urgent-red mt-2">{criticalItems}</p>
              </div>
              <div className="w-12 h-12 bg-urgent-red/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-urgent-red" size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockMedicines.length > 0 && (
        <Card className="border border-urgent-red/20 bg-urgent-red/5">
          <CardHeader>
            <CardTitle className="text-urgent-red flex items-center">
              <AlertTriangle className="mr-2" size={20} />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockMedicines.map((medicine) => (
                <div key={medicine.id} className="bg-white border border-urgent-red/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-professional-dark">{medicine.name}</h4>
                    <Badge className="bg-urgent-red/10 text-urgent-red">
                      {medicine.stockQuantity} {medicine.unit}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{medicine.category}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle>Medicine Inventory</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-medical-teal focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category || ""}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Medicine</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Buy Price</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Threshold</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMedicines.map((medicine) => {
                  const status = getStockStatus(medicine);
                  const stockValue = parseFloat(medicine.unitPrice) * medicine.stockQuantity;
                  
                  return (
                    <tr key={medicine.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-professional-dark">{medicine.name}</div>
                        <div className="text-sm text-gray-500">{medicine.unit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{medicine.category || 'Uncategorized'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-professional-dark">
                          {formatCurrency(medicine.buyPrice)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-professional-dark">
                          {formatCurrency(medicine.unitPrice)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={medicine.stockQuantity}
                            onChange={(e) => handleStockUpdate(medicine, parseInt(e.target.value) || 0)}
                            className="w-20 h-8"
                            disabled={updateMedicineMutation.isPending}
                          />
                          <span className="text-sm text-gray-500">{medicine.unit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{medicine.lowStockThreshold}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStockColor(status)}>
                          {status === "critical" ? "Critical" : status === "low" ? "Low Stock" : "In Stock"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-success-green">
                          {formatCurrency((parseFloat(medicine.unitPrice) - parseFloat(medicine.buyPrice)) * medicine.stockQuantity)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-medical-teal hover:text-soft-blue"
                            >
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingMedicine(medicine)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingMedicine(medicine)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Medicine
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeletingMedicine(medicine)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredMedicines.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No medicines found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddMedicineModal 
        isOpen={isAddMedicineModalOpen}
        onClose={() => setIsAddMedicineModalOpen(false)}
      />
      
      <BulkImportModal 
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
      />

      {/* Edit Medicine Modal */}
      <Dialog open={!!editingMedicine} onOpenChange={() => setEditingMedicine(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
          </DialogHeader>
          {editingMedicine && (
            <div className="space-y-4">
              <div>
                <Label>Medicine Name</Label>
                <Input defaultValue={editingMedicine.name} />
              </div>
              <div>
                <Label>Category</Label>
                <Input defaultValue={editingMedicine.category || ""} />
              </div>
              <div>
                <Label>Buy Price</Label>
                <Input defaultValue={editingMedicine.buyPrice} />
              </div>
              <div>
                <Label>Unit Price</Label>
                <Input defaultValue={editingMedicine.unitPrice} />
              </div>
              <div>
                <Label>Stock Quantity</Label>
                <Input defaultValue={editingMedicine.stockQuantity} />
              </div>
              <div>
                <Label>Low Stock Threshold</Label>
                <Input defaultValue={editingMedicine.lowStockThreshold} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMedicine(null)}>
              Cancel
            </Button>
            <Button>Update Medicine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingMedicine} onOpenChange={() => setDeletingMedicine(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Medicine</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete "{deletingMedicine?.name}"? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMedicine(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingMedicine && deleteMedicineMutation.mutate(deletingMedicine.id)}
              disabled={deleteMedicineMutation.isPending}
            >
              {deleteMedicineMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
