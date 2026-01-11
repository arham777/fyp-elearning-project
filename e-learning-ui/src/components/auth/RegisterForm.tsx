import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategorySelector } from '@/components/ui/CategorySelector';
import { useAuth } from '@/contexts/AuthContext';
import { RegisterData } from '@/types';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';

const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState<RegisterData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
    role: 'student',
    preferred_category: 'Web Development',
    skill_level: 'beginner',
    learning_goal: undefined,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (formData.password !== formData.confirm_password) {
      // Simple client-side validation
      alert('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(formData);
      navigate('/app');
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof RegisterData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleRoleChange = (role: RegisterData['role']) => {
    setFormData(prev => ({
      ...prev,
      role,
    }));
  };

  const handleSelectChange = (field: keyof RegisterData) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value as any,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md card-elevated">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-accent-orange rounded-full">
              <GraduationCap className="h-8 w-8 text-accent-orange-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">Join Our Platform</CardTitle>
          <CardDescription>
            Create your Learning Management System account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange('first_name')}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange('last_name')}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={handleChange('username')}
                required
                placeholder="johndoe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                required
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === 'student' && (
              <>
                <div className="space-y-2">
                  <Label>Preferred course category</Label>
                  <CategorySelector
                    value={formData.preferred_category || ''}
                    onChange={handleSelectChange('preferred_category')}
                    placeholder="Search and select category..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Skill level</Label>
                  <Select
                    value={formData.skill_level || 'beginner'}
                    onValueChange={handleSelectChange('skill_level')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select skill level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Learning goal (optional)</Label>
                  <Select
                    value={formData.learning_goal || ''}
                    onValueChange={(v) => {
                      setFormData(prev => ({
                        ...prev,
                        learning_goal: (v ? (v as any) : undefined),
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job">Job</SelectItem>
                      <SelectItem value="skill_upgrade">Skill Upgrade</SelectItem>
                      <SelectItem value="certification">Certification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange('password')}
                  required
                  placeholder="Enter a strong password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirm_password}
                onChange={handleChange('confirm_password')}
                required
                placeholder="Re-enter your password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-foreground hover:text-muted-foreground font-medium transition-[var(--transition-fast)]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterForm;