"""
Management command to seed the Category table with all known categories.

Usage:
    python manage.py seed_categories
"""
from django.core.management.base import BaseCommand
from myapp.models import Category


CATEGORY_GROUPS = [
    {
        "name": "Technology & IT",
        "categories": [
            "Web Development", "Mobile App Development", "Software Engineering",
            "Data Science", "Machine Learning", "Artificial Intelligence",
            "Cloud Computing", "Cybersecurity", "DevOps", "Blockchain",
            "Game Development", "Database Management", "DBMS", "Networking",
            "IT Support", "Programming Languages",
        ],
    },
    {
        "name": "Business & Management",
        "categories": [
            "Business Administration", "Project Management", "Entrepreneurship",
            "Leadership", "Strategic Management", "Operations Management",
            "Supply Chain Management", "Risk Management", "Business Analytics",
            "E-commerce", "Startups", "Business Strategy",
        ],
    },
    {
        "name": "Marketing & Sales",
        "categories": [
            "Digital Marketing", "Social Media Marketing", "Content Marketing",
            "SEO & SEM", "Email Marketing", "Brand Management", "Sales",
            "Advertising", "Public Relations", "Market Research", "Copywriting",
            "Affiliate Marketing",
        ],
    },
    {
        "name": "Finance & Accounting",
        "categories": [
            "Accounting", "Financial Analysis", "Investment", "Stock Trading",
            "Cryptocurrency", "Banking", "Taxation", "Financial Planning",
            "Corporate Finance", "Bookkeeping", "Auditing", "Insurance",
        ],
    },
    {
        "name": "Design & Creative",
        "categories": [
            "Graphic Design", "UI/UX Design", "Web Design", "Interior Design",
            "Fashion Design", "Industrial Design", "Animation", "Video Production",
            "Photography", "3D Modeling", "Motion Graphics", "Illustration",
            "Logo Design", "Brand Identity",
        ],
    },
    {
        "name": "Human Resources",
        "categories": [
            "HR Management", "Recruitment & Hiring", "Employee Training",
            "Performance Management", "Compensation & Benefits", "Labor Law",
            "Organizational Development", "Talent Management",
            "Employee Relations", "HR Analytics", "Diversity & Inclusion",
        ],
    },
    {
        "name": "Health & Medical",
        "categories": [
            "Healthcare Administration", "Nursing", "Medical Coding", "Pharmacy",
            "Mental Health", "Nutrition & Dietetics", "Public Health",
            "First Aid & CPR", "Medical Terminology", "Health Informatics",
            "Fitness & Exercise", "Yoga & Meditation",
        ],
    },
    {
        "name": "Education & Teaching",
        "categories": [
            "Teaching Methods", "Curriculum Development", "Educational Technology",
            "Online Teaching", "Special Education", "Early Childhood Education",
            "Higher Education", "Corporate Training", "Tutoring",
            "Instructional Design",
        ],
    },
    {
        "name": "Personal Development",
        "categories": [
            "Communication Skills", "Public Speaking", "Time Management",
            "Productivity", "Critical Thinking", "Problem Solving",
            "Emotional Intelligence", "Confidence Building", "Goal Setting",
            "Memory & Study Skills", "Negotiation", "Career Development",
        ],
    },
    {
        "name": "Languages",
        "categories": [
            "English", "Spanish", "French", "German", "Chinese (Mandarin)",
            "Japanese", "Arabic", "Korean", "Italian", "Portuguese", "Russian",
            "Urdu", "Hindi",
        ],
    },
    {
        "name": "Engineering",
        "categories": [
            "Mechanical Engineering", "Electrical Engineering", "Civil Engineering",
            "Chemical Engineering", "Aerospace Engineering", "Biomedical Engineering",
            "Environmental Engineering", "Robotics", "AutoCAD & Drafting",
            "Electronics",
        ],
    },
    {
        "name": "Law & Legal",
        "categories": [
            "Contract Law", "Corporate Law", "Criminal Law",
            "Intellectual Property", "Employment Law", "Real Estate Law",
            "International Law", "Legal Writing", "Compliance",
            "Paralegal Studies",
        ],
    },
    {
        "name": "Science & Research",
        "categories": [
            "Biology", "Chemistry", "Physics", "Mathematics", "Statistics",
            "Environmental Science", "Astronomy", "Research Methods",
            "Lab Techniques", "Scientific Writing",
        ],
    },
    {
        "name": "Arts & Humanities",
        "categories": [
            "Music", "Fine Arts", "Creative Writing", "Literature", "History",
            "Philosophy", "Psychology", "Sociology", "Anthropology",
            "Film Studies", "Theater & Acting",
        ],
    },
    {
        "name": "Lifestyle & Hobbies",
        "categories": [
            "Cooking & Culinary", "Baking & Pastry", "Gardening", "Pet Care",
            "Travel Planning", "Home Improvement", "Crafts & DIY",
            "Music Production", "Sports & Athletics", "Gaming",
        ],
    },
    {
        "name": "Government & Public Sector",
        "categories": [
            "Public Administration", "Policy Making", "Urban Planning",
            "Social Work", "Nonprofit Management", "Community Development",
            "Grant Writing", "Government Relations",
        ],
    },
]


class Command(BaseCommand):
    help = "Seed the Category table with all pre-defined categories."

    def handle(self, *args, **options):
        created_count = 0
        existing_count = 0

        for group in CATEGORY_GROUPS:
            group_name = group["name"]
            for idx, cat_name in enumerate(group["categories"]):
                _, created = Category.objects.get_or_create(
                    name=cat_name,
                    defaults={
                        "group": group_name,
                        "order": idx,
                        "is_active": True,
                    },
                )
                if created:
                    created_count += 1
                else:
                    existing_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done! Created {created_count} new categories, "
                f"{existing_count} already existed."
            )
        )
