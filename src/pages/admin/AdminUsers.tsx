import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCircle, Shield, Pencil, Trash2, Search, Plus } from "lucide-react";
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
  id: string;
  user_id: string;
  role: string;
}

const ROLES = ["admin", "student", "counselor"];

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("student");
  const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("id, user_id, role"),
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
    return userRoles.filter((r) => r.user_id === userId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const openEditDialog = (profile: Profile) => {
    setEditingProfile(profile);
    setEditForm({
      full_name: profile.full_name || "",
      email: profile.email || "",
      phone: profile.phone || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name || null,
          email: editForm.email || null,
          phone: editForm.phone || null,
        })
        .eq("id", editingProfile.id);

      if (error) throw error;
      toast({ title: "Success", description: "Profile updated successfully" });
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRoleDialog = (userId: string) => {
    setSelectedUserId(userId);
    setNewRole("student");
    setIsRoleDialogOpen(true);
  };

  const handleAddRole = async () => {
    if (!selectedUserId) return;
    setIsSubmitting(true);

    try {
      const existing = userRoles.find(
        (r) => r.user_id === selectedUserId && r.role === newRole
      );
      if (existing) {
        toast({ title: "Info", description: "User already has this role" });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("user_roles").insert([{
        user_id: selectedUserId,
        role: newRole as "admin" | "student" | "counselor",
      }]);

      if (error) throw error;
      toast({ title: "Success", description: `Role "${newRole}" assigned successfully` });
      setIsRoleDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error adding role:", error);
      toast({ title: "Error", description: "Failed to assign role", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Remove "${roleName}" role from this user?`)) return;

    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
      toast({ title: "Success", description: `Role "${roleName}" removed` });
      fetchData();
    } catch (error) {
      console.error("Error removing role:", error);
      toast({ title: "Error", description: "Failed to remove role", variant: "destructive" });
    }
  };

  // HARD DELETE: permanently removes user from auth + all data
  const handleDeleteUser = async (profile: Profile) => {
    if (!confirm(`⚠️ PERMANENT DELETE\n\nAre you sure you want to permanently delete "${profile.full_name || profile.email || "this user"}"?\n\nThis action cannot be undone. The user will be removed from the system entirely and will need to register again.`)) return;

    setIsDeletingUser(profile.user_id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: profile.user_id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "User Deleted", description: "User has been permanently removed from the system." });
      fetchData();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    } finally {
      setIsDeletingUser(null);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground mt-1">
              Manage registered users, roles, and permissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="text-2xl font-bold text-foreground">{profiles.length}</div>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="text-2xl font-bold text-foreground">
                {userRoles.filter(r => r.role === "admin").length}
              </div>
              <p className="text-sm text-muted-foreground">Admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="text-2xl font-bold text-foreground">
                {userRoles.filter(r => r.role === "student").length}
              </div>
              <p className="text-sm text-muted-foreground">Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="text-2xl font-bold text-foreground">
                {userRoles.filter(r => r.role === "counselor").length}
              </div>
              <p className="text-sm text-muted-foreground">Counselors</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No users match your search." : "No users found."}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfiles.map((profile) => {
                        const roles = getUserRoles(profile.user_id);
                        return (
                          <TableRow key={profile.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback>
                                    <UserCircle className="w-5 h-5 text-primary" />
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{profile.full_name || "No name"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{profile.email || "-"}</TableCell>
                            <TableCell>{profile.phone || "-"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 items-center">
                                {roles.map((role) => (
                                  <Badge
                                    key={role.id}
                                    variant={role.role === "admin" ? "default" : "secondary"}
                                    className={`cursor-pointer ${
                                      role.role === "admin" ? "bg-primary text-primary-foreground" : ""
                                    }`}
                                    onClick={() => handleRemoveRole(role.id, role.role)}
                                    title={`Click to remove ${role.role} role`}
                                  >
                                    {role.role} ×
                                  </Badge>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-6 h-6"
                                  onClick={() => openRoleDialog(profile.user_id)}
                                  title="Add role"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(profile.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openRoleDialog(profile.user_id)}
                                  title="Manage roles"
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(profile)}
                                  title="Edit profile"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(profile)}
                                  className="text-destructive hover:text-destructive"
                                  title="Permanently delete user"
                                  disabled={isDeletingUser === profile.user_id}
                                >
                                  {isDeletingUser === profile.user_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile card view */}
                <div className="md:hidden p-4 space-y-3">
                  {filteredProfiles.map((profile) => {
                    const roles = getUserRoles(profile.user_id);
                    return (
                      <div
                        key={profile.id}
                        className="border rounded-lg p-3 flex items-start justify-between gap-3 bg-card"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarFallback>
                              <UserCircle className="w-5 h-5 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{profile.full_name || "No name"}</div>
                            <div className="text-sm text-muted-foreground">{profile.email || "-"}</div>
                            <div className="text-sm text-muted-foreground">{profile.phone || "-"}</div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {roles.map((role) => (
                                <Badge key={role.id} variant="secondary">
                                  {role.role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-sm text-muted-foreground">{formatDate(profile.created_at)}</div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openRoleDialog(profile.user_id)} title="Roles">
                              <Shield className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(profile)} title="Edit">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(profile)}
                              className="text-destructive"
                              disabled={isDeletingUser === profile.user_id}
                            >
                              {isDeletingUser === profile.user_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUserId && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Current roles:</Label>
                <div className="flex flex-wrap gap-1">
                  {getUserRoles(selectedUserId).map((r) => (
                    <Badge key={r.id} variant="secondary">{r.role}</Badge>
                  ))}
                  {getUserRoles(selectedUserId).length === 0 && (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRole} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
