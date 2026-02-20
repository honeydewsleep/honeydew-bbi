import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Shield, Users, Settings, BarChart3, Package } from "lucide-react";

export default function AdminGuide() {
  const sections = [
    {
      icon: Shield,
      title: "User Roles",
      content: "Assign roles to control access: Admin (full access), Executive (reports + analytics), Warehouse (inventory management), Fulfillment (basic warehouse operations).",
    },
    {
      icon: Users,
      title: "User Management",
      content: "Navigate to User Management to assign roles. The first user to sign up automatically receives the Admin role.",
    },
    {
      icon: Package,
      title: "Product Setup",
      content: "Add products with SKU, pricing, and stock levels. Set reorder points for low-stock alerts. Use SKU mappings for customer-specific SKUs.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      content: "Dashboard shows real-time KPIs. Financial Reports provides P&L analysis. Advanced Analytics offers channel breakdowns and customer segmentation.",
    },
    {
      icon: Settings,
      title: "Settings",
      content: "Configure business name, currency, inventory defaults, and notification preferences from the Settings page.",
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Guide</h1>
          <p className="text-muted-foreground">Everything you need to manage the platform</p>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((s) => (
          <Card key={s.title} className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
