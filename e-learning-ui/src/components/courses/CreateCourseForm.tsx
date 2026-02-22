import React from 'react';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { coursesApi } from '@/api/courses';
import { categoriesApi, type CategoryGroup } from '@/api/categories';
import { toast } from '@/hooks/use-toast';
import type { Course } from '@/types';
import { Loader2, Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    defaultValues: { title: '', description: '', category: '', price: 0 },
  });

  const category = watch('category');

  // Fetch categories from backend
  const [categoryGroups, setCategoryGroups] = React.useState<CategoryGroup[]>([]);
  const [categoriesLoading, setCategoriesLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    categoriesApi.getCategoryGroups().then((groups) => {
      if (!cancelled) {
        setCategoryGroups(groups);
        setCategoriesLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setCategoriesLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

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

        <SearchableCategorySelect
          value={category}
          onChange={(v) => setValue('category', v, { shouldValidate: true, shouldDirty: true })}
          groups={categoryGroups}
          loading={categoriesLoading}
          error={errors.category?.message}
          register={register}
        />

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


/* ─────────────────────────────────────────────────────────── */
/*  Searchable Category Dropdown (inline sub-component)       */
/* ─────────────────────────────────────────────────────────── */

function SearchableCategorySelect({
  value,
  onChange,
  groups,
  loading,
  error,
  register,
}: {
  value: string;
  onChange: (v: string) => void;
  groups: CategoryGroup[];
  loading: boolean;
  error?: string;
  register: any;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filteredGroups = React.useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        categories: g.categories.filter(
          (c) => c.toLowerCase().includes(q) || g.name.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.categories.length > 0);
  }, [search, groups]);

  const totalFiltered = React.useMemo(
    () => filteredGroups.reduce((sum, g) => sum + g.categories.length, 0),
    [filteredGroups],
  );

  const handleSelect = (cat: string) => {
    onChange(cat);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="space-y-2">
      <Label>Category</Label>
      <input type="hidden" {...register('category', { required: 'Category is required' })} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-10"
          >
            <span className={cn('truncate', !value && 'text-muted-foreground')}>
              {loading ? 'Loading categories...' : value || 'Select category'}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          {/* Search bar */}
          <div className="p-2.5 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
              {search && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 px-0.5">
              {search ? `${totalFiltered} found` : `${groups.reduce((s, g) => s + g.categories.length, 0)} categories`}
            </p>
          </div>

          {/* Category list */}
          <ScrollArea className="h-[260px]">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No categories found for &ldquo;{search}&rdquo;
              </div>
            ) : (
              <div className="p-1.5">
                {filteredGroups.map((group) => (
                  <div key={group.name} className="mb-2">
                    <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-popover z-10">
                      {group.name}
                    </div>
                    {group.categories.map((cat) => {
                      const isSelected = cat === value;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleSelect(cat)}
                          className={cn(
                            'w-full flex items-center justify-between px-2.5 py-2 text-sm rounded-md transition-colors',
                            isSelected
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted',
                          )}
                        >
                          <span>{cat}</span>
                          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

