import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search } from 'lucide-react';

export type UserRolePick = 'student' | 'teacher';

interface UserMultiSelectProps {
  role: UserRolePick;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

const PAGE_SIZE = 20;

export const UserMultiSelect: React.FC<UserMultiSelectProps> = ({ role, selectedIds, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [debouncedQ, setDebouncedQ] = React.useState('');

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Reset selections when role changes to avoid cross-role mixing
  React.useEffect(() => {
    onChange([]);
  }, [role]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['admin', 'users', 'picker', role, debouncedQ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      return adminApi.listUsersPaged({ page: pageParam as number, page_size: PAGE_SIZE, role, search: debouncedQ });
    },
    getNextPageParam: (lastPage, allPages) => {
      // Only paginate further if backend indicates a next page
      if (lastPage?.next) return (allPages.length + 1);
      return undefined;
    },
  });

  const items = React.useMemo(() => {
    const map = new Map<number, User>();
    for (const p of data?.pages || []) {
      for (const u of (p.results || [])) {
        if (!map.has(u.id)) map.set(u.id, u);
      }
    }
    return Array.from(map.values());
  }, [data]);

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id));
    else onChange([...selectedIds, id]);
  };

  const removeChip = (id: number) => onChange(selectedIds.filter(x => x !== id));

  const onScrollBottom = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-4 w-4" />
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Search and select users'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[min(640px,90vw)]" align="start">
          <Command shouldFilter={false}>
            <div className="px-2 pt-2">
              <CommandInput placeholder={`Search ${role}s by name, username, email...`} value={q} onValueChange={setQ} />
            </div>
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...
                  </div>
                ) : (
                  <div className="py-6 text-sm text-muted-foreground">No users found</div>
                )}
              </CommandEmpty>
              <CommandGroup>
                <div className="max-h-72 overflow-auto" onScroll={onScrollBottom}>
                  {items.map((u) => (
                    <CommandItem key={u.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                      <Checkbox checked={selectedIds.includes(u.id)} onCheckedChange={() => toggleSelect(u.id)} />
                    </CommandItem>
                  ))}
                  {hasNextPage && (
                    <div className="py-2 text-center text-xs text-muted-foreground">
                      {isFetchingNextPage ? (
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> Loading more...</span>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => fetchNextPage()}>Load more</Button>
                      )}
                    </div>
                  )}
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const u = items.find((x) => x.id === id);
            const label = u ? ((u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username) : `User #${id}`;
            return (
              <Badge key={id} variant="secondary" className="flex items-center gap-2">
                <span className="truncate max-w-[160px]">{label}</span>
                <button className="text-xs opacity-70 hover:opacity-100" onClick={() => removeChip(id)}>×</button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserMultiSelect;
