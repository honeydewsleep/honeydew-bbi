import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdvancedInventory() {
  const queryClient = useQueryClient();
  const [showTransfer, setShowTransfer] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data || [];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_locations").select("*").order("name");
      return data || [];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["movements"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_movements").select("*").order("created_date", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const createMovement = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("inventory_movements").insert(data);
      if (error) throw error;

      // Update product stock
      const product = products.find((p) => p.id === data.product_id);
      if (product && data.movement_type === "purchase") {
        await supabase.from("products").update({ current_stock: (product.current_stock || 0) + data.quantity }).eq("id", product.id);
      } else if (product && data.movement_type === "sale") {
        await supabase.from("products").update({ current_stock: Math.max(0, (product.current_stock || 0) - data.quantity) }).eq("id", product.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movements", "products"] });
      setShowTransfer(false);
      toast.success("Movement recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMovement.mutate({
      product_id: fd.get("product_id"),
      quantity: parseInt(fd.get("quantity") as string) || 0,
      movement_type: fd.get("movement_type"),
      from_location_id: fd.get("from_location_id") || null,
      to_location_id: fd.get("to_location_id") || null,
      notes: fd.get("notes") || null,
    });
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case "purchase": return "default";
      case "sale": return "destructive";
      case "transfer": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Advanced Inventory</h1>
          <p className="text-muted-foreground">Transfers, movements, and stock adjustments</p>
        </div>
        <Button onClick={() => setShowTransfer(true)}>
          <Plus className="h-4 w-4 mr-2" /> Record Movement
        </Button>
      </div>

      {/* Recent Movements */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">Recent Movements</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Product</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Quantity</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const product = products.find((p) => p.id === m.product_id);
                return (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-4">{format(new Date(m.created_date), "MMM d, yyyy")}</td>
                    <td className="py-3 px-4">{product?.name || m.sku || "—"}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getMovementColor(m.movement_type) as any} className="capitalize">{m.movement_type}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                    <td className="py-3 px-4 text-muted-foreground">{m.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Movement Form */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Inventory Movement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select name="product_id" required>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Movement Type</Label>
              <Select name="movement_type" defaultValue="transfer">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="purchase">Purchase/Receive</SelectItem>
                  <SelectItem value="sale">Sale/Ship</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input name="quantity" type="number" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Location</Label>
                <Select name="from_location_id">
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Location</Label>
                <Select name="to_location_id">
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea name="notes" />
            </div>
            <Button type="submit" className="w-full" disabled={createMovement.isPending}>Record Movement</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
