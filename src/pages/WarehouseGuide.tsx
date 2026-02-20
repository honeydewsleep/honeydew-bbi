import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Package, ArrowLeftRight, History, MapPin } from "lucide-react";

export default function WarehouseGuide() {
  const sections = [
    {
      icon: Package,
      title: "Warehouse Inventory",
      content: "View real-time stock levels across all products. Filter by category, stock level, or search by SKU/name. Cards show location breakdowns.",
    },
    {
      icon: ArrowLeftRight,
      title: "Stock Movements",
      content: "Record transfers between locations, purchases, sales, and adjustments. Each movement updates stock levels automatically.",
    },
    {
      icon: MapPin,
      title: "Location Management",
      content: "Products can be tracked across multiple warehouse locations. Stock is tracked per-location for accurate fulfillment.",
    },
    {
      icon: History,
      title: "Inventory History",
      content: "Daily snapshots capture inventory levels. Use this to track stock changes over time and identify trends.",
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Warehouse Guide</h1>
          <p className="text-muted-foreground">Guide for warehouse and fulfillment operations</p>
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
