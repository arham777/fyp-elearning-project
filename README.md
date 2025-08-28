# E-Learning Platform

A comprehensive full-stack e-learning platform built with Django REST Framework and React TypeScript, designed to facilitate online education with role-based access control, course management, progress tracking, and automated certificate generation.

## 🚀 Features

### 👤 User Management
- **Multi-role Authentication**: Support for Students, Teachers, and Administrators
- **JWT-based Security**: Secure authentication with JSON Web Tokens
- **Role-based Permissions**: Different access levels and functionalities per role
- **User Profiles**: Comprehensive user profile management

### 📚 Course Management
- **Course Creation**: Teachers can create and manage courses
- **Module Structure**: Organized course content in modules and lessons
- **Content Types**: Support for video lectures and reading materials
- **Course Catalog**: Browse and discover available courses

### 🎓 Learning Experience
- **Student Enrollment**: Easy course enrollment system
- **Progress Tracking**: Real-time tracking of learning progress
- **Interactive Content**: Video and text-based learning materials
- **Assignment System**: Create and submit assignments with grading

### 📜 Certification
- **Automated Certificates**: Automatic certificate generation upon course completion
- **Verification System**: Unique verification codes for certificate authenticity
- **Progress Requirements**: Certificate issuance based on completion criteria

### 💳 Payment System
- **Course Payments**: Integrated payment processing for course enrollment
- **Transaction Tracking**: Complete payment history and status tracking

### 📊 Analytics & Reporting
- **Student Dashboard**: Personal learning dashboard with progress overview
- **Teacher Dashboard**: Course management and student progress monitoring
- **Admin Panel**: System-wide administration and user management

## 🛠 Tech Stack

### Backend
- **Framework**: Django 5.2.4 with Django REST Framework
- **Database**: SQLite (development) / PostgreSQL (production ready)
- **Authentication**: JWT with Simple JWT
- **API**: RESTful API with proper serialization
- **CORS**: Configured for frontend integration

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui with Radix UI components
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form with Zod validation

## 📋 Prerequisites

Before running this application, make sure you have:
- **Python 3.8+**
- **Node.js 16+**
- **npm or yarn**
- **Git**

## ⚡ Quick Start

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend/lms_backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   ```bash
   cp env.example .env
   # Edit .env file with your configuration
   ```

5. **Database Setup**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create Superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run Development Server**
   ```bash
   python manage.py runserver
   ```

The backend API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd e-learning-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   # Configure VITE_API_BASE_URL=http://localhost:8000/api
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

The frontend application will be available at `http://localhost:5173`

## 🏗 Project Structure

```
FYP-elearning-project/
├── backend/
│   └── lms_backend/
│       ├── myapp/                 # Main application
│       │   ├── models.py          # Database models
│       │   ├── views.py           # API views
│       │   ├── serializers.py     # API serializers
│       │   ├── urls.py           # URL routing
│       │   └── permissions.py     # Custom permissions
│       ├── lms_backend/          # Django project settings
│       ├── manage.py             # Django management
│       └── requirements.txt      # Python dependencies
└── e-learning-ui/
    ├── src/
    │   ├── components/           # Reusable UI components
    │   │   ├── auth/            # Authentication forms
    │   │   ├── courses/         # Course-related components
    │   │   ├── dashboard/       # Dashboard layout
    │   │   └── ui/              # shadcn/ui components
    │   ├── pages/               # Application pages
    │   │   ├── adminRole/       # Admin-specific pages
    │   │   ├── studentRole/     # Student-specific pages
    │   │   └── teacherRole/     # Teacher-specific pages
    │   ├── contexts/            # React contexts
    │   ├── api/                 # API client functions
    │   ├── types/               # TypeScript definitions
    │   └── lib/                 # Utility functions
    └── package.json             # Node.js dependencies
```

## 🔧 API Endpoints

### Authentication
- `POST /api/token/` - Login and get JWT tokens
- `POST /api/token/refresh/` - Refresh access token
- `POST /api/register/` - User registration

### Courses
- `GET /api/courses/` - List courses
- `POST /api/courses/` - Create course (teachers only)
- `GET /api/courses/{id}/` - Course details
- `PUT /api/courses/{id}/` - Update course (teachers/admins)

### Enrollments
- `GET /api/enrollments/` - List user enrollments
- `POST /api/enrollments/` - Enroll in course

### Assignments
- `GET /api/assignments/` - List assignments
- `POST /api/assignments/` - Create assignment (teachers)

### Certificates
- `GET /api/certificates/` - List user certificates

## 👥 User Roles & Permissions

### 🎓 Student
- Browse and enroll in courses
- Access enrolled course content
- Submit assignments
- Track learning progress
- View earned certificates
- Manage personal profile

### 👨‍🏫 Teacher
- Create and manage courses
- Add course modules and content
- Create and grade assignments
- Monitor student progress
- View enrolled students

### 👨‍💼 Administrator
- Full system access
- Manage all users and courses
- View system-wide analytics
- Course and content moderation

## 🔄 Current Working Features

### ✅ Implemented & Working
- [x] User authentication and registration
- [x] Role-based access control
- [x] Course creation and management
- [x] Course module and content management
- [x] Student enrollment system
- [x] Progress tracking
- [x] Assignment creation and submission
- [x] Automated certificate generation
- [x] Payment processing integration
- [x] Responsive dashboard interfaces
- [x] Course catalog browsing
- [x] Content viewing (video/text)

### 🚧 In Development
- [ ] Advanced analytics dashboard
- [ ] Discussion forums
- [ ] Live streaming integration
- [ ] Mobile app companion
- [ ] Advanced reporting features

## 🎨 UI/UX Design

The application follows a clean, professional design with:
- **Neutral Color Palette**: Primarily black, white, and grey tones [[memory:5458341]]
- **Orange Accents**: Sparingly used for user profile icons and interactive elements [[memory:5458341]]
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: WCAG compliant components from Radix UI

## 🚀 Deployment

### Backend Deployment
1. Configure production settings in Django
2. Set up PostgreSQL database
3. Configure environment variables
4. Use Gunicorn as WSGI server
5. Set up reverse proxy with Nginx

### Frontend Deployment
1. Build for production: `npm run build`
2. Deploy `dist/` folder to static hosting
3. Configure environment variables for production API

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team

## 🔮 Future Enhancements

- **AI-Powered Recommendations**: Personalized course suggestions
- **Gamification**: Badges, points, and leaderboards
- **Social Learning**: Student interaction features
- **Advanced Analytics**: Detailed learning analytics
- **Mobile Application**: Native iOS and Android apps
- **Integration APIs**: Third-party LMS integrations

---

**Built with ❤️ for the future of online education**
