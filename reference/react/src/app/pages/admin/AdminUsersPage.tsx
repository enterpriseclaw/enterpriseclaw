import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit, Plus, Search, Users, UserCheck, UserX, Clock, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { userManagementService } from '../../../domain/admin/userManagement.service';
import { Button } from '@/components/ui/button';
// import { Checkbox } from '@/components/ui/checkbox'; // Commented out - bulk operations disabled
import { Input } from '@/components/ui/input';
import { config } from '@/lib/config';
import { useNotification } from '@/hooks/useNotification';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showWarning } = useNotification();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  // Bulk operations commented out
  // const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  // const [bulkEditOpen, setBulkEditOpen] = useState(false);
  // const [bulkEditRole, setBulkEditRole] = useState<string>('');
  // const [bulkEditStatus, setBulkEditStatus] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'displayName' | 'email' | 'role' | 'status' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin', 'user-stats'],
    queryFn: () => userManagementService.getUserStats(),
  });

  // Fetch available roles
  const { data: availableRoles } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => userManagementService.getRoles(),
  });

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users', { search, roleFilter, statusFilter }],
    queryFn: () =>
      userManagementService.getAllUsers({
        search: search || undefined,
        role: roleFilter && roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => userManagementService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-stats'] });
      showSuccess(
        'Success',
        'User deleted successfully'
      );
      setDeleteUserId(null);
    },
    onError: () => {
      showError(
        'Error',
        'Failed to delete user'
      );
    },
  });

  // Bulk operations commented out
  // const deletableIds = selectedIds.filter(
  //   (id) => users?.find((u) => u.id === id)?.role !== 'ADMIN'
  // );

  // Sorting and pagination logic
  const sortedAndFilteredUsers = useMemo(() => {
    if (!users) return [];
    
    // Sort users
    const sorted = [...users].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];
      
      // Handle date sorting
      if (sortColumn === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Handle string sorting (case insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [users, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil((sortedAndFilteredUsers?.length || 0) / pageSize);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedAndFilteredUsers.slice(startIndex, endIndex);
  }, [sortedAndFilteredUsers, currentPage, pageSize]);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: any) => void) => (value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  // Handle sorting
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

  // Bulk delete mutation - commented out
  // const bulkDeleteMutation = useMutation({
  //   mutationFn: (ids: string[]) => userManagementService.deleteUsers(ids),
  //   onSuccess: (res) => {
  //     queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  //     queryClient.invalidateQueries({ queryKey: ['admin', 'user-stats'] });
  //     showSuccess('Success', `${res.deleted} user(s) deleted`);
  //     setSelectedIds([]);
  //     setBulkDeleteOpen(false);
  //   },
  //   onError: () => {
  //     showError('Error', 'Failed to delete selected users');
  //   },
  // });

  // Bulk update mutation - commented out
  // const bulkUpdateMutation = useMutation({
  //   mutationFn: (data: { userIds: string[]; updates: { role?: string; status?: string } }) =>
  //     userManagementService.bulkUpdateUsers(data.userIds, data.updates),
  //   onSuccess: (res) => {
  //     queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  //     queryClient.invalidateQueries({ queryKey: ['admin', 'user-stats'] });
  //     showSuccess('Success', `${res.updated} user(s) updated`);
  //     if (res.failed.length > 0) {
  //       showError('Partial Success', `${res.failed.length} user(s) failed to update`);
  //     }
  //     setSelectedIds([]);
  //     setBulkEditOpen(false);
  //     setBulkEditRole('');
  //     setBulkEditStatus('');
  //   },
  //   onError: () => {
  //     showError('Error', 'Failed to update selected users');
  //   },
  // });

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'destructive';
      case 'advocate':
        return 'default';
      case 'teacher_therapist':
      case 'teacher':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'inactive':
        return 'outline';
      case 'suspended':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users and their permissions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(config.routes.adminUsersImport)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>

          <Button onClick={() => navigate(config.routes.adminUsersRequests)}>
            <Clock className="h-4 w-4 mr-2" />
            Pending Requests
            {stats && stats.pendingRequests > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pendingRequests}
              </Badge>
            )}
          </Button>
          <Button onClick={() => navigate(config.routes.adminUsersNew)}>
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.byStatus.active || stats.byStatus.ACTIVE || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.byStatus.suspended || stats.byStatus.SUSPENDED || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={search}
                  onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={handleFilterChange(setRoleFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {availableRoles?.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pageSize.toString()} onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  Showing {paginatedUsers?.length || 0} of {sortedAndFilteredUsers?.length || 0} user(s)
                </CardDescription>
              </div>
              
              {/* Bulk operations commented out */}
              {/* {selectedIds.length > 0 && (
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
                    Clear selection
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkEditOpen(true)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (deletableIds.length === 0){
                        showError(
                          'Action not allowed',
                          'Admin users cannot be deleted.'
                        );
                        return;
                      }

                      if (deletableIds.length !== selectedIds.length) {
                        showWarning(
                          'Some users skipped',
                          'Admin users cannot be deleted and will be skipped.'
                        );
                      }

                      setBulkDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )} */}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : paginatedUsers && paginatedUsers.length > 0 ? (
            <>
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
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('status')}
                        className="hover:bg-transparent p-0 h-auto font-semibold"
                      >
                        Status
                        <SortIcon column="status" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('createdAt')}
                        className="hover:bg-transparent p-0 h-auto font-semibold"
                      >
                        Created
                        <SortIcon column="createdAt" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user, index) => {
                    // const isSelected = selectedIds.includes(user.id); // Commented out - bulk operations disabled
                    return (
                      <TableRow 
                        key={user.id}
                        // className={`cursor-pointer transition-colors ${
                        //   isSelected 
                        //     ? 'bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary' 
                        //     : 'hover:bg-muted/50'
                        // }`}
                        className="hover:bg-muted/50"
                        // onClick={(e) => {
                        //   // Don't toggle if clicking on action buttons
                        //   if ((e.target as HTMLElement).closest('button')) return;
                        //   
                        //   setSelectedIds((prev) =>
                        //     isSelected
                        //       ? prev.filter((id) => id !== user.id)
                        //       : Array.from(new Set([...prev, user.id]))
                        //   );
                        // }}
                      >
                      <TableCell className="text-muted-foreground font-medium">
                        {(currentPage - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{user.displayName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(config.routes.adminUsersEdit(user.id))}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteUserId(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
              
              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedAndFilteredUsers.length)} of {sortedAndFilteredUsers.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {/* Page numbers */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-9"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Try adjusting your filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog - commented out */}
      {/* <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>
                Delete {selectedIds.length} selected user(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. All selected user accounts will be permanently removed.
            </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => bulkDeleteMutation.mutate(deletableIds)}
            >
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
       </AlertDialog> */}

      {/* Bulk Edit Dialog - commented out */}
      {/* <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit {selectedIds.length} selected user(s)</DialogTitle>
            <DialogDescription>
              Update role and/or status for selected users. Leave fields empty to keep unchanged.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bulk-role">Role</Label>
              <Select value={bulkEditRole} onValueChange={setBulkEditRole}>
                <SelectTrigger id="bulk-role">
                  <SelectValue placeholder="Keep current roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keep current roles</SelectItem>
                  {availableRoles?.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="bulk-status">Status</Label>
              <Select value={bulkEditStatus} onValueChange={setBulkEditStatus}>
                <SelectTrigger id="bulk-status">
                  <SelectValue placeholder="Keep current statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keep current statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkEditOpen(false);
                setBulkEditRole('');
                setBulkEditStatus('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const updates: { role?: string; status?: string } = {};
                if (bulkEditRole && bulkEditRole !== '__none__') {
                  updates.role = bulkEditRole;
                }
                if (bulkEditStatus && bulkEditStatus !== '__none__') {
                  updates.status = bulkEditStatus;
                }
                
                if (Object.keys(updates).length === 0) {
                  showWarning('No changes', 'Please select at least one field to update');
                  return;
                }
                
                bulkUpdateMutation.mutate({ userIds: selectedIds, updates });
              }}
              disabled={bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending ? 'Updating...' : 'Update Users'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

    </div>
  );
}
