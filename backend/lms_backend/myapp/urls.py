from django.urls import path
from .views import (
    UserListView, UserDetailView, CourseListCreateView, CourseDetailView,
    EnrollmentListCreateView, PaymentListCreateView, AssignmentListCreateView,
    CertificateListCreateView, UserRegistrationView
)

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('courses/', CourseListCreateView.as_view(), name='course-list-create'),
    path('courses/<int:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('enrollments/', EnrollmentListCreateView.as_view(), name='enrollment-list-create'),
    path('payments/', PaymentListCreateView.as_view(), name='payment-list-create'),
    path('assignments/', AssignmentListCreateView.as_view(), name='assignment-list-create'),
    path('certificates/', CertificateListCreateView.as_view(), name='certificate-list-create'),
]