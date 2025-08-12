import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { coursesApi } from '@/api/courses';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

type CreateCourseForm = {
  title: string;
  description: string;
  price: number;
};

const CreateCourse: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only teachers can create courses
  if (user && user.role !== 'teacher') {
    return <Navigate to="/app" replace />;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateCourseForm>({
    defaultValues: {
      title: '',
      description: '',
      price: 0,
    },
  });

  const onSubmit = async (values: CreateCourseForm) => {
    try {
      const course = await coursesApi.createCourse({
        title: values.title,
        description: values.description,
        price: values.price,
      });

      toast({
        title: 'Course created',
        description: 'Your course has been created successfully.',
      });
      reset();
      navigate(`/app/courses/${course.id}`);
    } catch (error: any) {
      toast({
        title: 'Failed to create course',
        description: error?.response?.data?.detail || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Create Course</CardTitle>
          <CardDescription>Provide basic details for your new course.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Introduction to Machine Learning"
                {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'Title is too short' } })}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what students will learn in this course"
                rows={6}
                {...register('description', { required: 'Description is required', minLength: { value: 10, message: 'Description is too short' } })}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('price', {
                  required: 'Price is required',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Price cannot be negative' },
                })}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? 'Creating…' : 'Create Course'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCourse;


