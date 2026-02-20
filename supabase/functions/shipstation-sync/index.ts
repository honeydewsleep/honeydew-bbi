import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShipStationOrder {
  orderId: number;
  orderNumber: string;
  orderKey: string;
  orderDate: string;
  orderStatus: string;
  customerEmail: string;
  shipTo: { name: string; company?: string };
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    shippingAmount?: number;
  }>;
  orderTotal: number;
  shippingAmount: number;
  amountPaid: number;
  advancedOptions?: { storeId?: number; source?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SHIPSTATION_API_KEY = Deno.env.get("SHIPSTATION_API_KEY");
  const SHIPSTATION_API_SECRET = Deno.env.get("SHIPSTATION_API_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!SHIPSTATION_API_KEY || !SHIPSTATION_API_SECRET) {
    return new Response(JSON.stringify({ error: "ShipStation credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const authHeader = btoa(`${SHIPSTATION_API_KEY}:${SHIPSTATION_API_SECRET}`);

  try {
    // Get sync settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "shipstation_last_sync")
      .single();

    const lastSync = settings?.setting_value
      ? new Date(settings.setting_value)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const modifyDateStart = lastSync.toISOString();
    const modifyDateEnd = new Date().toISOString();

    let page = 1;
    let totalPages = 1;
    let totalSynced = 0;

    while (page <= totalPages) {
      const url = `https://ssapi.shipstation.com/orders?modifyDateStart=${encodeURIComponent(modifyDateStart)}&modifyDateEnd=${encodeURIComponent(modifyDateEnd)}&page=${page}&pageSize=100&sortBy=ModifyDate&sortDir=ASC`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ShipStation API error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      totalPages = data.pages || 1;
      const orders: ShipStationOrder[] = data.orders || [];

      for (const order of orders) {
        // Upsert customer
        const customerEmail = order.customerEmail || `${order.orderNumber}@unknown.com`;
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("email", customerEmail)
          .single();

        let customerId: string;
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({
              name: order.shipTo?.name || "Unknown",
              email: customerEmail,
              company: order.shipTo?.company || null,
              channel: order.advancedOptions?.source || "shipstation",
              status: "active",
            })
            .select("id")
            .single();
          customerId = newCustomer!.id;
        }

        // Create transaction for each order item
        for (const item of order.items || []) {
          const { data: existingTx } = await supabase
            .from("transactions")
            .select("id")
            .eq("order_id", String(order.orderId))
            .eq("sku", item.sku)
            .single();

          if (!existingTx) {
            const unitShipping = order.items.length > 0
              ? (order.shippingAmount || 0) / order.items.length
              : 0;

            await supabase.from("transactions").insert({
              type: "revenue",
              amount: item.unitPrice * item.quantity,
              description: `${item.name} - Order #${order.orderNumber}`,
              category: "product_sales",
              channel: order.advancedOptions?.source || "shipstation",
              order_id: String(order.orderId),
              sku: item.sku,
              quantity: item.quantity,
              customer_id: customerId,
              shipping_cost: order.shippingAmount || 0,
              unit_shipping_cost: unitShipping,
              date: order.orderDate ? order.orderDate.split("T")[0] : new Date().toISOString().split("T")[0],
            });

            totalSynced++;
          }
        }
      }

      page++;
    }

    // Update last sync time
    await supabase.from("app_settings").upsert(
      {
        setting_key: "shipstation_last_sync",
        setting_value: modifyDateEnd,
        setting_type: "integration",
        description: "Last ShipStation sync timestamp",
      },
      { onConflict: "setting_key" }
    );

    return new Response(
      JSON.stringify({ success: true, synced: totalSynced, lastSync: modifyDateEnd }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("ShipStation sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
