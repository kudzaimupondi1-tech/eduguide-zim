import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, CreditCard, RefreshCw, Loader2, DollarSign, Users, Eye, EyeOff, FileSearch, ArrowDownUp, CheckCircle2, XCircle, AlertCircle, Clock, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  university_count: number;
  phone_number: string;
  status: string;
  ecocash_reference: string | null;
  client_correlator: string;
  reference_code: string;
  created_at: string;
  updated_at: string;
  student_level: string | null;
  refund_status: string | null;
  refund_notes: string | null;
  refunded_at: string | null;
  transaction_data: any;
  profiles?: { full_name: string | null; email: string | null; recommendation_viewed_at: string | null } | null;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewedFilter, setViewedFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundNotes, setRefundNotes] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("payments");

  const [queryClientCorrelator, setQueryClientCorrelator] = useState("");
  const [queryPhoneNumber, setQueryPhoneNumber] = useState("");

  const { toast } = useToast();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email, recommendation_viewed_at").in("user_id", userIds);

      const enriched = (data || []).map(p => ({
        ...p,
        profiles: profiles?.find(pr => pr.user_id === p.user_id) || null,
      }));
      setPayments(enriched);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load payments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const handleRefund = async (action: "approved" | "rejected") => {
    if (!selectedPayment) return;
    setRefundLoading(true);
    try {
      if (action === "approved") {
        const { data, error } = await supabase.functions.invoke("ecocash-refund", {
          body: { payment_id: selectedPayment.id, refund_notes: refundNotes },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        toast({ title: "Success", description: data.message || "Refund processed" });
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const { error } = await supabase.from("payments").update({
          refund_status: "rejected",
          refund_notes: refundNotes,
          refunded_at: new Date().toISOString(),
          refunded_by: session?.user?.id,
        } as any).eq("id", selectedPayment.id);
        if (error) throw error;
        toast({ title: "Refund Rejected", description: "Refund request has been rejected" });
      }
      setSelectedPayment(null);
      setRefundNotes("");
      fetchPayments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to process refund", variant: "destructive" });
    } finally {
      setRefundLoading(false);
    }
  };

  const handleQueryTransaction = async (clientCorrelator?: string, phoneNumber?: string) => {
    const cc = clientCorrelator || queryClientCorrelator;
    const pn = phoneNumber || queryPhoneNumber;
    if (!cc) {
      toast({ title: "Error", description: "Please enter a client correlator", variant: "destructive" });
      return;
    }
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ecocash-query", {
        body: { client_correlator: cc, phone_number: pn },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setQueryResult(data.transaction);
      toast({ title: "Query Complete", description: "Transaction details retrieved" });
      fetchPayments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Query failed", variant: "destructive" });
    } finally {
      setQueryLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    setDeleteLoading(paymentId);
    try {
      const { error } = await supabase.from("payments").delete().eq("id", paymentId);
      if (error) throw error;
      toast({ title: "Deleted", description: "Payment record deleted successfully" });
      fetchPayments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete payment", variant: "destructive" });
    } finally {
      setDeleteLoading(null);
    }
  };

  const hasViewedRecommendations = (p: Payment) => {
    return !!p.profiles?.recommendation_viewed_at;
  };

  const filtered = payments.filter(p => {
    const matchesSearch = searchQuery === "" ||
      p.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_correlator.includes(searchQuery) ||
      p.phone_number.includes(searchQuery) ||
      (p.ecocash_reference || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesDate = !dateFilter || p.created_at.startsWith(dateFilter);
    const matchesViewed = viewedFilter === "all" ||
      (viewedFilter === "viewed" && hasViewedRecommendations(p)) ||
      (viewedFilter === "not_viewed" && !hasViewedRecommendations(p));
    return matchesSearch && matchesStatus && matchesDate && matchesViewed;
  });

  const totalRevenue = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);
  const totalTransactions = payments.length;
  const pendingRefunds = payments.filter(p => p.refund_status === "pending").length;
  const notViewedCount = payments.filter(p => p.status === "completed" && !hasViewedRecommendations(p)).length;
  const refundablePayments = payments.filter(p => p.status === "completed" && p.refund_status !== "approved");

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "failed": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "refunded": return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800";
      case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "failed": return <XCircle className="w-3.5 h-3.5" />;
      case "pending": return <Clock className="w-3.5 h-3.5" />;
      case "refunded": return <RefreshCw className="w-3.5 h-3.5" />;
      default: return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  const RecommendationBadge = ({ payment }: { payment: Payment }) => {
    const viewed = hasViewedRecommendations(payment);
    const viewedAt = payment.profiles?.recommendation_viewed_at;

    if (payment.status !== "completed") return <span className="text-xs text-muted-foreground">—</span>;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-default transition-colors ${
              viewed
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800"
            }`}>
              {viewed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {viewed ? "Viewed" : "Not Viewed"}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px]">
            {viewed && viewedAt ? (
              <p className="text-xs">Viewed {formatDistanceToNow(new Date(viewedAt), { addSuffix: true })}<br />{format(new Date(viewedAt), "MMM d, yyyy HH:mm")}</p>
            ) : (
              <p className="text-xs">Student has not viewed recommendations yet. Eligible for refund.</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Payments</h1>
            <p className="text-muted-foreground mt-1">Manage payments, track recommendation views, and process refunds</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</p>
                  <p className="text-2xl font-bold text-foreground mt-1">${totalRevenue.toFixed(2)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transactions</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalTransactions}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Not Viewed</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{notViewedCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Paid but unseen</p>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                  <EyeOff className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Refunds</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{pendingRefunds}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="payments" className="flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4" /> All Payments</TabsTrigger>
            <TabsTrigger value="refunds" className="flex items-center gap-2 text-sm"><RefreshCw className="w-4 h-4" /> Refunds</TabsTrigger>
            <TabsTrigger value="query" className="flex items-center gap-2 text-sm"><FileSearch className="w-4 h-4" /> Query</TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, reference, phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={viewedFilter} onValueChange={setViewedFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Rec. Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Views</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="not_viewed">Not Viewed</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-[160px]" />
            </div>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /><span className="ml-2 text-sm text-muted-foreground">Loading payments...</span></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="font-semibold">Student</TableHead>
                          <TableHead className="font-semibold">Level</TableHead>
                          <TableHead className="font-semibold">Amount</TableHead>
                          <TableHead className="font-semibold">Unis</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Recommendations</TableHead>
                          <TableHead className="font-semibold">Date</TableHead>
                          <TableHead className="font-semibold text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <CreditCard className="w-8 h-8 text-muted-foreground/50" />
                              <p>No payments found</p>
                            </div>
                          </TableCell></TableRow>
                        ) : filtered.map(p => (
                          <TableRow key={p.id} className="group hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm text-foreground">{p.profiles?.full_name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{p.profiles?.email || ""}</p>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-xs font-normal">{p.student_level || "N/A"}</Badge></TableCell>
                            <TableCell className="font-semibold text-foreground">${p.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-sm">{p.university_count === 0 ? "All" : p.university_count}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs border ${statusBadgeVariant(p.status)} flex items-center gap-1 w-fit`}>
                                <StatusIcon status={p.status} />
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell><RecommendationBadge payment={p} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(p.created_at), "MMM d, yyyy")}<br /><span className="text-[10px]">{format(new Date(p.created_at), "HH:mm")}</span></TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedPayment(p); setRefundNotes(p.refund_notes || ""); }}>
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View Details</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleQueryTransaction(p.client_correlator, p.phone_number)} disabled={queryLoading}>
                                        <ArrowDownUp className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Query EcoCash</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <AlertDialog>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deleteLoading === p.id}>
                                            {deleteLoading === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                          </Button>
                                        </AlertDialogTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>Delete Payment</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this payment by <strong>{p.profiles?.full_name || "Unknown"}</strong> for <strong>${p.amount.toFixed(2)}</strong>? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeletePayment(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground text-right">{filtered.length} of {payments.length} payments</p>
          </TabsContent>

          {/* Refunds Tab */}
          <TabsContent value="refunds" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><RefreshCw className="w-5 h-5 text-primary" /> Refundable Payments</CardTitle>
                <CardDescription>Completed payments eligible for refund. Students who haven't viewed recommendations are highlighted.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="font-semibold">Student</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Phone</TableHead>
                        <TableHead className="font-semibold">Recommendations</TableHead>
                        <TableHead className="font-semibold">Refund Status</TableHead>
                        <TableHead className="font-semibold">Paid On</TableHead>
                        <TableHead className="font-semibold text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refundablePayments.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-8 h-8 text-muted-foreground/50" />
                            <p>No refundable payments</p>
                          </div>
                        </TableCell></TableRow>
                      ) : refundablePayments.map(p => {
                        const notViewed = !hasViewedRecommendations(p);
                        return (
                          <TableRow key={p.id} className={notViewed ? "bg-orange-50/50 dark:bg-orange-950/10" : ""}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{p.profiles?.full_name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{p.profiles?.email || ""}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">${p.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-sm font-mono">{p.phone_number}</TableCell>
                            <TableCell><RecommendationBadge payment={p} /></TableCell>
                            <TableCell>
                              {p.refund_status ? (
                                <Badge variant="outline" className="text-xs capitalize">{p.refund_status}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">None</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(p.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                            <TableCell className="text-center">
                              <Button size="sm" variant={notViewed ? "default" : "outline"} onClick={() => { setSelectedPayment(p); setRefundNotes(""); }}>
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> {notViewed ? "Refund" : "Process"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Query Transaction Tab */}
          <TabsContent value="query" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><FileSearch className="w-5 h-5 text-primary" /> Query EcoCash Transaction</CardTitle>
                <CardDescription>Look up the real-time status of a transaction from EcoCash</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Client Correlator *</Label>
                    <Input placeholder="e.g. 17729548411021307" value={queryClientCorrelator} onChange={e => setQueryClientCorrelator(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Phone Number</Label>
                    <Input placeholder="e.g. 0783495070" value={queryPhoneNumber} onChange={e => setQueryPhoneNumber(e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => handleQueryTransaction()} disabled={queryLoading || !queryClientCorrelator}>
                  {queryLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Query Transaction
                </Button>

                {queryResult && (
                  <div className="mt-4 border border-border rounded-xl p-5 bg-muted/20 space-y-3">
                    <h4 className="font-semibold text-foreground">Transaction Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><Label className="text-xs text-muted-foreground">Status</Label><p className="mt-0.5"><Badge className={statusBadgeVariant(queryResult.transactionOperationStatus === "COMPLETED" ? "completed" : queryResult.transactionOperationStatus === "FAILED" ? "failed" : "pending")}>{queryResult.transactionOperationStatus}</Badge></p></div>
                      <div><Label className="text-xs text-muted-foreground">EcoCash Reference</Label><p className="font-mono text-xs mt-0.5">{queryResult.ecocashReference || "N/A"}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Amount</Label><p className="font-semibold mt-0.5">{queryResult.paymentAmount?.charginginformation?.currency} {queryResult.paymentAmount?.charginginformation?.amount}</p></div>
                      <div><Label className="text-xs text-muted-foreground">End User</Label><p className="font-mono text-xs mt-0.5">{queryResult.endUserId}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Server Reference</Label><p className="font-mono text-xs mt-0.5">{queryResult.serverReferenceCode || "N/A"}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Client Correlator</Label><p className="font-mono text-xs mt-0.5">{queryResult.clientCorrelator}</p></div>
                      {queryResult.transactionDate > 0 && (
                        <div><Label className="text-xs text-muted-foreground">Transaction Date</Label><p className="text-xs mt-0.5">{format(new Date(queryResult.transactionDate), "MMM d, yyyy HH:mm:ss")}</p></div>
                      )}
                      <div><Label className="text-xs text-muted-foreground">Remarks</Label><p className="text-xs mt-0.5">{queryResult.remarks || "N/A"}</p></div>
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">View Raw Response</summary>
                      <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-60">{JSON.stringify(queryResult, null, 2)}</pre>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Quick Lookup from Recent Payments</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/40">
                      <TableHead>Student</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {payments.slice(0, 10).map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{p.profiles?.full_name || "Unknown"}</TableCell>
                          <TableCell className="font-mono text-xs">{p.client_correlator}</TableCell>
                          <TableCell><Badge className={`text-xs border ${statusBadgeVariant(p.status)} flex items-center gap-1 w-fit`}><StatusIcon status={p.status} />{p.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(p.created_at), "MMM d HH:mm")}</TableCell>
                          <TableCell className="text-center">
                            <Button size="sm" variant="outline" onClick={() => handleQueryTransaction(p.client_correlator, p.phone_number)} disabled={queryLoading}>
                              <FileSearch className="w-3.5 h-3.5 mr-1" /> Query
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Detail / Refund Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={open => { if (!open) setSelectedPayment(null); }}>
        <DialogContent className="max-w-lg">
          {selectedPayment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">Payment Details</DialogTitle>
                <DialogDescription>Reference: {selectedPayment.reference_code}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 text-sm">
                {/* Recommendation Status Banner */}
                {selectedPayment.status === "completed" && (
                  <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                    hasViewedRecommendations(selectedPayment)
                      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                      : "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800"
                  }`}>
                    {hasViewedRecommendations(selectedPayment) ? (
                      <>
                        <Eye className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-emerald-700 dark:text-emerald-400">Recommendations Viewed</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                            Student viewed recommendations on {format(new Date(selectedPayment.profiles!.recommendation_viewed_at!), "MMM d, yyyy 'at' HH:mm")}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-orange-700 dark:text-orange-400">Not Viewed Yet</p>
                          <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">
                            Student paid but has <strong>not yet viewed</strong> their recommendations. This payment is eligible for a full refund.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div><Label className="text-xs text-muted-foreground">Student</Label><p className="font-medium">{selectedPayment.profiles?.full_name || "Unknown"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Email</Label><p>{selectedPayment.profiles?.email || "N/A"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Amount</Label><p className="font-bold text-foreground">${selectedPayment.amount.toFixed(2)} {selectedPayment.currency}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Status</Label><p><Badge className={`text-xs border ${statusBadgeVariant(selectedPayment.status)} flex items-center gap-1 w-fit`}><StatusIcon status={selectedPayment.status} />{selectedPayment.status}</Badge></p></div>
                  <div><Label className="text-xs text-muted-foreground">Level</Label><p>{selectedPayment.student_level || "N/A"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Universities</Label><p>{selectedPayment.university_count === 0 ? "All" : selectedPayment.university_count}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Phone</Label><p className="font-mono">{selectedPayment.phone_number}</p></div>
                  <div><Label className="text-xs text-muted-foreground">EcoCash Ref</Label><p className="font-mono text-xs">{selectedPayment.ecocash_reference || "N/A"}</p></div>
                </div>

                {selectedPayment.refund_notes && (
                  <div className="p-3 bg-muted/50 rounded-lg border border-border">
                    <Label className="text-xs text-muted-foreground">Previous Refund Notes</Label>
                    <p className="text-sm mt-1">{selectedPayment.refund_notes}</p>
                  </div>
                )}

                {selectedPayment.status === "completed" && selectedPayment.refund_status !== "approved" && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-primary" /> Process Refund
                    </h4>
                    <p className="text-xs text-muted-foreground">Reverse ${selectedPayment.amount.toFixed(2)} to {selectedPayment.phone_number} via EcoCash.</p>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Refund Notes</Label>
                      <Textarea value={refundNotes} onChange={e => setRefundNotes(e.target.value)} placeholder="Reason for refund..." rows={3} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRefund("approved")} disabled={refundLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {refundLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve & Refund
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRefund("rejected")} disabled={refundLoading}>
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                {selectedPayment.status === "refunded" && (
                  <div className="p-3.5 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800">
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-300 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> This payment has been refunded</p>
                    {selectedPayment.refunded_at && <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">Refunded on {format(new Date(selectedPayment.refunded_at), "MMM d, yyyy HH:mm")}</p>}
                  </div>
                )}

                <div className="border-t pt-3">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleQueryTransaction(selectedPayment.client_correlator, selectedPayment.phone_number)} disabled={queryLoading}>
                    {queryLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSearch className="w-4 h-4 mr-2" />}
                    Query Status from EcoCash
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
