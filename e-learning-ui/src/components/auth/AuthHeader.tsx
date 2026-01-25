
import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

const AuthHeader: React.FC = () => {
    return (
        <div className="absolute top-4 left-0 right-0 z-50 flex justify-center px-4">
            <Link
                to="/"
                className="h-12 rounded-full border border-border/60 bg-card shadow-sm flex items-center gap-3 px-6 hover:bg-accent/50 transition-colors"
            >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-orange/15 text-[0] border border-accent-orange/30 ring-0">
                    <GraduationCap className="h-4 w-4 text-accent-orange" />
                </span>
                <div className="leading-tight">
                    <span className="block text-sm font-semibold">EduPlatform</span>
                </div>
            </Link>
        </div>
    );
};

export default AuthHeader;
