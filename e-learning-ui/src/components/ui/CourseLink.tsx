import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCourseNavigationPath } from '@/utils/courseNavigation';

interface CourseLinkProps {
  courseId: number;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const CourseLink: React.FC<CourseLinkProps> = ({ 
  courseId, 
  children, 
  className,
  onClick 
}) => {
  const [path, setPath] = useState(`/app/courses/${courseId}`);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getPath = async () => {
      try {
        const navigationPath = await getCourseNavigationPath(courseId);
        setPath(navigationPath);
      } catch (error) {
        console.error('Failed to get course navigation path:', error);
        // Keep default path
      } finally {
        setIsLoading(false);
      }
    };

    getPath();
  }, [courseId]);

  if (isLoading) {
    return (
      <span className={className}>
        {children}
      </span>
    );
  }

  return (
    <Link to={path} className={className} onClick={onClick}>
      {children}
    </Link>
  );
};
