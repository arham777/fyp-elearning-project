from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from . import views

# Main router
router = routers.SimpleRouter()
router.register(r'users', views.UserViewSet)
router.register(r'courses', views.CourseViewSet, basename='course')
router.register(r'enrollments', views.EnrollmentViewSet, basename='enrollment')

# Course nested router
courses_router = routers.NestedSimpleRouter(router, r'courses', lookup='course')
courses_router.register(r'modules', views.CourseModuleViewSet, basename='course-module')
courses_router.register(r'assignments', views.AssignmentViewSet, basename='course-assignment')

# Module nested router
modules_router = routers.NestedSimpleRouter(courses_router, r'modules', lookup='module')
modules_router.register(r'content', views.ContentViewSet, basename='module-content')

# Assignment nested router
assignments_router = routers.NestedSimpleRouter(courses_router, r'assignments', lookup='assignment')
assignments_router.register(r'submissions', views.AssignmentSubmissionViewSet, basename='assignment-submission')
assignments_router.register(r'questions', views.AssignmentQuestionViewSet, basename='assignment-question')

# Certificate router
router.register(r'certificates', views.CertificateViewSet, basename='certificate')
# Notifications router
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'support', views.SupportRequestViewSet, basename='support')
# Payment router
router.register(r'payments', views.PaymentViewSet, basename='payment')
# Gamification router
router.register(r'gamification', views.GamificationViewSet, basename='gamification')

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('', include(router.urls)),
    path('', include(courses_router.urls)),
    path('', include(modules_router.urls)),
    path('', include(assignments_router.urls)),
    path('payments/jazzcash/return/', views.JazzCashReturnView.as_view(), name='jazzcash-return'),
    path('payments/stripe/webhook/', views.StripeWebhookView.as_view(), name='stripe-webhook'),
] 