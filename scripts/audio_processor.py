#!/usr/bin/env python3
"""
Audio Processing: Extract audio from video and transcribe using OpenAI Whisper
Cost-effective solution: $0.006/minute
"""

import sys
import json
import os
import subprocess
import tempfile
import logging
from pathlib import Path
from openai import OpenAI
import yt_dlp
import re

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AudioProcessor:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
    def is_youtube_url(self, url):
        """Check if URL is a YouTube URL"""
        youtube_pattern = r'(https?://)?(www\.)?(youtube\.com/(watch\?v=|embed/|v/)|youtu\.be/)'
        return bool(re.search(youtube_pattern, url))
        
    def download_youtube_audio(self, youtube_url, output_path=None):
        """
        Download audio from YouTube using yt-dlp
        
        Args:
            youtube_url (str): YouTube URL
            output_path (str): Optional output path for audio file
            
        Returns:
            str: Path to downloaded audio file
        """
        try:
            if output_path is None:
                # Create temporary file for audio
                temp_audio = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
                output_path = temp_audio.name
                temp_audio.close()
            
            logger.info(f"🎵 Downloading audio from YouTube: {youtube_url}")
            
            # yt-dlp options for extracting audio
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_path.replace('.mp3', '.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'quiet': True,
                'no_warnings': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([youtube_url])
            
            logger.info(f"✅ YouTube audio downloaded to: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ YouTube download error: {e}")
            raise Exception(f"YouTube download failed: {e}")
        
    def extract_audio_from_video(self, video_url, output_path=None):
        """
        Extract audio from video using appropriate method
        - YouTube URLs: yt-dlp
        - Direct video files: FFmpeg
        
        Args:
            video_url (str): URL or path to video file
            output_path (str): Optional output path for audio file
            
        Returns:
            str: Path to extracted audio file
        """
        try:
            # Check if it's a YouTube URL
            if self.is_youtube_url(video_url):
                return self.download_youtube_audio(video_url, output_path)
            
            # For direct video files, use FFmpeg
            if output_path is None:
                # Create temporary file for audio
                temp_audio = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
                output_path = temp_audio.name
                temp_audio.close()
            
            logger.info(f"🎵 Extracting audio from: {video_url}")
            
            # FFmpeg command to extract audio
            cmd = [
                'ffmpeg', '-i', video_url,
                '-q:a', '2',  # High quality
                '-map', 'a',  # Audio stream only
                '-y',  # Overwrite output
                output_path
            ]
            
            # Run FFmpeg
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                logger.error(f"❌ FFmpeg error: {result.stderr}")
                raise Exception(f"FFmpeg failed: {result.stderr}")
            
            logger.info(f"✅ Audio extracted to: {output_path}")
            return output_path
            
        except subprocess.TimeoutExpired:
            logger.error("❌ Audio extraction timeout - video too long or slow network")
            raise Exception("Audio extraction timeout")
        except Exception as e:
            logger.error(f"❌ Audio extraction error: {e}")
            raise

    def transcribe_audio(self, audio_path):
        """
        Transcribe audio using OpenAI Whisper API
        
        Args:
            audio_path (str): Path to audio file
            
        Returns:
            dict: Transcription result with text and language
        """
        try:
            logger.info(f"🎤 Transcribing audio: {audio_path}")
            
            # Check file size (Whisper has 25MB limit)
            file_size = os.path.getsize(audio_path)
            if file_size > 25 * 1024 * 1024:  # 25MB
                logger.warning(f"⚠️ File too large: {file_size/1024/1024:.1f}MB (max 25MB)")
                return {
                    "success": False,
                    "transcript": "",
                    "language": "en",
                    "message": f"Файл слишком большой: {file_size/1024/1024:.1f}MB (максимум 25MB)"
                }
            
            # Transcribe with Whisper
            with open(audio_path, "rb") as audio_file:
                # the newest OpenAI model is "gpt-5" which was released August 7, 2025.
                # do not change this unless explicitly requested by the user
                # But for transcription we still use whisper-1
                transcript = self.openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json"  # Get language info too
                )
            
            logger.info(f"✅ Transcription completed: {len(transcript.text)} characters")
            
            return {
                "success": True,
                "transcript": transcript.text,
                "language": transcript.language,
                "duration": getattr(transcript, 'duration', None),
                "message": f"Транскрипция выполнена успешно ({transcript.language})"
            }
            
        except Exception as e:
            logger.error(f"❌ Transcription error: {e}")
            return {
                "success": False,
                "transcript": "",
                "language": "en",
                "message": f"Ошибка транскрипции: {str(e)}"
            }

    def process_video(self, video_url, cleanup=True):
        """
        Full pipeline: extract audio + transcribe
        
        Args:
            video_url (str): URL to video
            cleanup (bool): Remove temporary files
            
        Returns:
            dict: Complete processing result
        """
        audio_path = None
        try:
            logger.info(f"🚀 Starting video processing: {video_url}")
            
            # Step 1: Extract audio
            audio_path = self.extract_audio_from_video(video_url)
            
            # Step 2: Transcribe
            transcription_result = self.transcribe_audio(audio_path)
            
            # Calculate cost estimate
            if transcription_result.get("duration"):
                cost = transcription_result["duration"] / 60 * 0.006  # $0.006 per minute
                logger.info(f"💰 Estimated cost: ${cost:.4f}")
                transcription_result["estimated_cost"] = cost
            
            return transcription_result
            
        except Exception as e:
            logger.error(f"❌ Video processing error: {e}")
            return {
                "success": False,
                "transcript": "",
                "language": "en",
                "message": f"Ошибка обработки видео: {str(e)}"
            }
        finally:
            # Cleanup temporary files
            if cleanup and audio_path and os.path.exists(audio_path):
                try:
                    os.unlink(audio_path)
                    logger.info(f"🗑️ Cleaned up: {audio_path}")
                except Exception as e:
                    logger.warning(f"⚠️ Cleanup warning: {e}")

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        print("Usage: python audio_processor.py <video_url>")
        sys.exit(1)
    
    video_url = sys.argv[1]
    processor = AudioProcessor()
    result = processor.process_video(video_url)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()