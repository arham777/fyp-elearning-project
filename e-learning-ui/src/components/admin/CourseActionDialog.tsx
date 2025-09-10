import React from 'react';
import { Course } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export interface CourseActionDialogProps {
  course: Course | null;
  action: 'approve' | 'reject' | 'delete' | null;
  isOpen: boolean;
  onClose: () => void;
  note: string;
  setNote: (v: string) => void;
  onConfirm: () => void;
}

const CourseActionDialog: React.FC<CourseActionDialogProps> = ({
  course,
  action,
  isOpen,
  onClose,
  note,
  setNote,
  onConfirm,
}) => {
  const getDialogContent = () => {
    if (!course || !action) return { title: '', description: '' };
    switch (action) {
      case 'approve':
        return {
          title: 'Approve Course',
          description: `Are you sure you want to approve "${course.title}"? It will be published and available to students.`,
        };
      case 'reject':
        return {
          title: 'Reject Course',
          description: `Are you sure you want to reject "${course.title}"? The teacher will be notified.`,
        };
      case 'delete':
        return {
          title: 'Delete Course',
          description: `Are you sure you want to permanently delete "${course.title}"? This action cannot be undone.`,
        };
      default:
        return { title: '', description: '' };
    }
  };

  const { title, description } = getDialogContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {(action === 'approve' || action === 'reject') && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              {action === 'approve'
                ? 'Optional note to teacher (optional):'
                : 'Reason for rejection (required):'}
            </p>
            <Input
              placeholder={
                action === 'approve'
                  ? 'e.g., Great job. Publishing now.'
                  : 'e.g., Please add at least one assignment and improve description.'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={action === 'delete' || action === 'reject' ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourseActionDialog;
