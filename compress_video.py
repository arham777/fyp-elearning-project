#!/usr/bin/env python3
"""
Video Compression Utility for E-Learning Platform
Optimizes videos for Cloudinary upload while maintaining high quality

Requirements:
    pip install ffmpeg-python tqdm

Usage:
    python compress_video.py input.mp4
    python compress_video.py input.mp4 -o output.mp4
    python compress_video.py input.mp4 --target-size 80
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path

def get_video_info(input_path):
    """Get video duration and current size"""
    try:
        # Get video duration
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', 
             '-of', 'default=noprint_wrappers=1:nokey=1', input_path],
            capture_output=True,
            text=True
        )
        duration = float(result.stdout.strip())
        
        # Get file size in MB
        size_mb = os.path.getsize(input_path) / (1024 * 1024)
        
        return duration, size_mb
    except Exception as e:
        print(f"Error getting video info: {e}")
        return None, None

def compress_video(input_path, output_path=None, target_size_mb=80, quality='high'):
    """
    Compress video while maintaining quality
    
    Args:
        input_path: Path to input video file
        output_path: Path for output file (optional)
        target_size_mb: Target file size in MB (default: 80MB for 20MB buffer under Cloudinary limit)
        quality: Quality preset ('high', 'medium', 'low')
    
    Quality Settings:
        - high: CRF 23 (visually lossless, recommended for lectures)
        - medium: CRF 28 (good quality, smaller size)
        - low: CRF 32 (lower quality, much smaller)
    """
    
    # Validate input file
    if not os.path.exists(input_path):
        print(f"Error: File not found: {input_path}")
        return False
    
    # Set output path
    if output_path is None:
        input_file = Path(input_path)
        output_path = str(input_file.parent / f"{input_file.stem}_compressed{input_file.suffix}")
    
    # Get video info
    duration, original_size = get_video_info(input_path)
    if duration is None:
        return False
    
    print(f"\n{'='*60}")
    print(f"Video Compression Utility - High Quality Mode")
    print(f"{'='*60}")
    print(f"Input:           {input_path}")
    print(f"Original Size:   {original_size:.2f} MB")
    print(f"Duration:        {duration:.2f} seconds ({duration/60:.1f} minutes)")
    print(f"Target Size:     {target_size_mb} MB")
    print(f"Quality:         {quality}")
    
    # Check if compression is needed
    if original_size <= target_size_mb:
        print(f"\n✅ File is already under {target_size_mb}MB. No compression needed!")
        return True
    
    # Set quality parameters
    quality_presets = {
        'high': {
            'crf': 23,  # Constant Rate Factor (18-28 is good, lower = better quality)
            'preset': 'slow',  # Encoding speed preset (slower = better compression)
            'description': 'Visually lossless - Perfect for educational content'
        },
        'medium': {
            'crf': 28,
            'preset': 'medium',
            'description': 'Good quality - Balanced compression'
        },
        'low': {
            'crf': 32,
            'preset': 'fast',
            'description': 'Lower quality - Maximum compression'
        }
    }
    
    settings = quality_presets.get(quality, quality_presets['high'])
    print(f"Encoding:        CRF {settings['crf']}, {settings['preset']} preset")
    print(f"                 {settings['description']}")
    
    # Build ffmpeg command with optimal settings
    ffmpeg_cmd = [
        'ffmpeg',
        '-i', input_path,
        '-c:v', 'libx264',                    # H.264 codec (best compatibility)
        '-preset', settings['preset'],         # Encoding speed/compression tradeoff
        '-crf', str(settings['crf']),         # Quality (18-28, lower = better)
        '-c:a', 'aac',                        # Audio codec
        '-b:a', '128k',                       # Audio bitrate (good for lectures)
        '-movflags', '+faststart',            # Enable web streaming
        '-y',                                 # Overwrite output file
        output_path
    ]
    
    print(f"\n{'='*60}")
    print("Compressing... This may take a few minutes.")
    print(f"{'='*60}\n")
    
    try:
        # Run ffmpeg with progress output
        subprocess.run(ffmpeg_cmd, check=True)
        
        # Get compressed size
        compressed_size = os.path.getsize(output_path) / (1024 * 1024)
        reduction = ((original_size - compressed_size) / original_size) * 100
        
        print(f"\n{'='*60}")
        print("✅ Compression Complete!")
        print(f"{'='*60}")
        print(f"Output:          {output_path}")
        print(f"Compressed Size: {compressed_size:.2f} MB")
        print(f"Reduction:       {reduction:.1f}%")
        
        # Check if within Cloudinary limit
        if compressed_size <= 100:
            print(f"✅ File is within Cloudinary free plan limit (100MB)")
        else:
            print(f"⚠️  WARNING: File is {compressed_size:.2f}MB, exceeds 100MB Cloudinary limit")
            print(f"   Consider using 'medium' or 'low' quality setting:")
            print(f"   python compress_video.py {input_path} --quality medium")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error during compression: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

def batch_compress(directory, quality='high', target_size_mb=80):
    """Compress all videos in a directory"""
    video_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm']
    
    directory = Path(directory)
    video_files = []
    
    for ext in video_extensions:
        video_files.extend(directory.glob(f'*{ext}'))
    
    if not video_files:
        print(f"No video files found in {directory}")
        return
    
    print(f"\nFound {len(video_files)} video(s) to compress\n")
    
    for i, video_file in enumerate(video_files, 1):
        print(f"\n[{i}/{len(video_files)}] Processing: {video_file.name}")
        compress_video(str(video_file), quality=quality, target_size_mb=target_size_mb)

def main():
    parser = argparse.ArgumentParser(
        description='Compress videos for Cloudinary upload while maintaining high quality',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Compress single video (high quality)
  python compress_video.py lecture.mp4
  
  # Compress with specific output name
  python compress_video.py lecture.mp4 -o optimized_lecture.mp4
  
  # Compress with medium quality (smaller size)
  python compress_video.py lecture.mp4 --quality medium
  
  # Compress with custom target size
  python compress_video.py lecture.mp4 --target-size 50
  
  # Compress all videos in a folder
  python compress_video.py ./videos --batch
  
Quality Presets:
  high   - CRF 23 (Recommended for lectures, visually lossless)
  medium - CRF 28 (Good quality, smaller size)
  low    - CRF 32 (Lower quality, maximum compression)
        """
    )
    
    parser.add_argument('input', help='Input video file or directory (with --batch)')
    parser.add_argument('-o', '--output', help='Output file path (default: input_compressed.ext)')
    parser.add_argument('-q', '--quality', choices=['high', 'medium', 'low'], 
                       default='high', help='Quality preset (default: high)')
    parser.add_argument('-t', '--target-size', type=int, default=80,
                       help='Target file size in MB (default: 80)')
    parser.add_argument('-b', '--batch', action='store_true',
                       help='Compress all videos in directory')
    
    args = parser.parse_args()
    
    # Check if ffmpeg is installed
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Error: ffmpeg is not installed or not in PATH")
        print("\nInstallation instructions:")
        print("  Windows: Download from https://ffmpeg.org/download.html")
        print("  Mac:     brew install ffmpeg")
        print("  Linux:   sudo apt-get install ffmpeg")
        sys.exit(1)
    
    # Run compression
    if args.batch:
        batch_compress(args.input, quality=args.quality, target_size_mb=args.target_size)
    else:
        success = compress_video(
            args.input, 
            output_path=args.output,
            quality=args.quality,
            target_size_mb=args.target_size
        )
        sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
