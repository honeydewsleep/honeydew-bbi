import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ProductManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data || [];
    },
  });

  const upsertProduct = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const { error } = await supabase.from("products").update(data).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowForm(false);
      setEditing(null);
      toast.success(editing ? "Product updated" : "Product created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
  });

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsertProduct.mutate({
      sku: fd.get("sku") as string,
      name: fd.get("name") as string,
      category: fd.get("category") as string || null,
      cost: parseFloat(fd.get("cost") as string) || 0,
      retail_price: parseFloat(fd.get("retail_price") as string) || 0,
      wholesale_price: parseFloat(fd.get("wholesale_price") as string) || 0,
      current_stock: parseInt(fd.get("current_stock") as string) || 0,
      reorder_point: parseInt(fd.get("reorder_point") as string) || 10,
      reorder_quantity: parseInt(fd.get("reorder_quantity") as string) || 50,
      supplier: fd.get("supplier") as string || null,
      description: fd.get("description") as string || null,
      is_active: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="border-border/50">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {p.sku} • {p.category || "No category"}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Stock</p>
                  <Badge variant={(p.current_stock || 0) <= (p.reorder_point || 10) ? "destructive" : "secondary"}>
                    {p.current_stock || 0}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">${p.retail_price?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setShowForm(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteProduct.mutate(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" defaultValue={editing?.sku || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editing?.name || ""} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={editing?.category || ""} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <Input id="cost" name="cost" type="number" step="0.01" defaultValue={editing?.cost || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retail_price">Retail</Label>
                <Input id="retail_price" name="retail_price" type="number" step="0.01" defaultValue={editing?.retail_price || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wholesale_price">Wholesale</Label>
                <Input id="wholesale_price" name="wholesale_price" type="number" step="0.01" defaultValue={editing?.wholesale_price || ""} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_stock">Stock</Label>
                <Input id="current_stock" name="current_stock" type="number" defaultValue={editing?.current_stock || 0} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorder_point">Reorder Point</Label>
                <Input id="reorder_point" name="reorder_point" type="number" defaultValue={editing?.reorder_point || 10} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorder_quantity">Reorder Qty</Label>
                <Input id="reorder_quantity" name="reorder_quantity" type="number" defaultValue={editing?.reorder_quantity || 50} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input id="supplier" name="supplier" defaultValue={editing?.supplier || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={editing?.description || ""} />
            </div>
            <Button type="submit" className="w-full" disabled={upsertProduct.isPending}>
              {editing ? "Update Product" : "Create Product"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
