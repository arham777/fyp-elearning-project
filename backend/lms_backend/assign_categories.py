"""
Script to assign categories to existing courses based on their titles
Run with: python manage.py shell < assign_categories.py
"""

from myapp.models import Course

# Define category mappings based on keywords in course titles
category_mappings = {
    'Web Development': ['react', 'web', 'frontend', 'backend', 'html', 'css', 'javascript', 'node', 'django', 'flask'],
    'Mobile Development': ['mobile', 'android', 'ios', 'flutter', 'react native'],
    'Data Science': ['data science', 'data analysis', 'analytics', 'pandas', 'numpy'],
    'Machine Learning': ['machine learning', 'ml', 'ai', 'artificial intelligence', 'deep learning', 'neural'],
    'Design': ['design', 'ui', 'ux', 'figma', 'photoshop'],
    'Business': ['business', 'management', 'entrepreneurship', 'marketing'],
    'Database': ['database', 'sql', 'mysql', 'postgresql', 'mongodb', 'dbms'],
    'Cybersecurity': ['cyber', 'security', 'hacking', 'penetration'],
    'Cloud Computing': ['cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes'],
    'Operating Systems': ['operating system', 'os', 'linux', 'windows'],
}

def assign_category(course):
    """Assign category to a course based on title and description"""
    text = f"{course.title} {course.description}".lower()
    
    for category, keywords in category_mappings.items():
        for keyword in keywords:
            if keyword in text:
                return category
    
    # Default category if no match found
    return 'General'

# Update all courses
courses = Course.objects.all()
updated_count = 0

print("Assigning categories to courses...")
for course in courses:
    if not course.category:  # Only update if category is null/empty
        new_category = assign_category(course)
        course.category = new_category
        course.save(update_fields=['category'])
        print(f"✓ {course.id}: {course.title[:50]} → {new_category}")
        updated_count += 1
    else:
        print(f"- {course.id}: {course.title[:50]} → Already has category: {course.category}")

print(f"\n✅ Updated {updated_count} courses with categories!")
print("\nCategory distribution:")
for category in Course.objects.values_list('category', flat=True).distinct():
    count = Course.objects.filter(category=category).count()
    print(f"  {category}: {count} courses")
