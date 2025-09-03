import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCourseNavigationPath, getCourseModuleNavigationPath, getCourseContentNavigationPath } from '@/utils/courseNavigation';

export const useCourseNavigation = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const navigateToCourse = useCallback(async (courseId: number) => {
    setIsLoading(true);
    try {
      const path = await getCourseNavigationPath(courseId);
      navigate(path);
    } catch (error) {
      console.error('Failed to navigate to course:', error);
      // Fallback to courses path
      navigate(`/app/courses/${courseId}`);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const navigateToCourseModule = useCallback(async (courseId: number, moduleId: number) => {
    setIsLoading(true);
    try {
      const path = await getCourseModuleNavigationPath(courseId, moduleId);
      navigate(path);
    } catch (error) {
      console.error('Failed to navigate to course module:', error);
      // Fallback to courses path
      navigate(`/app/courses/${courseId}/modules/${moduleId}`);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const navigateToCourseContent = useCallback(async (courseId: number, moduleId: number, contentId: number) => {
    setIsLoading(true);
    try {
      const path = await getCourseContentNavigationPath(courseId, moduleId, contentId);
      navigate(path);
    } catch (error) {
      console.error('Failed to navigate to course content:', error);
      // Fallback to courses path
      navigate(`/app/courses/${courseId}/modules/${moduleId}/content/${contentId}`);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const getCourseLink = useCallback(async (courseId: number): Promise<string> => {
    try {
      return await getCourseNavigationPath(courseId);
    } catch (error) {
      console.error('Failed to get course link:', error);
      return `/app/courses/${courseId}`;
    }
  }, []);

  return {
    navigateToCourse,
    navigateToCourseModule,
    navigateToCourseContent,
    getCourseLink,
    isLoading
  };
};
