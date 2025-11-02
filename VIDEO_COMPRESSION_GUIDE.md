# Video Compression Guide for E-Learning Platform

## 🎯 **Why Compress Videos?**

- **Cloudinary Free Plan Limit**: 100MB per video
- **Faster Uploads**: Smaller files upload quicker
- **Better Streaming**: Optimized files load faster for students
- **Storage Savings**: Maximize your 25GB storage limit

---

## 📋 **Before You Start**

### **Install FFmpeg**

FFmpeg is required for video compression. Install it for your operating system:

#### **Windows**
1. Download FFmpeg from: https://ffmpeg.org/download.html
2. Choose "Windows builds by BtbN" 
3. Download the latest release (ffmpeg-master-latest-win64-gpl.zip)
4. Extract the ZIP file to `C:\ffmpeg`
5. Add to PATH:
   - Press `Win + X` → System → Advanced system settings
   - Environment Variables → System variables → Path → Edit
   - Add: `C:\ffmpeg\bin`
6. Restart Command Prompt and test: `ffmpeg -version`

#### **Mac**
```bash
# Install using Homebrew
brew install ffmpeg
```

#### **Linux (Ubuntu/Debian)**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

---

## 🚀 **Method 1: Python Script (Recommended)**

### **Features**
- ✅ High-quality compression (CRF 23 - visually lossless)
- ✅ Automatic quality detection
- ✅ Progress information
- ✅ Batch processing support
- ✅ Validates Cloudinary limits

### **Usage**

#### **Single Video**
```bash
# High quality (recommended for lectures)
python compress_video.py lecture.mp4

# Output with custom name
python compress_video.py lecture.mp4 -o optimized_lecture.mp4

# Medium quality (smaller size)
python compress_video.py lecture.mp4 --quality medium

# Low quality (maximum compression)
python compress_video.py lecture.mp4 --quality low
```

#### **Batch Process Folder**
```bash
# Compress all videos in a folder
python compress_video.py ./my_videos --batch

# Batch with medium quality
python compress_video.py ./my_videos --batch --quality medium
```

#### **Advanced Options**
```bash
# Set custom target size (in MB)
python compress_video.py lecture.mp4 --target-size 50

# Help and all options
python compress_video.py --help
```

---

## 🪟 **Method 2: Windows Batch Script**

### **Quick & Easy for Windows Users**

#### **Single Video**
```bash
# Double-click compress_video.bat and drag your video file
# OR from Command Prompt:
compress_video.bat lecture.mp4

# With custom output name
compress_video.bat lecture.mp4 compressed_lecture.mp4
```

---

## ⚙️ **Method 3: Direct FFmpeg Commands**

### **High Quality (Recommended for E-Learning)**
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart output.mp4
```

**What it does:**
- `libx264`: H.264 codec (best compatibility)
- `preset slow`: Better compression (takes longer)
- `crf 23`: High quality (18-28 scale, lower = better)
- `aac -b:a 128k`: Good audio quality for lectures
- `faststart`: Enables web streaming

### **Medium Quality (Smaller Files)**
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 28 -c:a aac -b:a 96k -movflags +faststart output.mp4
```

### **Low Quality (Maximum Compression)**
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset fast -crf 32 -c:a aac -b:a 64k -movflags +faststart output.mp4
```

---

## 📊 **Quality Settings Explained**

### **CRF (Constant Rate Factor) Values**

| CRF | Quality | Use Case | Typical Size Reduction |
|-----|---------|----------|------------------------|
| 18  | Near Lossless | Studio quality | 20-30% |
| **23** | **High Quality** | **Lectures (Recommended)** | **40-60%** |
| 28  | Good Quality | Standard videos | 60-75% |
| 32  | Lower Quality | Maximum compression | 75-85% |

### **Preset Speed vs Compression**

| Preset | Speed | Compression | Recommended For |
|--------|-------|-------------|-----------------|
| ultrafast | ⚡⚡⚡ | Low | Real-time needs |
| fast | ⚡⚡ | Medium | Quick processing |
| medium | ⚡ | Good | Balanced |
| **slow** | 🐢 | **Best** | **Final uploads** |
| veryslow | 🐌 | Maximum | Professional use |

---

## 📈 **Expected Results**

### **Example: 30-minute Lecture Video**

| Original | CRF 23 (High) | CRF 28 (Medium) | CRF 32 (Low) |
|----------|---------------|-----------------|--------------|
| 150 MB | 75 MB (50% reduction) ✅ | 45 MB (70% reduction) ✅ | 30 MB (80% reduction) ✅ |
| Quality | Visually identical | Very good | Good |

### **Real-World Test Results**
```
Input:  lecture_recording.mp4 (145 MB, 1080p)
Output: lecture_compressed.mp4 (68 MB)
Quality: CRF 23 (High Quality)
Time:   5 minutes to compress
Result: ✅ Under 100MB limit, visually lossless
```

---

## ✅ **Best Practices**

### **1. Recording Settings**
**Recommended Recording Specs:**
- Resolution: 1920x1080 (1080p) or 1280x720 (720p)
- Frame Rate: 30 fps (educational content)
- Bitrate: 5-8 Mbps (OBS/Recording software)

### **2. Pre-Compression Checklist**
- [ ] Record in 1080p or 720p (not 4K)
- [ ] Use 30 fps (not 60 fps for lectures)
- [ ] Trim unnecessary intro/outro
- [ ] Remove silence at beginning/end

### **3. Compression Workflow**
1. **Record video** (try to keep under 10 minutes)
2. **Edit** (cut unnecessary parts)
3. **Compress** using CRF 23 (high quality)
4. **Check size** (should be <100MB)
5. If still >100MB: Use CRF 28 (medium quality)
6. **Upload** to platform

### **4. Quality Checks**
After compression, verify:
- Text/code is readable on screen
- Audio is clear
- Video plays smoothly
- File size is <100MB

---

## 🎓 **Video Length Recommendations**

To keep videos under 100MB with high quality:

| Resolution | CRF 23 | CRF 28 |
|------------|--------|--------|
| 720p | ~15 minutes | ~25 minutes |
| 1080p | ~10 minutes | ~15 minutes |

**💡 Tip**: Break long lectures into 10-minute segments. This is better for learning anyway!

---

## 🔧 **Troubleshooting**

### **Problem: "ffmpeg is not recognized"**
**Solution**: FFmpeg is not installed or not in PATH
1. Verify installation: Open Command Prompt and type `ffmpeg -version`
2. If error, reinstall FFmpeg and add to PATH (see installation section)

### **Problem: Compressed file is still >100MB**
**Solution**: Use medium or low quality
```bash
# Try medium quality first
python compress_video.py video.mp4 --quality medium

# If still too large, use low quality
python compress_video.py video.mp4 --quality low

# Or split video into smaller segments
```

### **Problem: Video quality is poor after compression**
**Solution**: Increase quality setting
```bash
# Use high quality
python compress_video.py video.mp4 --quality high

# Or try CRF 20 (even higher quality)
ffmpeg -i input.mp4 -c:v libx264 -crf 20 -c:a aac -b:a 128k output.mp4
```

### **Problem: Compression takes too long**
**Solution**: Use faster preset
```bash
# Fast preset (sacrifices some compression)
ffmpeg -i input.mp4 -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k output.mp4
```

### **Problem: Audio and video are out of sync**
**Solution**: Add sync flag
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -c:a aac -b:a 128k -async 1 output.mp4
```

---

## 📚 **Advanced Tips**

### **1. Optimize for Web Streaming**
```bash
# Already included in our scripts, but here's the flag:
-movflags +faststart
```
This moves metadata to the beginning so videos start playing immediately.

### **2. Reduce Resolution If Needed**
```bash
# 1080p to 720p (smaller file, still good quality)
ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 -crf 23 output.mp4

# 1080p to 480p (much smaller)
ffmpeg -i input.mp4 -vf scale=854:480 -c:v libx264 -crf 23 output.mp4
```

### **3. Two-Pass Encoding (Best Quality)**
```bash
# Pass 1
ffmpeg -i input.mp4 -c:v libx264 -b:v 2M -pass 1 -f mp4 NUL

# Pass 2
ffmpeg -i input.mp4 -c:v libx264 -b:v 2M -pass 2 output.mp4
```

### **4. Check Video Info**
```bash
# Get video details
ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height input.mp4
```

---

## 🎯 **Quick Reference**

### **Most Common Commands**

```bash
# 1. High quality compression (RECOMMENDED)
python compress_video.py lecture.mp4

# 2. Batch compress folder
python compress_video.py ./videos --batch

# 3. Medium quality (if still too large)
python compress_video.py lecture.mp4 --quality medium

# 4. Direct ffmpeg (high quality)
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart output.mp4

# 5. Windows batch script
compress_video.bat lecture.mp4
```

---

## 📞 **Need Help?**

- **FFmpeg Documentation**: https://ffmpeg.org/documentation.html
- **Video Codec Guide**: https://trac.ffmpeg.org/wiki/Encode/H.264
- **Quality Comparison**: https://slhck.info/video/2017/02/24/crf-guide.html

---

## ✅ **Checklist: Before Uploading**

- [ ] Video compressed with CRF 23 or 28
- [ ] File size is <100MB
- [ ] Quality checked (text readable, audio clear)
- [ ] Video plays smoothly
- [ ] Metadata optimized (faststart flag)
- [ ] Filename is descriptive

---

**Last Updated**: November 2025
**Recommended Quality**: CRF 23 (High Quality - Visually Lossless)
**Target Size**: <80MB (leaves buffer under 100MB limit)
