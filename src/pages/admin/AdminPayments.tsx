import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, CreditCard, RefreshCw, Loader2, DollarSign, Users, Eye, FileSearch, ArrowDownUp, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  profiles?: { full_name: string | null; email: string | null } | null;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundNotes, setRefundNotes] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("payments");

  // Query transaction form
  const [queryClientCorrelator, setQueryClientCorrelator] = useState("");
  const [queryPhoneNumber, setQueryPhoneNumber] = useState("");

  const { toast } = useToast();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);

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
        // Call the EcoCash refund edge function
        const { data, error } = await supabase.functions.invoke("ecocash-refund", {
          body: { payment_id: selectedPayment.id, refund_notes: refundNotes },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        toast({ title: "Success", description: data.message || "Refund processed" });
      } else {
        // Reject refund - just update locally
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
      // Refresh payments to reflect any status updates
      fetchPayments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Query failed", variant: "destructive" });
    } finally {
      setQueryLoading(false);
    }
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
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalRevenue = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);
  const totalTransactions = payments.length;
  const pendingRefunds = payments.filter(p => p.refund_status === "pending").length;
  const refundablePayments = payments.filter(p => p.status === "completed" && p.refund_status !== "approved");

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "failed": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "refunded": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments Management</h1>
          <p className="text-muted-foreground mt-1">Track payments, process refunds, and query transactions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold text-foreground">${totalRevenue.toFixed(2)}</p></div><DollarSign className="w-8 h-8 text-green-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Transactions</p><p className="text-2xl font-bold text-foreground">{totalTransactions}</p></div><CreditCard className="w-8 h-8 text-primary" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending Refunds</p><p className="text-2xl font-bold text-foreground">{pendingRefunds}</p></div><RefreshCw className="w-8 h-8 text-yellow-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Students</p><p className="text-2xl font-bold text-foreground">{new Set(payments.map(p => p.user_id)).size}</p></div><Users className="w-8 h-8 text-primary" /></div></CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payments" className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> All Payments</TabsTrigger>
            <TabsTrigger value="refunds" className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refunds</TabsTrigger>
            <TabsTrigger value="query" className="flex items-center gap-2"><FileSearch className="w-4 h-4" /> Query Transaction</TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, reference, phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-44" placeholder="Filter by date" />
            </div>

            <Card><CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Universities</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>EcoCash Ref</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
                      ) : filtered.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{p.profiles?.full_name || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">{p.profiles?.email || ""}</p>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.student_level || "N/A"}</Badge></TableCell>
                          <TableCell className="font-semibold">${p.amount.toFixed(2)}</TableCell>
                          <TableCell>{p.university_count === 0 ? "All" : p.university_count}</TableCell>
                          <TableCell className="text-sm font-mono">{p.phone_number}</TableCell>
                          <TableCell><Badge className={`text-xs ${statusBadgeClass(p.status)}`}>{p.status}</Badge></TableCell>
                          <TableCell className="text-xs font-mono">{p.ecocash_reference || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(p.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedPayment(p); setRefundNotes(p.refund_notes || ""); }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleQueryTransaction(p.client_correlator, p.phone_number)} disabled={queryLoading}>
                                <ArrowDownUp className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent></Card>
          </TabsContent>

          {/* Refunds Tab */}
          <TabsContent value="refunds" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><RefreshCw className="w-5 h-5" /> Refundable Payments</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>EcoCash Ref</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Refund Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {refundablePayments.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No refundable payments</TableCell></TableRow>
                      ) : refundablePayments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{p.profiles?.full_name || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">{p.profiles?.email || ""}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">${p.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-xs font-mono">{p.ecocash_reference || "—"}</TableCell>
                          <TableCell className="text-sm font-mono">{p.phone_number}</TableCell>
                          <TableCell><Badge className={`text-xs ${statusBadgeClass(p.status)}`}>{p.status}</Badge></TableCell>
                          <TableCell>{p.refund_status ? <Badge variant="outline" className="text-xs capitalize">{p.refund_status}</Badge> : <Badge variant="outline" className="text-xs">None</Badge>}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(p.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedPayment(p); setRefundNotes(""); }}>
                              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Process
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

          {/* Query Transaction Tab */}
          <TabsContent value="query" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><FileSearch className="w-5 h-5" /> Query EcoCash Transaction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Client Correlator *</Label>
                    <Input placeholder="e.g. 17729548411021307" value={queryClientCorrelator} onChange={e => setQueryClientCorrelator(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Phone Number (endUserId)</Label>
                    <Input placeholder="e.g. 0783495070" value={queryPhoneNumber} onChange={e => setQueryPhoneNumber(e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => handleQueryTransaction()} disabled={queryLoading || !queryClientCorrelator}>
                  {queryLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Query Transaction
                </Button>

                {queryResult && (
                  <div className="mt-4 border border-border rounded-xl p-4 bg-muted/30 space-y-3">
                    <h4 className="font-semibold text-foreground">Transaction Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><Label className="text-xs text-muted-foreground">Status</Label><p><Badge className={statusBadgeClass(queryResult.transactionOperationStatus === "COMPLETED" ? "completed" : queryResult.transactionOperationStatus === "FAILED" ? "failed" : "pending")}>{queryResult.transactionOperationStatus}</Badge></p></div>
                      <div><Label className="text-xs text-muted-foreground">EcoCash Reference</Label><p className="font-mono text-xs">{queryResult.ecocashReference || "N/A"}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Amount</Label><p className="font-semibold">{queryResult.paymentAmount?.charginginformation?.currency} {queryResult.paymentAmount?.charginginformation?.amount}</p></div>
                      <div><Label className="text-xs text-muted-foreground">End User</Label><p className="font-mono text-xs">{queryResult.endUserId}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Server Reference</Label><p className="font-mono text-xs">{queryResult.serverReferenceCode || "N/A"}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Client Correlator</Label><p className="font-mono text-xs">{queryResult.clientCorrelator}</p></div>
                      {queryResult.transactionDate > 0 && (
                        <div><Label className="text-xs text-muted-foreground">Transaction Date</Label><p className="text-xs">{format(new Date(queryResult.transactionDate), "MMM d, yyyy HH:mm:ss")}</p></div>
                      )}
                      <div><Label className="text-xs text-muted-foreground">Remarks</Label><p className="text-xs">{queryResult.remarks || "N/A"}</p></div>
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">View Raw Response</summary>
                      <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-60">{JSON.stringify(queryResult, null, 2)}</pre>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick lookup from existing payments */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Quick Lookup from Recent Payments</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {payments.slice(0, 10).map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{p.profiles?.full_name || "N/A"}</TableCell>
                          <TableCell className="font-mono text-xs">{p.client_correlator}</TableCell>
                          <TableCell><Badge className={`text-xs ${statusBadgeClass(p.status)}`}>{p.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(p.created_at), "MMM d HH:mm")}</TableCell>
                          <TableCell>
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
              <DialogHeader><DialogTitle>Payment Details</DialogTitle></DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs text-muted-foreground">Student</Label><p className="font-medium">{selectedPayment.profiles?.full_name || "N/A"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Email</Label><p>{selectedPayment.profiles?.email || "N/A"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Amount</Label><p className="font-bold">${selectedPayment.amount.toFixed(2)} {selectedPayment.currency}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Status</Label><p><Badge className={`text-xs ${statusBadgeClass(selectedPayment.status)}`}>{selectedPayment.status}</Badge></p></div>
                  <div><Label className="text-xs text-muted-foreground">Reference</Label><p className="font-mono text-xs">{selectedPayment.reference_code}</p></div>
                  <div><Label className="text-xs text-muted-foreground">EcoCash Ref</Label><p className="font-mono text-xs">{selectedPayment.ecocash_reference || "N/A"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Level</Label><p>{selectedPayment.student_level || "N/A"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Universities</Label><p>{selectedPayment.university_count === 0 ? "All" : selectedPayment.university_count}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Phone</Label><p className="font-mono">{selectedPayment.phone_number}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Client Correlator</Label><p className="font-mono text-xs">{selectedPayment.client_correlator}</p></div>
                </div>

                {selectedPayment.refund_notes && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Label className="text-xs text-muted-foreground">Previous Refund Notes</Label>
                    <p className="text-sm mt-1">{selectedPayment.refund_notes}</p>
                  </div>
                )}

                {selectedPayment.status === "completed" && selectedPayment.refund_status !== "approved" && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-semibold text-foreground">Process Refund (EcoCash Reversal)</h4>
                    <p className="text-xs text-muted-foreground">This will call the EcoCash refund API to reverse the charge of ${selectedPayment.amount.toFixed(2)} to {selectedPayment.phone_number}.</p>
                    <div className="space-y-2">
                      <Label className="text-xs">Refund Notes</Label>
                      <Textarea value={refundNotes} onChange={e => setRefundNotes(e.target.value)} placeholder="Reason for refund..." rows={3} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRefund("approved")} disabled={refundLoading} className="bg-green-600 hover:bg-green-700 text-white">
                        {refundLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Approve & Refund
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRefund("rejected")} disabled={refundLoading}>
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {selectedPayment.status === "refunded" && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">This payment has been refunded</p>
                    {selectedPayment.refunded_at && <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Refunded on {format(new Date(selectedPayment.refunded_at), "MMM d, yyyy HH:mm")}</p>}
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
