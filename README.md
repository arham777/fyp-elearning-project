# E-Learning Platform 🎓

A comprehensive e-learning platform built with Django (Backend) and React (Frontend) with TypeScript, offering course management, user authentication, and certificate generation.

## 🚀 Features

- **User Management**: Student, Teacher, and Admin roles
- **Course Management**: Create, edit, and manage courses with modules and content
- **Assignment System**: Assignments with grading and submissions
- **Payment Integration**: Course purchase functionality
- **Certificate Generation**: Automatic certificate generation upon course completion
- **Progress Tracking**: Track student progress through courses
- **Responsive UI**: Modern, clean interface using ShadCN UI components

## 🏗️ Tech Stack

### Backend
- **Framework**: Django 5.2.4 with Django REST Framework
- **Authentication**: JWT tokens with SimpleJWT
- **Database**: SQLite (Development) / PostgreSQL (Production recommended)
- **CORS**: django-cors-headers for cross-origin requests

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: ShadCN UI components with Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM
- **HTTP Client**: Axios with interceptors

## 🚨 **CRITICAL: Django Admin Login Issue**

**99% of new team members face this issue**: After running backend successfully, Django admin login fails.

**Quick Fix** (run after `python manage.py bootstrap_dev`):
```bash
python manage.py shell -c "from myapp.models import User; admin = User.objects.get(username='admin'); admin.is_staff = True; admin.save(); print('Fixed!')"
```

**Login Details**: 
- URL: http://localhost:8000/admin/
- Username: `admin` 
- Password: `admin123`

**Detailed Fix Guide**: See `TEAM_MEMBER_FIX.md`

## ⚠️ **Other Setup Considerations**

1. **Environment Variables** - Check `SETUP_GUIDE.md` for complete list
2. **Port Configuration** - Frontend (8080) and Backend (8000) are pre-configured
3. **Database Setup** - Follow migration steps in order

## 🛠️ Quick Setup

### Prerequisites
- Python 3.8+
- Node.js 18+
- pip (Python package manager)
- npm or yarn

### Backend Setup
```bash
# Navigate to backend directory
cd backend/lms_backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp env.example .env
# Edit .env with your configuration

# Run database migrations
python manage.py migrate

# Create superuser
python manage.py bootstrap_dev

# **CRITICAL FIX**: Django admin login permission
python manage.py shell -c "from myapp.models import User; admin = User.objects.get(username='admin'); admin.is_staff = True; admin.save(); print('Fixed admin permissions')"

# Start Django server
python manage.py runserver 0.0.0.0:8000
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd e-learning-ui

# Install dependencies
npm install

# Setup environment variables
cp env.example .env
# Edit .env with your backend API URL

# Start development server
npm run dev
```

### Access Points
- **Backend API**: http://localhost:8000/api/
- **Frontend**: http://localhost:8080/
- **Admin Panel**: http://localhost:8000/admin/

## 📁 Project Structure

```
FYP-elearning-project/
├── backend/
│   └── lms_backend/
│       ├── myapp/              # Main Django app
│       ├── api/                # API endpoints
│       ├── lms_backend/        # Project settings
│       ├── manage.py
│       └── requirements.txt
├── e-learning-ui/
│   ├── src/
│   │   ├── api/               # API client configuration
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── contexts/          # React contexts
│   │   └── types/             # TypeScript types
│   ├── public/
│   └── package.json
├── SETUP_GUIDE.md             # Detailed setup instructions
└── README.md                  # This file
```

## 🗃️ **Database Collaboration**

**Important**: This project shares the SQLite database file via Git for team collaboration.

**What this means:**
- ✅ **Team members get your latest data** (courses, users, enrollments)
- ✅ **No manual data recreation needed**
- ✅ **Same database state** across all developers

**Workflow:**
```bash
# After making changes (adding courses, users)
git add .
git commit -m "Added Python course with 3 modules"
git push

# Team members get updates via:
git pull  # Database automatically updates!
```

**Detailed Guide**: See `DATABASE_SHARING_GUIDE.md`

## 🔐 User Roles & Access

### Student
- Browse and enroll in courses
- Access course content and modules
- Submit assignments
- Track progress and earn certificates

### Teacher
- Create and manage courses
- Upload course content
- Create assignments and grade submissions
- View student progress

### Admin
- Manage all users, courses, and system settings
- Access Django admin panel
- Override permissions and manage platform

## 🌐 API Endpoints

### Authentication
- `POST /api/token/` - Login
- `POST /api/token/refresh/` - Refresh token
- `POST /api/register/` - Register new user

### Courses
- `GET /api/courses/` - List all courses
- `POST /api/courses/` - Create course (Teacher+)
- `GET /api/courses/{id}/` - Course details

### Enrollments
- `POST /api/enrollments/` - Enroll in course
- `GET /api/enrollments/` - User enrollments

For complete API documentation, visit `/api/` endpoint when server is running.

## 🚀 Deployment

### Backend (Django)
1. Set `DEBUG=False` in production settings
2. Configure production database (PostgreSQL recommended)
3. Set up proper `ALLOWED_HOSTS`
4. Configure static files serving
5. Use environment variables for sensitive data

### Frontend (React)
1. Run `npm run build` to create production build
2. Serve `dist/` directory with web server
3. Configure environment variables for production API

## 🤝 Contributing

1. Clone the repository
2. **Read `SETUP_GUIDE.md` first** for detailed setup instructions and issue fixes
3. Create a feature branch
4. Make your changes
5. Test both frontend and backend
6. Submit a pull request

## 📋 Development Notes

- **Database**: Uses SQLite for development, recommend PostgreSQL for production
- **CORS**: Configured for development, adjust for production deployment  
- **JWT**: Tokens automatically refresh, stored in localStorage
- **File Uploads**: Course content and certificates supported
- **Payment**: Payment model exists, integrate with payment gateway as needed

## 🐛 Known Issues

See `SETUP_GUIDE.md` for a comprehensive list of setup issues and their solutions.

## 📄 License

This project is for educational/development purposes. Please check individual dependencies for their licenses.

## 📞 Support

If you encounter issues during setup:
1. Check `SETUP_GUIDE.md` for detailed troubleshooting
2. Ensure all prerequisites are installed
3. Verify environment variables are set correctly
4. Check that both frontend and backend servers are running

---

**⚠️ Important**: Before starting development, please review the `SETUP_GUIDE.md` file which contains critical setup information and issue fixes.
