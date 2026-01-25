import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, Sparkles, Trophy, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseTitle: string;
    courseId: number;
    onViewCertificate: () => void;
    isDisabled?: boolean; // When feedback modal is shown on top
}

export const CourseCompletionModal: React.FC<CourseCompletionModalProps> = ({
    isOpen,
    onClose,
    courseTitle,
    courseId,
    onViewCertificate,
    isDisabled = false,
}) => {
    const [showConfetti, setShowConfetti] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleViewCertificate = () => {
        onViewCertificate();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={isDisabled ? undefined : onClose}>
            <DialogContent
                className={cn(
                    "sm:max-w-[600px] border-0 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden p-0",
                    isDisabled && "opacity-50"
                )}
            >
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse delay-700" />

                    {/* Floating sparkles */}
                    {showConfetti && (
                        <>
                            {[...Array(12)].map((_, i) => (
                                <Sparkles
                                    key={i}
                                    className={cn(
                                        "absolute text-primary/40 animate-float",
                                        i % 3 === 0 ? "w-4 h-4" : i % 3 === 1 ? "w-3 h-3" : "w-5 h-5"
                                    )}
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`,
                                        animationDelay: `${Math.random() * 2}s`,
                                        animationDuration: `${3 + Math.random() * 2}s`,
                                    }}
                                />
                            ))}
                        </>
                    )}
                </div>

                {/* Content */}
                <div className={cn("relative z-10 p-8 sm:p-12", isDisabled && "pointer-events-none")}>
                    {/* Icon with animated ring */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                            <div className="relative bg-primary/10 p-6 rounded-full border-2 border-primary/30">
                                <Trophy className="w-16 h-16 text-primary animate-bounce" style={{ animationDuration: '2s' }} />
                            </div>
                        </div>
                    </div>

                    {/* Success message */}
                    <div className="text-center space-y-4 mb-8">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                                Congratulations!
                            </h2>
                        </div>

                        <p className="text-lg text-muted-foreground">
                            You've successfully completed
                        </p>

                        <h3 className="text-2xl font-semibold text-foreground px-4">
                            {courseTitle}
                        </h3>

                        <div className="flex items-center justify-center gap-2 pt-2">
                            <Award className="w-5 h-5 text-primary" />
                            <p className="text-sm text-muted-foreground">
                                Your certificate is ready to view
                            </p>
                        </div>
                    </div>

                    {/* Achievement stats */}
                    <div className="grid grid-cols-3 gap-4 mb-8 p-4 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">100%</div>
                            <div className="text-xs text-muted-foreground mt-1">Completed</div>
                        </div>
                        <div className="text-center border-x border-primary/10">
                            <div className="text-2xl font-bold text-primary">
                                <Trophy className="w-6 h-6 mx-auto" />
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Certified</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                                <Award className="w-6 h-6 mx-auto" />
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Achievement</div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            onClick={handleViewCertificate}
                            disabled={isDisabled}
                            className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]"
                        >
                            <Award className="w-5 h-5 mr-2" />
                            View Certificate
                        </Button>
                    </div>

                    {/* Subtle hint */}
                    <p className="text-center text-xs text-muted-foreground mt-6 opacity-70">
                        We'd love to hear your feedback about this course
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};
