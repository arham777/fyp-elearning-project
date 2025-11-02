# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a comprehensive full-stack e-learning platform with role-based access control (Student, Teacher, Admin), course management, progress tracking, assignment system, and automated certificate generation.

**Tech Stack:**
- **Backend**: Django 5.2.4 + Django REST Framework + PostgreSQL/SQLite
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Authentication**: JWT with role-based permissions
- **State Management**: TanStack Query (React Query)

## Directory Structure

```
FYP-elearning-project/
├── backend/lms_backend/        # Django backend
│   ├── myapp/                  # Main Django app with models, views, serializers
│   ├── api/                    # Additional API views and serializers  
│   ├── lms_backend/           # Django project settings
│   ├── manage.py              # Django management commands
│   └── requirements.txt       # Python dependencies
└── e-learning-ui/             # React frontend
    ├── src/
    │   ├── components/        # Reusable UI components
    │   ├── pages/             # Route-specific pages
    │   │   ├── studentRole/   # Student-specific pages
    │   │   ├── teacherRole/   # Teacher-specific pages  
    │   │   └── adminRole/     # Admin-specific pages
    │   ├── contexts/          # React contexts (AuthContext, etc.)
    │   ├── api/              # API client functions
    │   ├── types/            # TypeScript definitions
    │   └── lib/              # Utility functions
    └── package.json          # Node.js dependencies
```

## Common Development Commands

### Backend Commands (from backend/lms_backend/)

**Environment Setup:**
```powershell
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies  
pip install -r requirements.txt
```

**Database Management:**
```powershell
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load sample data (if fixtures exist)
python -X utf8 manage.py loaddata sqlite_dump.json
```

**Development Server:**
```powershell
# Run development server (default: http://localhost:8000)
python manage.py runserver

# Run with specific port
python manage.py runserver 8080
```

**Database Operations:**
```powershell
# Django shell for debugging
python manage.py shell

# Reset PostgreSQL auto-increment sequences (after loading fixtures)
python scripts/reset_pg_identities.py

# Create database dump
python scripts/dump_postgres_utf8.py
```

### Frontend Commands (from e-learning-ui/)

**Development:**
```powershell
# Install dependencies
npm install

# Start development server (default: http://localhost:5173)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Preview production build
npm run preview
```

**Code Quality:**
```powershell
# Lint code
npm run lint
```

## Architecture Overview

### Backend Architecture

**Core Models Hierarchy:**
- `User` (Custom user with roles: student/teacher/admin)
- `Course` → `CourseModule` → `Content` (hierarchical content structure)
- `Enrollment` → `ContentProgress` (tracks student progress)
- `Assignment` → `AssignmentQuestion` → `AssignmentOption` (assessment system)
- `AssignmentSubmission` (student submissions with grading)
- `Certificate` (automated certificate generation)
- `Payment` (course payment tracking)

**Key Business Logic:**
- **Progress Calculation**: `Enrollment.calculate_progress()` computes completion percentage based on content viewed + assignments passed
- **Auto-Certification**: `Enrollment.check_completion_and_issue_certificate()` issues certificates when progress reaches 100%
- **Role-based Permissions**: Custom permissions system restricts access by user role
- **Course Publication Workflow**: Courses have draft/pending/published/rejected status with admin approval

### Frontend Architecture

**Route Structure:**
- Public routes: `/`, `/login`, `/register`, `/blocked`
- Protected routes under `/app/*` with `DashboardLayout`
- Role-based dashboard components (`StudentDashboard`, `TeacherDashboard`, `AdminDashboard`)

**State Management:**
- `AuthContext` manages authentication state and user data
- TanStack Query handles server state caching and synchronization
- Form state managed by React Hook Form with Zod validation

**Component Organization:**
- `components/ui/` - shadcn/ui base components
- `components/auth/` - authentication forms
- `components/courses/` - course-related components
- `components/dashboard/` - dashboard layout and navigation
- `pages/` - route-specific page components organized by role

## Environment Configuration

### Backend (.env in backend/lms_backend/)
```
SECRET_KEY=your_django_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL for production, SQLite for development)
DB_NAME=elearningdb
DB_USER=adminuser  
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Optional: Cloudinary for file storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (.env in e-learning-ui/)
```
VITE_API_BASE_URL=http://localhost:8000/api
```

## API Endpoints

**Authentication:**
- `POST /api/token/` - Login (get JWT tokens)
- `POST /api/token/refresh/` - Refresh access token  
- `POST /api/register/` - User registration

**Core Resources:**
- `GET /api/courses/` - List published courses
- `POST /api/courses/` - Create course (teachers only)
- `GET/PUT /api/courses/{id}/` - Course detail/update
- `GET/POST /api/enrollments/` - Course enrollments
- `GET/POST /api/assignments/` - Assignment management
- `GET /api/certificates/` - User certificates

## Development Patterns

### Adding New Models
1. Define model in `backend/lms_backend/myapp/models.py`
2. Create serializer in `backend/lms_backend/api/serializers.py`
3. Add view in `backend/lms_backend/api/views.py`
4. Register URL route in `backend/lms_backend/api/urls.py`
5. Run migrations: `python manage.py makemigrations && python manage.py migrate`

### Adding New React Pages
1. Create page component in appropriate `src/pages/` subdirectory
2. Add route to `src/App.tsx` within the `/app` protected route
3. Add navigation link to `src/components/dashboard/DashboardLayout.tsx` if needed
4. Create TypeScript types in `src/types/` if needed

### Working with Forms
- Use React Hook Form with Zod validation
- Follow existing patterns in `src/components/auth/` for form structure
- Use shadcn/ui form components for consistency

## Testing & Database Management

### Local Database Setup (PostgreSQL)
See `backend/LOCAL_DB_SETUP.md` for detailed PostgreSQL setup instructions.

**Quick PostgreSQL setup:**
```sql
-- Create user and database
CREATE USER adminuser WITH PASSWORD 'your_password';  
CREATE DATABASE elearningdb OWNER adminuser;
GRANT ALL PRIVILEGES ON DATABASE elearningdb TO adminuser;
```

### Data Sharing Between Developers
- **Method 1**: Share Django fixtures via `python scripts/dump_postgres_utf8.py`
- **Method 2**: Share PostgreSQL dumps via `pg_dump` and `pg_restore`
- Never commit database files or fixtures to git

## Common Issues

### Windows UTF-8 Issues
Use `python -X utf8` prefix for database operations involving Unicode data:
```powershell
python -X utf8 manage.py loaddata fixture.json
```

### PostgreSQL Permission Issues
Ensure database is created with correct owner and schema permissions are granted (see LOCAL_DB_SETUP.md).

### Frontend Build Issues
- Clear node_modules and reinstall if dependency issues occur
- Check that VITE_API_BASE_URL is correctly set in .env
- Use `npm run build:dev` for development builds with different optimizations

## Role-Based Development Notes

**Student Role:**
- Can enroll in published courses
- Track progress through ContentProgress model  
- Submit assignments and view grades
- Earn certificates on course completion

**Teacher Role:**
- Create and manage courses (with admin approval workflow)
- Grade student assignments via AssignmentSubmission model
- View enrolled students and their progress

**Admin Role:**  
- Full system access and user management
- Course approval workflow (draft → pending → published/rejected)
- System-wide analytics and reporting
- Certificate and payment management