import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const TEMPLATE_HEADERS = [
  "sku",
  "name",
  "category",
  "cost",
  "retail_price",
  "wholesale_price",
  "current_stock",
  "reorder_point",
  "reorder_quantity",
  "supplier",
  "description",
  "barcode",
];

function downloadTemplate() {
  const csvContent = TEMPLATE_HEADERS.join(",") + "\nEXAMPLE-001,Example Product,Category,10.00,29.99,19.99,100,10,50,Supplier Name,A sample product,1234567890";
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "product_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = values[idx] || ""));
    rows.push(row);
  }
  return rows;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductImportDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"choose" | "preview" | "importing" | "done">("choose");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState(0);
  const [failed, setFailed] = useState(0);

  const reset = () => {
    setStep("choose");
    setRows([]);
    setErrors([]);
    setProgress(0);
    setImported(0);
    setFailed(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      const errs: string[] = [];
      parsed.forEach((r, i) => {
        if (!r.sku?.trim()) errs.push(`Row ${i + 2}: Missing SKU`);
        if (!r.name?.trim()) errs.push(`Row ${i + 2}: Missing Name`);
      });
      setRows(parsed);
      setErrors(errs);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const valid = rows.filter((r) => r.sku?.trim() && r.name?.trim());
    if (valid.length === 0) return;
    setStep("importing");
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < valid.length; i++) {
      const r = valid[i];
      const { error } = await supabase.from("products").insert({
        sku: r.sku.trim(),
        name: r.name.trim(),
        category: r.category?.trim() || null,
        cost: parseFloat(r.cost) || 0,
        retail_price: parseFloat(r.retail_price) || 0,
        wholesale_price: parseFloat(r.wholesale_price) || 0,
        current_stock: parseInt(r.current_stock) || 0,
        reorder_point: parseInt(r.reorder_point) || 10,
        reorder_quantity: parseInt(r.reorder_quantity) || 50,
        supplier: r.supplier?.trim() || null,
        description: r.description?.trim() || null,
        barcode: r.barcode?.trim() || null,
        is_active: true,
      });
      if (error) fail++;
      else ok++;
      setProgress(Math.round(((i + 1) / valid.length) * 100));
      setImported(ok);
      setFailed(fail);
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setStep("done");
    toast.success(`Imported ${ok} product${ok !== 1 ? "s" : ""}${fail ? `, ${fail} failed` : ""}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Import Products
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file to bulk-import products. Need a starting point?
            </p>
            <Button variant="outline" className="w-full" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Download Template (.csv)
            </Button>
            <div className="space-y-2">
              <Label>Select CSV file</Label>
              <Input ref={fileRef} type="file" accept=".csv" onChange={handleFile} />
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{rows.length} rows found</Badge>
              {errors.length > 0 && (
                <Badge variant="destructive">{errors.length} error{errors.length !== 1 ? "s" : ""}</Badge>
              )}
            </div>
            {errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-sm space-y-1 bg-destructive/10 p-3 rounded-md">
                {errors.map((e, i) => (
                  <p key={i} className="flex items-center gap-1.5 text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" /> {e}
                  </p>
                ))}
              </div>
            )}
            <div className="max-h-48 overflow-auto border rounded-md">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-2 py-1 text-left">SKU</th>
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">Category</th>
                    <th className="px-2 py-1 text-right">Cost</th>
                    <th className="px-2 py-1 text-right">Retail</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="px-2 py-1 font-mono">{r.sku}</td>
                      <td className="px-2 py-1">{r.name}</td>
                      <td className="px-2 py-1">{r.category}</td>
                      <td className="px-2 py-1 text-right">{r.cost}</td>
                      <td className="px-2 py-1 text-right">{r.retail_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <p className="text-xs text-muted-foreground p-2">...and {rows.length - 20} more rows</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} className="flex-1">Back</Button>
              <Button
                onClick={handleImport}
                className="flex-1"
                disabled={rows.filter((r) => r.sku?.trim() && r.name?.trim()).length === 0}
              >
                <Upload className="h-4 w-4 mr-2" /> Import {rows.filter((r) => r.sku?.trim() && r.name?.trim()).length} Products
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-4">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Importing... {imported + failed} / {rows.filter((r) => r.sku?.trim() && r.name?.trim()).length}
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
            <p className="font-medium">{imported} product{imported !== 1 ? "s" : ""} imported</p>
            {failed > 0 && <p className="text-sm text-destructive">{failed} failed (duplicate SKU?)</p>}
            <Button onClick={() => handleClose(false)} className="w-full">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
