# E-Learning Platform Setup Guide

## Issues Identified for New Team Members

### ❌ **CRITICAL ISSUES** ❌

#### 1. **Missing Main README.md**
- ✅ **FIXED**: Project root mein comprehensive README.md create kar di
- **Problem thi**: New team members ko pata nahi chalta ke project kaise setup karna hai

#### 2. **Django Admin Login Issue (MOST COMMON)**
- **Issue**: Superuser create hota hai but Django admin mein login nahi ho pata
- **Impact**: `is_staff=False` prevents admin panel access
- **Solution**: ✅ Added automatic fix in setup steps + detailed guide in TEAM_MEMBER_FIX.md

#### 3. **Frontend/Backend Port Mismatch**
- **Issue**: 
  - Frontend Vite config mein port 8080 set hai
  - Backend env.example mein CORS origins mein 5173 aur 8080 dono hai
  - Frontend env.example mein API URL 8000 port use kar raha hai
- **Impact**: API calls fail honge if ports match nahi karte
- **Solution**: Standardize ports across configuration files

#### 4. **Missing Node.js/Python Version Specifications**
- **Issue**: Koi file mein Node.js ya Python version requirements specify nahi kiye
- **Impact**: Version conflicts, dependency issues
- **Solution**: Add .nvmrc, .python-version, or engine specifications

### ⚠️ **MEDIUM PRIORITY ISSUES** ⚠️

#### 5. **Database Initial Data**
- **Issue**: Fresh database mein koi sample data nahi hai
- **Impact**: Testing/development ke liye manual data entry karna padega
- **Solution**: Create fixtures or seed data command

#### 6. **Missing Environment Variable Documentation**
- **Issue**: Backend .env variables ka proper documentation nahi hai
- **Impact**: New developers ko pata nahi chalega ke kya environment variables required hain
- **Solution**: Document all environment variables with descriptions

#### 7. **Development Tools Setup Missing**
- **Issue**: No package-lock.json committed, outdated bun.lockb present
- **Impact**: Dependency version conflicts
- **Solution**: Commit proper lock files and remove unnecessary ones

## Step-by-Step Setup Instructions

### Prerequisites
```bash
# Required versions (recommended)
- Python 3.8+
- Node.js 18+
- npm or yarn
```

### Backend Setup
```bash
cd backend/lms_backend

# 1. Create virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup environment variables
copy env.example .env
# Edit .env file with your settings

# 4. Run migrations
python manage.py migrate

# 5. Create superuser (uses env variables)
python manage.py bootstrap_dev

# 6. **CRITICAL**: Fix superuser permissions (common issue)
python manage.py shell -c "from myapp.models import User; admin = User.objects.get(username='admin'); admin.is_staff = True; admin.save(); print('Fixed admin permissions')"

# 7. Start server
python manage.py runserver 0.0.0.0:8000
```

### Frontend Setup
```bash
cd e-learning-ui

# 1. Install dependencies
npm install

# 2. Setup environment variables
copy env.example .env
# Edit .env file with your backend API URL

# 3. Start development server
npm run dev
```

### Port Configuration
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:8080 (as per vite.config.ts)
- **API Endpoint**: http://localhost:8000/api

## Potential Runtime Issues

### Authentication Issues
- JWT tokens store karte hain localStorage mein
- Token refresh automatic hai
- Login page redirect hoga if authentication fails

### CORS Issues
- Backend mein CORS properly configured hai
- Development mein CORS_ALLOW_ALL_ORIGINS=True set hai
- Production ke liye specific origins set karni hongi

### Database Issues
- SQLite use ho rahi hai (good for development)
- Production ke liye PostgreSQL/MySQL recommended
- Migrations already exist, but indentation fix required

## Files That Need Attention

### Must Fix Before Running:
1. ✅ **FIXED**: Main `README.md` created in project root
2. ✅ **FIXED**: Django admin login issue (see TEAM_MEMBER_FIX.md)
3. **Should Review**: Port configurations standardization

### Should Review:
1. `backend/lms_backend/lms_backend/settings.py` - Production settings
2. `e-learning-ui/vite.config.ts` - Build configurations
3. All `.env.example` files - Complete variable documentation

## Team Collaboration Setup

### Git Configuration
```bash
# Remove unnecessary files
rm e-learning-ui/bun.lockb  # Using npm, not bun

# Ensure proper .gitignore
echo ".env" >> .gitignore
echo "*.pyc" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
echo "db.sqlite3" >> .gitignore
```

### Recommended Development Workflow
1. Clone repository
2. Follow setup instructions above
3. Fix critical issues mentioned
4. Create feature branches
5. Test both frontend and backend before commits

## Security Considerations
- Change default SECRET_KEY in production
- Use environment-specific .env files
- Don't commit sensitive data
- Use HTTPS in production
- Review CORS settings for production

---

## 🚨 **URGENT: Team Member Admin Login Issue**

If team member ka Django admin login nahi ho raha (most common issue):

**Quick Fix**:
```bash
cd backend/lms_backend
python manage.py shell -c "from myapp.models import User; admin = User.objects.get(username='admin'); admin.is_staff = True; admin.save(); print('Fixed!')"
```

**Detailed Guide**: Check `TEAM_MEMBER_FIX.md` file

**Default Login**: 
- URL: http://localhost:8000/admin/
- Username: `admin`
- Password: `admin123`

---

**Note**: Django admin login issue (`is_staff=False`) is the #1 problem new team members face. Follow the fix above.
