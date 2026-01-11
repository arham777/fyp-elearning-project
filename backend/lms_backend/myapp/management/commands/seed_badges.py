from django.core.management.base import BaseCommand
from myapp.models import Badge


DEFAULT_BADGES = [
    # Streak badges
    {'code': 'streak_7', 'name': '7-Day Warrior', 'description': 'Maintain a 7-day learning streak', 'badge_type': 'streak', 'icon': '🔥', 'xp_reward': 50, 'requirement_value': 7},
    {'code': 'streak_30', 'name': '30-Day Champion', 'description': 'Maintain a 30-day learning streak', 'badge_type': 'streak', 'icon': '⚡', 'xp_reward': 150, 'requirement_value': 30},
    {'code': 'streak_100', 'name': '100-Day Legend', 'description': 'Maintain a 100-day learning streak', 'badge_type': 'streak', 'icon': '👑', 'xp_reward': 500, 'requirement_value': 100},
    # Completion badges
    {'code': 'first_course', 'name': 'First Steps', 'description': 'Complete your first course', 'badge_type': 'completion', 'icon': '🎓', 'xp_reward': 100, 'requirement_value': 1},
    {'code': 'courses_5', 'name': 'Knowledge Seeker', 'description': 'Complete 5 courses', 'badge_type': 'completion', 'icon': '📚', 'xp_reward': 200, 'requirement_value': 5},
    {'code': 'courses_10', 'name': 'Course Master', 'description': 'Complete 10 courses', 'badge_type': 'completion', 'icon': '🏅', 'xp_reward': 400, 'requirement_value': 10},
    # Performance badges
    {'code': 'perfect_score', 'name': 'Perfect Score', 'description': 'Get 100% on any assignment', 'badge_type': 'performance', 'icon': '💯', 'xp_reward': 50, 'requirement_value': 1},
    {'code': 'quick_learner', 'name': 'Quick Learner', 'description': 'Complete a course in under 7 days', 'badge_type': 'performance', 'icon': '🚀', 'xp_reward': 100, 'requirement_value': 7},
    # Engagement badges
    {'code': 'reviewer', 'name': 'Reviewer', 'description': 'Write your first course review', 'badge_type': 'engagement', 'icon': '⭐', 'xp_reward': 30, 'requirement_value': 1},
    {'code': 'top_3', 'name': 'Top 3', 'description': 'Rank in top 3 on weekly leaderboard', 'badge_type': 'engagement', 'icon': '🏆', 'xp_reward': 100, 'requirement_value': 3},
]


class Command(BaseCommand):
    help = 'Seed default badges for gamification'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        
        for badge_data in DEFAULT_BADGES:
            badge, created = Badge.objects.update_or_create(
                code=badge_data['code'],
                defaults=badge_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created badge: {badge.name}'))
            else:
                updated_count += 1
                self.stdout.write(f'Updated badge: {badge.name}')
        
        self.stdout.write(self.style.SUCCESS(
            f'\nSeeding complete! Created: {created_count}, Updated: {updated_count}'
        ))
        self.stdout.write(f'Total badges in database: {Badge.objects.count()}')
