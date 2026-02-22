import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { categoriesApi, type CategoryGroup } from '@/api/categories';
import { Search, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  value: string; // Comma-separated string for multiple categories
  onChange: (value: string) => void;
  placeholder?: string;
  multiple?: boolean;
  maxSelections?: number;
}

export function CategorySelector({ 
  value, 
  onChange, 
  placeholder = 'Select categories', 
  multiple = true,
  maxSelections = 5 
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch categories from the backend
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    categoriesApi.getCategoryGroups().then((groups) => {
      if (!cancelled) {
        setCategoryGroups(groups);
        setIsLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const allCategories = useMemo(
    () => categoryGroups.flatMap((g) => g.categories),
    [categoryGroups],
  );

  // Parse comma-separated value into array
  const selectedCategories = useMemo(() => {
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }, [value]);

  // Focus search input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Filter categories based on search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) {
      return categoryGroups;
    }
    
    const searchLower = search.toLowerCase();
    return categoryGroups.map(group => ({
      ...group,
      categories: group.categories.filter(cat => 
        cat.toLowerCase().includes(searchLower) ||
        group.name.toLowerCase().includes(searchLower)
      ),
    })).filter(group => group.categories.length > 0);
  }, [search, categoryGroups]);

  // Count total filtered categories
  const totalFiltered = useMemo(() => 
    filteredGroups.reduce((acc, group) => acc + group.categories.length, 0),
    [filteredGroups]
  );

  const handleSelect = (category: string) => {
    if (multiple) {
      if (selectedCategories.includes(category)) {
        // Remove category
        const newCategories = selectedCategories.filter(c => c !== category);
        onChange(newCategories.join(', '));
      } else if (selectedCategories.length < maxSelections) {
        // Add category
        const newCategories = [...selectedCategories, category];
        onChange(newCategories.join(', '));
      }
    } else {
      onChange(category);
      setOpen(false);
    }
    setSearch('');
  };

  const handleRemove = (category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCategories = selectedCategories.filter(c => c !== category);
    onChange(newCategories.join(', '));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const isSelected = (category: string) => selectedCategories.includes(category);
  const canSelectMore = selectedCategories.length < maxSelections;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal min-h-[40px] h-auto py-2"
          >
            <span className={cn('flex-1 text-left', !selectedCategories.length && 'text-muted-foreground')}>
              {selectedCategories.length > 0 
                ? `${selectedCategories.length} categor${selectedCategories.length > 1 ? 'ies' : 'y'} selected`
                : placeholder
              }
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          {/* Search Input */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {search ? `${totalFiltered} found` : `${allCategories.length} categories`}
              </p>
              {multiple && (
                <p className="text-xs text-muted-foreground">
                  {selectedCategories.length}/{maxSelections} selected
                </p>
              )}
            </div>
          </div>
          
          {/* Categories List */}
          <ScrollArea className="h-[280px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Loading categories...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No categories found for "{search}"
              </div>
            ) : (
              <div className="p-2">
                {filteredGroups.map((group) => (
                  <div key={group.name} className="mb-3">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide sticky top-0 bg-popover">
                      {group.name}
                    </div>
                    <div className="space-y-0.5">
                      {group.categories.map((category) => {
                        const selected = isSelected(category);
                        const disabled = !selected && !canSelectMore;
                        return (
                          <button
                            key={category}
                            onClick={() => !disabled && handleSelect(category)}
                            disabled={disabled}
                            className={cn(
                              'w-full flex items-center justify-between px-2 py-2 text-sm rounded-md transition-colors',
                              selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                              disabled && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            <span>{category}</span>
                            {selected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {/* Footer */}
          <div className="p-3 border-t bg-muted/30 flex items-center justify-between">
            {selectedCategories.length > 0 ? (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={handleClearAll}
              >
                Clear all
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Select up to {maxSelections} interests
              </span>
            )}
            <Button 
              size="sm" 
              className="h-7"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Categories Tags */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCategories.map((category) => (
            <Badge 
              key={category} 
              variant="secondary" 
              className="pl-2 pr-1 py-1 text-xs font-normal flex items-center gap-1"
            >
              {category}
              <button
                onClick={(e) => handleRemove(category, e)}
                className="ml-0.5 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategorySelector;
