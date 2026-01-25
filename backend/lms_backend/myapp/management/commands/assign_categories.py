from django.core.management.base import BaseCommand
from myapp.models import Course


class Command(BaseCommand):
    help = 'Assign categories to courses based on their titles and descriptions'

    def handle(self, *args, **options):
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

        self.stdout.write("Assigning categories to courses...")
        for course in courses:
            if not course.category:  # Only update if category is null/empty
                new_category = assign_category(course)
                course.category = new_category
                course.save(update_fields=['category'])
                self.stdout.write(self.style.SUCCESS(f"✓ {course.id}: {course.title[:50]} → {new_category}"))
                updated_count += 1
            else:
                self.stdout.write(f"- {course.id}: {course.title[:50]} → Already has category: {course.category}")

        self.stdout.write(self.style.SUCCESS(f"\n✅ Updated {updated_count} courses with categories!"))
        self.stdout.write("\nCategory distribution:")
        for category in Course.objects.values_list('category', flat=True).distinct():
            count = Course.objects.filter(category=category).count()
            self.stdout.write(f"  {category}: {count} courses")
