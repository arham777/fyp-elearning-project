import React from 'react';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { coursesApi } from '@/api/courses';
import { toast } from '@/hooks/use-toast';
import type { Course } from '@/types';

export type CreateCourseFormValues = {
  title: string;
  description: string;
  price: number;
};

export default function CreateCourseForm({
  onCreated,
  onCancel,
}: {
  onCreated?: (course: Course) => void;
  onCancel?: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateCourseFormValues>({
    defaultValues: { title: '', description: '', price: 0 },
  });

  const onSubmit = async (values: CreateCourseFormValues) => {
    try {
      const course = await coursesApi.createCourse({
        title: values.title.trim(),
        description: values.description.trim(),
        price: Number(values.price),
      });
      toast({ title: 'Course created', description: 'Your course has been created as a draft.' });
      reset();
      onCreated?.(course);
    } catch (error: any) {
      let errorMessage = 'Please try again.';
      if (error?.response?.status === 401) errorMessage = 'Authentication failed. Please login again.';
      else if (error?.response?.status === 403) errorMessage = 'You do not have permission to create courses.';
      else if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') errorMessage = data;
        else if (data.detail) errorMessage = data.detail;
        else if (data.message) errorMessage = data.message;
        else if (data.error) errorMessage = data.error;
        else errorMessage = JSON.stringify(data);
      } else if (error?.message) errorMessage = error.message;

      toast({ title: 'Failed to create course', description: errorMessage, variant: 'destructive' });
    }
  };

  return (
    <div className="w-full">
      {/* Keep the form simple so it fits nicely inside DialogContent without nested cards */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="e.g. Introduction to Machine Learning"
            {...register('title', {
              required: 'Title is required',
              minLength: { value: 3, message: 'Title is too short' },
            })}
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
            className="resize-none"
            {...register('description', {
              required: 'Description is required',
              minLength: { value: 10, message: 'Description is too short' },
            })}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <div className="relative">
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="pr-16"
              {...register('price', {
                required: 'Price is required',
                valueAsNumber: true,
                min: { value: 0, message: 'Price cannot be negative' },
              })}
            />
            <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-sm text-muted-foreground">PKR</span>
          </div>
          {errors.price && (
            <p className="text-sm text-destructive">{errors.price.message}</p>
          )}
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Course'}
          </Button>
        </div>
      </form>
    </div>
  );
}

