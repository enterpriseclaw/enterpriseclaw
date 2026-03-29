import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Eye, EyeOff } from 'lucide-react';
import { userManagementService } from '../../../domain/admin/userManagement.service';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { config } from '@/lib/config';
import { useNotification } from '@/hooks/useNotification';
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
import { isPasswordValid, PASSWORD_MIN_LENGTH, PASSWORD_POLICY_MESSAGE } from '@/lib/passwordPolicy';

export default function AdminUserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  const isNewUser = id === 'new';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    role: 'parent' as string,
    status: 'active' as 'active' | 'pending' | 'inactive' | 'suspended',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch user if editing
  const { data: user } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => userManagementService.getUserById(id!),
    enabled: !isNewUser && !!id,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: '',
        confirmPassword: '',
        displayName: user.displayName,
        role: user.role.toLowerCase() as any,
        status: user.status as any,
      });
    }
  }, [user]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => userManagementService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      showSuccess(
        'Success',
        'User created successfully'
      );
      navigate(config.routes.adminUsers);
    },
    onError: () => {
      showError(
        'Error',
        'Failed to create user'
      );
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => userManagementService.updateUser(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
      showSuccess(
        'Success',
        'User updated successfully'
      );
      navigate(config.routes.adminUsers);
    },
    onError: () => {
      showError(
        'Error',
        'Failed to update user'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isNewUser) {
      if (!formData.password) {
        showError(
          'Error',
          'Password is required for new users'
        );
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        showError(
          'Error',
          'Passwords do not match'
        );
        return;
      }
      if (!isPasswordValid(formData.password)) {
        showError(
          'Error',
          PASSWORD_POLICY_MESSAGE
        );
        return;
      }
      // Admin-created users are automatically set to active status
      const userData = { ...formData, status: 'active' };
      createMutation.mutate(userData);
    } else {
      const updateData: any = {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        status: formData.status,
      };
      updateMutation.mutate(updateData);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6 max-w-2xl pb-24">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">
              {isNewUser ? 'Create User' : 'Edit User'}
            </h1>
            <p className="text-muted-foreground">
              {isNewUser
                ? 'Create a new user account (bypasses approval)'
                : 'Update user information'}
            </p>
          </div>

          {/* Form */}
          <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            {isNewUser
              ? 'Admin-created users are automatically active'
              : 'Modify user information and permissions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            {isNewUser && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{PASSWORD_POLICY_MESSAGE}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="advocate">Advocate</SelectItem>
                  <SelectItem value="teacher_therapist">Teacher/Therapist</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isNewUser && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          

          </form>
        </CardContent>
      </Card>
        </div>
      </div>

      {/* STICKY ACTION BAR */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur shadow-lg">
        <div className="container mx-auto px-6 py-3 flex items-center justify-end gap-3 max-w-2xl">
          <Button
            variant="outline"
            onClick={() => navigate(config.routes.adminUsers)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {isNewUser ? 'Create User' : 'Update User'}
          </Button>
        </div>
      </div>
    </div>
  );
}
