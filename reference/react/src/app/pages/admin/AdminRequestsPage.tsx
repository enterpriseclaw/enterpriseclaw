import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, XSquare, Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { config } from '@/lib/config';
import { userManagementService } from '../../../domain/admin/userManagement.service';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { useNotification } from '@/hooks/useNotification';
import { Label } from '../../../components/ui/label';

export default function AdminRequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'displayName' | 'email' | 'role' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch pending requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin', 'registration-requests'],
    queryFn: () => userManagementService.getPendingRequests(),
  });

  // Sorted requests
  const sortedRequests = useMemo(() => {
    if (!requests) return [];
    
    return [...requests].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];
      
      if (sortColumn === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [requests, sortColumn, sortDirection]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-2 opacity-50" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-2" /> : 
      <ArrowDown className="h-4 w-4 ml-2" />;
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (requestIds: string[]) =>
      userManagementService.approveRequests({ requestIds }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-stats'] });
      
      showSuccess(
        'Success',
        `${result.approved} request(s) approved successfully`
      );

      if (result.failed.length > 0) {
        showError(
          'Partial Success',
          `${result.failed.length} request(s) failed`
        );
      }

      setSelectedIds([]);
    },
    onError: () => {
      showError(
        'Error',
        'Failed to approve requests'
      );
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (data: { requestIds: string[]; reason?: string }) =>
      userManagementService.rejectRequests(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-stats'] });
      
      showSuccess(
        'Success',
        `${result.rejected} request(s) rejected successfully`
      );

      if (result.failed.length > 0) {
        showError(
          'Partial Success',
          `${result.failed.length} request(s) failed`
        );
      }

      setSelectedIds([]);
      setRejectDialogOpen(false);
      setRejectionReason('');
    },
    onError: () => {
      showError(
        'Error',
        'Failed to reject requests'
      );
    },
  });

  const handleApprove = () => {
    if (selectedIds.length === 0) return;
    approveMutation.mutate(selectedIds);
  };

  const handleReject = () => {
    if (selectedIds.length === 0) return;
    rejectMutation.mutate({
      requestIds: selectedIds,
      reason: rejectionReason || undefined,
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'parent':
        return 'default';
      case 'advocate':
        return 'secondary';
      case 'teacher_therapist':
        return 'outline';
      case 'support':
        return 'default';
      case 'admin':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Registration Requests</h1>
              <p className="text-muted-foreground">
                Review and approve pending user registrations
              </p>
            </div>
          </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>
                  {sortedRequests?.length || 0} pending request(s)
                </CardDescription>
              </div>
              
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="text-sm font-medium text-primary">
                    {selectedIds.length} selected
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedIds([])}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading requests...
            </div>
          ) : sortedRequests && sortedRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">S.No</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('displayName')}
                      className="hover:bg-transparent p-0 h-auto font-semibold"
                    >
                      Name
                      <SortIcon column="displayName" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('email')}
                      className="hover:bg-transparent p-0 h-auto font-semibold"
                    >
                      Email
                      <SortIcon column="email" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('role')}
                      className="hover:bg-transparent p-0 h-auto font-semibold"
                    >
                      Role
                      <SortIcon column="role" />
                    </Button>
                  </TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('createdAt')}
                      className="hover:bg-transparent p-0 h-auto font-semibold"
                    >
                      Requested
                      <SortIcon column="createdAt" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRequests.map((request, index) => {
                  const isSelected = selectedIds.includes(request.id);
                  return (
                    <TableRow 
                      key={request.id}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        
                        setSelectedIds((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== request.id)
                            : [...prev, request.id]
                        );
                      }}
                    >
                      <TableCell className="text-muted-foreground font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {request.displayName}
                      </TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(request.role)}>
                          {request.role.split('_').map(word => 
                            word.charAt(0) + word.slice(1).toLowerCase()
                          ).join(' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {request.reason || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(request.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => approveMutation.mutate([request.id])}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedIds([request.id]);
                              setRejectDialogOpen(true);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <XSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="text-lg font-medium">No Pending Requests</div>
              <p className="text-muted-foreground">
                All registration requests have been processed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration Request(s)</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting {selectedIds.length} request(s).
              This will permanently delete the request(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Request(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>

      {/* STICKY ACTION BAR */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur shadow-lg">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} request(s) selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(config.routes.adminUsers)}
            >
              Cancel
            </Button>
            {selectedIds.length > 0 && (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Approve ({selectedIds.length})
                </Button>
                <Button
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={rejectMutation.isPending}
                  variant="destructive"
                >
                  <XSquare className="h-4 w-4 mr-2" />
                  Reject ({selectedIds.length})
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
