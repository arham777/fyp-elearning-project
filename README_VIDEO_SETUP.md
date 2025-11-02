# Video Upload Setup Guide

## 🎥 **Cloudinary Video Integration - Quick Start**

Your e-learning platform now has full Cloudinary video upload support with the following features:

### ✅ **Implemented Features**
1. **File Size Validation** - Prevents uploads >100MB (Cloudinary free limit)
2. **Upload Progress Tracking** - Real-time progress bars during upload
3. **Video File Replacement** - Edit and replace videos in content management
4. **High-Quality Compression** - Tools to optimize videos before upload

---

## 📋 **Before Uploading Videos**

### **Step 1: Compress Your Videos**

To maximize your Cloudinary free plan (100MB per video), compress videos before uploading:

```bash
# Quick compression (High quality - Recommended)
python compress_video.py your_lecture.mp4

# Windows users can also use:
compress_video.bat your_lecture.mp4
```

**Result**: 40-60% size reduction with no visible quality loss!

📖 **Full Guide**: See `VIDEO_COMPRESSION_GUIDE.md` for detailed instructions.

---

## 🚀 **Uploading Videos**

### **For Teachers:**

1. **Navigate to Your Course**
   - Dashboard → Courses → Select Your Course

2. **Go to Module**
   - Click on the module where you want to add content

3. **Add Content**
   - Click "Add Content" button
   - Select "Video" as content type
   - Title your video
   - Click "Choose file"
   - Select your compressed video file
   - Click "Save"

4. **Watch Upload Progress**
   - Progress bar shows upload percentage
   - File size displayed
   - "Uploading to Cloudinary..." message

5. **Done!**
   - Video automatically hosted on Cloudinary
   - Students can watch immediately

### **For Students:**

- Navigate to course modules
- Click "Watch content" on any video
- Custom video player with:
  - Play/Pause controls
  - Progress tracking (95% required for completion)
  - Volume control
  - Fullscreen mode
  - Completion tracking

---

## 📊 **Cloudinary Free Plan Limits**

| Resource | Limit | Your Usage |
|----------|-------|------------|
| Storage | 25 GB | Check dashboard |
| Monthly Bandwidth | 25 GB | Check dashboard |
| Max Video Size | 100 MB | Enforced by system |
| Transformations | 25 credits/month | **Thumbnails disabled** |

**Current Optimizations**:
- ✅ Thumbnails disabled (saves transformation credits)
- ✅ File size validation (prevents >100MB uploads)
- ✅ Compression tools provided

---

## 🎓 **Best Practices**

### **Recording Videos**
1. **Resolution**: Use 1080p or 720p (not 4K)
2. **Frame Rate**: 30 fps (sufficient for lectures)
3. **Duration**: Keep videos under 10 minutes
   - Better for learning
   - Easier to stay under 100MB limit
4. **Format**: MP4 recommended (best compatibility)

### **Before Uploading**
1. **Edit**: Remove unnecessary intro/outro
2. **Compress**: Use provided compression tools
3. **Check Size**: Ensure file is <100MB
4. **Test Playback**: Watch video to verify quality

### **Video Length vs. File Size (After Compression)**

| Resolution | Max Length (100MB) |
|------------|-------------------|
| 1080p | ~10 minutes |
| 720p | ~15 minutes |

💡 **Tip**: Split long lectures into 10-minute segments!

---

## 🔧 **Compression Tools**

### **Method 1: Python Script (Recommended)**
```bash
# Install ffmpeg first (see VIDEO_COMPRESSION_GUIDE.md)

# Compress single video
python compress_video.py lecture.mp4

# Batch compress folder
python compress_video.py ./my_videos --batch

# Medium quality (if still too large)
python compress_video.py lecture.mp4 --quality medium
```

### **Method 2: Windows Batch Script**
```bash
# Simple drag-and-drop or:
compress_video.bat lecture.mp4
```

### **Method 3: Direct FFmpeg**
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart output.mp4
```

📖 **Complete Guide**: `VIDEO_COMPRESSION_GUIDE.md`

---

## 🎯 **Quality Settings**

Our compression uses **CRF 23** by default:
- **Visually lossless** quality
- Perfect for educational content
- 40-60% size reduction
- Text and code remain sharp

**If you need smaller files**:
- Use `--quality medium` (CRF 28)
- Or `--quality low` (CRF 32)

---

## ⚠️ **Troubleshooting**

### **Upload Fails: "File too large"**
**Solution**: File is >100MB
```bash
# Compress with medium quality
python compress_video.py video.mp4 --quality medium
```

### **Upload Progress Stuck**
**Solution**: 
- Check internet connection
- Try uploading smaller file first
- Contact support if persists

### **Video Won't Play**
**Solution**:
- Ensure video is MP4 format
- Check file isn't corrupted
- Try re-uploading

### **Poor Quality After Compression**
**Solution**:
```bash
# Use high quality mode (default)
python compress_video.py video.mp4 --quality high
```

---

## 📂 **Project Structure**

```
FYP-elearning-project/
├── compress_video.py           # Python compression script
├── compress_video.bat          # Windows batch script
├── VIDEO_COMPRESSION_GUIDE.md  # Detailed compression guide
├── CLOUDINARY_FREE_PLAN.md     # Free plan limits & optimization
├── README_VIDEO_SETUP.md       # This file
└── backend/
    └── lms_backend/
        ├── myapp/models.py     # Video model with CloudinaryField
        └── api/views.py        # Upload validation & handling
```

---

## 🌟 **Features in Action**

### **Upload Progress**
```
Uploading to Cloudinary...
████████████████████████████████ 100%
File: lecture_01.mp4 (75.23MB)
```

### **File Validation**
```
❌ File too large
Video size is 125.5MB. Maximum allowed is 100MB for Cloudinary free plan.
```

### **Compression Result**
```
✅ Compression Complete!
Original Size:  145.2 MB
Compressed Size: 68.7 MB
Reduction:      52.7%
Status: ✅ Within Cloudinary limit
```

---

## 📚 **Related Documentation**

1. **VIDEO_COMPRESSION_GUIDE.md** - Complete compression tutorial
2. **CLOUDINARY_FREE_PLAN.md** - Free plan limits and strategies
3. **Backend API Docs** - Video upload endpoints

---

## 🎉 **You're Ready to Upload!**

### **Quick Checklist**
- [ ] FFmpeg installed (for compression)
- [ ] Videos compressed (<100MB)
- [ ] Quality checked (text readable)
- [ ] Ready to upload to platform

**Need help?** Check the detailed guides:
- Compression issues → `VIDEO_COMPRESSION_GUIDE.md`
- Cloudinary limits → `CLOUDINARY_FREE_PLAN.md`

---

**Last Updated**: November 2025
**Platform**: E-Learning Project with Cloudinary Integration
**Video Quality**: CRF 23 (High Quality - Recommended)
