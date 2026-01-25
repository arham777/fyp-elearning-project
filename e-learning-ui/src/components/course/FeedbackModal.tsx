import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, review: string, difficulty: 'easy' | 'medium' | 'hard') => Promise<void>;
    isSubmitting: boolean;
    courseTitle: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    courseTitle,
}) => {
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [review, setReview] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | ''>('');

    const handleSubmit = async () => {
        if (!rating || !review.trim() || !difficulty) return;

        await onSubmit(rating, review, difficulty as 'easy' | 'medium' | 'hard');

        // Reset form
        setRating(0);
        setHoverRating(0);
        setReview('');
        setDifficulty('');
    };

    const displayRating = hoverRating || rating;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] border-0 bg-gradient-to-br from-background via-background to-primary/5">
                {/* Decorative elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                    <Sparkles className="absolute top-6 right-6 w-5 h-5 text-primary/30 animate-pulse" />
                    <MessageSquare className="absolute bottom-6 left-6 w-6 h-6 text-primary/20 animate-pulse delay-500" />
                </div>

                <DialogHeader className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <MessageSquare className="w-5 h-5 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl">Share Your Experience</DialogTitle>
                    </div>
                    <DialogDescription className="text-base">
                        Help us improve <span className="font-semibold text-foreground">{courseTitle}</span> with your valuable feedback
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 relative z-10 mt-4">
                    {/* Rating Section */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Star className="w-4 h-4 text-primary" />
                            Rate this course
                        </label>
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-primary/10">
                            <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, idx) => {
                                    const starValue = idx + 1;
                                    const isActive = displayRating >= starValue;

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            className={cn(
                                                "p-1 transition-all duration-200 hover:scale-110",
                                                isActive && "animate-pulse-subtle"
                                            )}
                                            onMouseEnter={() => setHoverRating(starValue)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onClick={() => setRating(starValue)}
                                            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
                                        >
                                            <Star
                                                className={cn(
                                                    "w-8 h-8 transition-all duration-200",
                                                    isActive
                                                        ? "fill-primary text-primary drop-shadow-lg"
                                                        : "text-muted-foreground/40 hover:text-primary/60"
                                                )}
                                            />
                                        </button>
                                    );
                                })}
                            </div>

                            {rating > 0 && (
                                <div className="ml-auto flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                    <span className="text-2xl font-bold text-primary">{rating}</span>
                                    <span className="text-sm text-muted-foreground">/5</span>
                                </div>
                            )}
                        </div>

                        {/* Rating labels */}
                        {rating > 0 && (
                            <p className="text-sm text-center text-muted-foreground animate-in fade-in">
                                {rating === 5 && "🎉 Excellent! We're thrilled you loved it!"}
                                {rating === 4 && "😊 Great! Thanks for the positive feedback!"}
                                {rating === 3 && "👍 Good! We appreciate your honest review!"}
                                {rating === 2 && "🤔 Thanks! We'll work on improving!"}
                                {rating === 1 && "😔 We're sorry! Your feedback helps us improve!"}
                            </p>
                        )}
                    </div>

                    {/* Review Section */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            Your feedback
                        </label>
                        <Textarea
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Share your thoughts about the course content, instructor, and overall experience..."
                            rows={4}
                            className="resize-none border-primary/20 focus:border-primary/40 bg-background/50"
                        />
                        <p className="text-xs text-muted-foreground">
                            {review.length}/500 characters
                        </p>
                    </div>

                    {/* Difficulty Section */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium">Course difficulty level</label>
                        <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                            <SelectTrigger className="border-primary/20 focus:border-primary/40 bg-background/50">
                                <SelectValue placeholder="How challenging was this course?" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="easy">
                                    <div className="flex items-center gap-2">
                                        <span className="text-green-500">●</span>
                                        <span>Easy - Perfect for beginners</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="medium">
                                    <div className="flex items-center gap-2">
                                        <span className="text-yellow-500">●</span>
                                        <span>Medium - Moderately challenging</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="hard">
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-500">●</span>
                                        <span>Hard - Advanced level</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="flex-1"
                            disabled={isSubmitting}
                        >
                            Skip for Now
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!rating || !review.trim() || !difficulty || isSubmitting}
                            className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Star className="w-4 h-4 mr-2" />
                                    Submit Feedback
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
