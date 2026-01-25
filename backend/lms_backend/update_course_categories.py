"""
Standalone script to assign categories to courses
Run this from the backend directory: python update_course_categories.py
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')

# Temporarily replace dj_database_url import if missing
try:
    import dj_database_url
except ImportError:
    # Mock it if not available
    class MockDjDatabaseUrl:
        @staticmethod
        def config(*args, **kwargs):
            return {}
    sys.modules['dj_database_url'] = MockDjDatabaseUrl()

django.setup()

from myapp.models import Course

# Define category mappings based on keywords in course titles
CATEGORY_MAPPINGS = {
    'Web Development': [
        'react', 'web', 'frontend', 'backend', 'html', 'css', 
        'javascript', 'node', 'django', 'flask', 'vue', 'angular',
        'fullstack', 'mern', 'mean', 'next', 'nuxt'
    ],
    'Mobile Development': [
        'mobile', 'android', 'ios', 'flutter', 'react native',
        'swift', 'kotlin', 'app development'
    ],
    'Data Science': [
        'data science', 'data analysis', 'analytics', 
        'pandas', 'numpy', 'visualization', 'tableau'
    ],
    'Machine Learning': [
        'machine learning', 'ml', 'ai', 'artificial intelligence',
        'deep learning', 'neural', 'tensorflow', 'pytorch'
    ],
    'Design': [
        'design', 'ui', 'ux', 'figma', 'photoshop',
        'illustrator', 'graphic', 'user interface'
    ],
    'Business': [
        'business', 'management', 'entrepreneurship',
        'startup', 'strategy', 'leadership'
    ],
    'Marketing': [
        'marketing', 'digital marketing', 'seo', 'social media',
        'advertising', 'branding', 'content marketing'
    ],
    'Database': [
        'database', 'sql', 'mysql', 'postgresql', 'mongodb',
        'dbms', 'nosql', 'redis', 'dynamodb'
    ],
    'Cybersecurity': [
        'cyber', 'security', 'hacking', 'penetration',
        'ethical hacking', 'network security', 'infosec'
    ],
    'Cloud Computing': [
        'cloud', 'aws', 'azure', 'gcp', 'docker',
        'kubernetes', 'devops', 'serverless'
    ],
    'Operating Systems': [
        'operating system', 'os', 'linux', 'windows',
        'unix', 'kernel', 'system administration'
    ],
    'Programming': [
        'python', 'java', 'c++', 'programming',
        'coding', 'software development', 'algorithms'
    ],
}


def assign_category(course):
    """Assign category to a course based on title and description"""
    text = f"{course.title} {course.description}".lower()
    
    # Track matches with scores
    category_scores = {}
    
    for category, keywords in CATEGORY_MAPPINGS.items():
        score = 0
        for keyword in keywords:
            if keyword in text:
                # Weight title matches higher than description
                if keyword in course.title.lower():
                    score += 3
                else:
                    score += 1
        
        if score > 0:
            category_scores[category] = score
    
    # Return category with highest score, or 'General' if no matches
    if category_scores:
        return max(category_scores.items(), key=lambda x: x[1])[0]
    
    return 'General'


def main():
    print("=" * 60)
    print("COURSE CATEGORY ASSIGNMENT SCRIPT")
    print("=" * 60)
    print()
    
    # Get all courses
    courses = Course.objects.all()
    total_courses = courses.count()
    
    if total_courses == 0:
        print("❌ No courses found in the database!")
        return
    
    print(f"Found {total_courses} courses in the database\n")
    
    # Update courses
    updated_count = 0
    skipped_count = 0
    
    for i, course in enumerate(courses, 1):
        print(f"[{i}/{total_courses}] Processing: {course.title[:60]}")
        
        if course.category and course.category.strip():
            # Already has a category
            print(f"    ℹ  Already has category: {course.category}")
            skipped_count += 1
        else:
            # Assign new category
            new_category = assign_category(course)
            course.category = new_category
            course.save(update_fields=['category'])
            print(f"    ✓ Assigned category: {new_category}")
            updated_count += 1
        
        print()
    
    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total courses: {total_courses}")
    print(f"Updated: {updated_count}")
    print(f"Skipped (already had category): {skipped_count}")
    print()
    
    # Show category distribution
    print("Category Distribution:")
    print("-" * 60)
    
    categories = Course.objects.values_list('category', flat=True).distinct()
    for category in sorted(categories):
        count = Course.objects.filter(category=category).count()
        bar = "█" * min(count, 50)
        print(f"  {category:25s} [{count:3d}] {bar}")
    
    print()
    print("✅ Done! Categories have been assigned to all courses.")
    print()


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
