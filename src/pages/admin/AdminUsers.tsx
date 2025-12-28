import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setProfiles(profilesRes.data || []);
      setUserRoles(rolesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getUserRoles = (userId: string) => {
    return userRoles
      .filter((r) => r.user_id === userId)
      .map((r) => r.role);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">
            View registered users and their roles
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => {
                    const roles = getUserRoles(profile.user_id);
                    return (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserCircle className="w-6 h-6 text-primary" />
                            </div>
                            <span className="font-medium">
                              {profile.full_name || "No name"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{profile.email || "-"}</TableCell>
                        <TableCell>{profile.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {roles.map((role) => (
                              <Badge
                                key={role}
                                variant={role === "admin" ? "default" : "secondary"}
                                className={
                                  role === "admin"
                                    ? "bg-primary text-primary-foreground"
                                    : ""
                                }
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(profile.created_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
