import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Shield, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

type AppRole = "admin" | "executive" | "warehouse" | "fulfillment";

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data || [];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const existing = roles.find((r) => r.user_id === userId);
      if (existing) {
        const { error } = await supabase.from("user_roles").update({ role }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast.success("Role updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.currentTarget);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: fd.get("email"),
          password: fd.get("password"),
          full_name: fd.get("full_name"),
          role: fd.get("role"),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("User created successfully");
      setShowCreateUser(false);
      queryClient.invalidateQueries({ queryKey: ["profiles", "user-roles"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "executive": return "default";
      case "warehouse": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Button onClick={() => setShowCreateUser(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Create User
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {(["admin", "executive", "warehouse", "fulfillment"] as const).map((r) => (
          <Card key={r} className="border-border/50">
            <CardContent className="pt-6 flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground capitalize">{r}s</p>
                <p className="text-2xl font-bold">{roles.filter((ur) => ur.role === r).length}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Current Role</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const userRole = roles.find((r) => r.user_id === p.user_id);
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{p.full_name || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{p.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getRoleColor(userRole?.role || "") as any} className="capitalize">
                        {userRole?.role || "No role"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Select
                        value={userRole?.role || ""}
                        onValueChange={(val) => updateRole.mutate({ userId: p.user_id, role: val as AppRole })}
                      >
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Assign role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                          <SelectItem value="fulfillment">Fulfillment</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue="warehouse">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="fulfillment">Fulfillment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? "Creating..." : "Create User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
