import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const today = new Date().toISOString().split("T")[0];

    // Delete any existing snapshots for today (idempotent)
    await supabase.from("inventory_snapshots").delete().eq("snapshot_date", today);

    // Get all active products
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true);

    if (prodErr) throw prodErr;

    // Get all location stocks
    const { data: locationStocks } = await supabase
      .from("product_location_stocks")
      .select("*, inventory_locations(name)");

    const snapshots = (products || []).map((product) => {
      const prodStocks = (locationStocks || []).filter((ls) => ls.product_id === product.id);
      const locationBreakdown = prodStocks.map((ls: any) => ({
        location_id: ls.location_id,
        location_name: ls.inventory_locations?.name || "Unknown",
        quantity: ls.quantity || 0,
      }));

      return {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        snapshot_date: today,
        total_stock: product.current_stock || 0,
        cost: product.cost || 0,
        reorder_point: product.reorder_point || 10,
        location_breakdown: locationBreakdown,
      };
    });

    if (snapshots.length > 0) {
      const { error: insertErr } = await supabase.from("inventory_snapshots").insert(snapshots);
      if (insertErr) throw insertErr;
    }

    return new Response(
      JSON.stringify({ success: true, snapshotDate: today, productsSnapped: snapshots.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Inventory snapshot error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
