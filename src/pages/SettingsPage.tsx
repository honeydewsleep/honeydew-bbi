import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Building2, Package, Bell } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [reorderPoint, setReorderPoint] = useState("10");
  const [reorderQty, setReorderQty] = useState("50");
  const [lowStockThreshold, setLowStockThreshold] = useState("20");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState("");

  const { data: settings = [] } = useQuery({
    queryKey: ["appSettings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*");
      return data || [];
    },
  });

  useEffect(() => {
    const map: Record<string, string> = {};
    settings.forEach((s) => { map[s.setting_key] = s.setting_value; });
    if (map.business_name) setBusinessName(map.business_name);
    if (map.currency) setCurrency(map.currency);
    if (map.default_reorder_point) setReorderPoint(map.default_reorder_point);
    if (map.default_reorder_qty) setReorderQty(map.default_reorder_qty);
    if (map.low_stock_threshold) setLowStockThreshold(map.low_stock_threshold);
    if (map.email_notifications) setEmailNotifications(map.email_notifications === "true");
    if (map.notification_email) setNotificationEmail(map.notification_email);
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: async ({ key, value, type, description }: { key: string; value: string; type: string; description: string }) => {
      const existing = settings.find((s) => s.setting_key === key);
      if (existing) {
        const { error } = await supabase.from("app_settings").update({ setting_value: value }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("app_settings").insert({ setting_key: key, setting_value: value, setting_type: type, description });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appSettings"] }),
  });

  const saveBusinessSettings = async () => {
    try {
      await Promise.all([
        saveSetting.mutateAsync({ key: "business_name", value: businessName, type: "business", description: "Business name" }),
        saveSetting.mutateAsync({ key: "currency", value: currency, type: "business", description: "Default currency" }),
      ]);
      toast.success("Business settings saved");
    } catch { toast.error("Failed to save"); }
  };

  const saveInventoryDefaults = async () => {
    try {
      await Promise.all([
        saveSetting.mutateAsync({ key: "default_reorder_point", value: reorderPoint, type: "inventory", description: "Default reorder point" }),
        saveSetting.mutateAsync({ key: "default_reorder_qty", value: reorderQty, type: "inventory", description: "Default reorder quantity" }),
        saveSetting.mutateAsync({ key: "low_stock_threshold", value: lowStockThreshold, type: "inventory", description: "Low stock threshold %" }),
      ]);
      toast.success("Inventory defaults saved");
    } catch { toast.error("Failed to save"); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your application</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList>
          <TabsTrigger value="business" className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Business</TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2"><Package className="h-4 w-4" /> Inventory</TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Business Settings</CardTitle>
              <CardDescription>General business configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <Button onClick={saveBusinessSettings}>Save</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Inventory Defaults</CardTitle>
              <CardDescription>Default values for new products</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Reorder Point</Label>
                  <Input type="number" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Quantity</Label>
                  <Input type="number" value={reorderQty} onChange={(e) => setReorderQty(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Low Stock %</Label>
                  <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
                </div>
              </div>
              <Button onClick={saveInventoryDefaults}>Save</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Email Notifications</Label>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="space-y-2">
                <Label>Notification Email</Label>
                <Input type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
