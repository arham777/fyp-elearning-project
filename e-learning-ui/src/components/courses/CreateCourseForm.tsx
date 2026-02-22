import React from 'react';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { coursesApi } from '@/api/courses';
import { toast } from '@/hooks/use-toast';
import type { Course } from '@/types';

export type CreateCourseFormValues = {
  title: string;
  description: string;
  category: string;
  price: number;
  numberOfModules: number;
  lessonsPerModule: number;
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
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateCourseFormValues>({
    defaultValues: { title: '', description: '', category: 'Web Development', price: 0 },
  });

  const category = watch('category');

  const onSubmit = async (values: CreateCourseFormValues) => {
    try {
      const course = await coursesApi.createCourse({
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category,
        price: Number(values.price),
      });

      // Auto-generate curriculum
      const numModules = Number(values.numberOfModules) || 0;
      const numLessons = Number(values.lessonsPerModule) || 0;

      if (numModules > 0) {
        toast({ title: 'Generating Curriculum', description: `Creating ${numModules} modules...` });

        for (let m = 1; m <= numModules; m++) {
          const module = await coursesApi.createCourseModule(course.id, {
            title: `Module ${m}`,
            description: `Auto-generated module ${m}`,
          });

          if (numLessons > 0) {
            for (let l = 1; l <= numLessons; l++) {
              await coursesApi.createModuleContent(course.id, module.id, {
                module: module.id,
                title: `Lesson ${l}`,
                content_type: 'reading',
                text: '<p>Please replace this placeholder with your actual lesson content.</p>',
              });
            }
          }
        }
      }

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
          <Label>Category</Label>
          <input type="hidden" {...register('category', { required: 'Category is required' })} />
          <Select
            value={category}
            onValueChange={(v) => setValue('category', v, { shouldValidate: true, shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Web Development">Web Development</SelectItem>
              <SelectItem value="AI">AI</SelectItem>
              <SelectItem value="Design">Design</SelectItem>
            </SelectContent>
          </Select>
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
                setValueAs: (v) => (v === '' || v === null || typeof v === 'undefined' ? 0 : Number(v)),
                min: { value: 0, message: 'Price cannot be negative' },
              })}
            />
            <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-sm text-muted-foreground">PKR</span>
          </div>
          {errors.price && (
            <p className="text-sm text-destructive">{errors.price.message}</p>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t border-border/50">
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none">Auto-Generate Curriculum (Optional)</h4>
            <p className="text-[13px] text-muted-foreground">Save time by generating a skeleton structure for your course.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numberOfModules">Number of Modules</Label>
              <Input
                id="numberOfModules"
                type="number"
                min="0"
                max="20"
                placeholder="e.g. 5"
                {...register('numberOfModules', {
                  setValueAs: (v) => (v === '' || v === null || typeof v === 'undefined' ? 0 : Number(v)),
                  min: { value: 0, message: 'Cannot be negative' },
                  max: { value: 20, message: 'Maximum 20 modules' },
                })}
              />
              {errors.numberOfModules && (
                <p className="text-sm text-destructive">{errors.numberOfModules.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lessonsPerModule">Lessons per Module</Label>
              <Input
                id="lessonsPerModule"
                type="number"
                min="0"
                max="20"
                placeholder="e.g. 3"
                {...register('lessonsPerModule', {
                  setValueAs: (v) => (v === '' || v === null || typeof v === 'undefined' ? 0 : Number(v)),
                  min: { value: 0, message: 'Cannot be negative' },
                  max: { value: 20, message: 'Maximum 20 lessons per module' },
                })}
              />
              {errors.lessonsPerModule && (
                <p className="text-sm text-destructive">{errors.lessonsPerModule.message}</p>
              )}
            </div>
          </div>
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
            {isSubmitting ? 'Creating Course & Curriculum...' : 'Create Course'}
          </Button>
        </div>
      </form>
    </div>
  );
}

