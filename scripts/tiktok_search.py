#!/usr/bin/env python3
"""
TikTok Search using David Teather's TikTok-Api
Free alternative to paid TikTok APIs
Requires ms_token from browser cookies
"""

import sys
import json
import asyncio
import os
from TikTokApi import TikTokApi
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def search_tiktok_videos(query, max_results=5):
    """
    Search for TikTok videos using the free TikTok-Api library
    
    Args:
        query (str): Search query
        max_results (int): Maximum number of results to return
        
    Returns:
        dict: Search results with success status and videos list
    """
    try:
        logger.info(f"🔍 Searching TikTok for: '{query}' (max {max_results} results)")
        
        # Get ms_token from environment (optional for trending)
        ms_token = os.environ.get("ms_token", None)
        
        # Initialize TikTok API with context manager
        async with TikTokApi() as api:
            
            # Create sessions if we have ms_token
            if ms_token:
                await api.create_sessions(ms_tokens=[ms_token], num_sessions=1, sleep_after=3)
                logger.info("✅ Created authenticated session")
            else:
                logger.warning("⚠️ No ms_token found, trying without authentication")
            
            videos = []
            
            try:
                # Method 1: Try hashtag search if query looks like a hashtag topic
                hashtag_query = query.replace(" ", "").lower()
                logger.info(f"🏷️ Trying hashtag search: #{hashtag_query}")
                
                hashtag = api.hashtag(name=hashtag_query)
                video_count = 0
                async for video in hashtag.videos(count=max_results):
                    if video_count >= max_results:
                        break
                    
                    try:
                        video_dict = video.as_dict
                        
                        # Extract video data
                        video_data = {
                            "video_id": video.id,
                            "platform": "tiktok",
                            "title": video_dict.get('desc', '') or f"TikTok video about {query}",
                            "description": video_dict.get('desc', '') or "",
                            "url": f"https://www.tiktok.com/@{video.author.username}/video/{video.id}",
                            "thumbnail_url": video_dict.get('video', {}).get('cover', '') or "",
                            "views": video_dict.get('stats', {}).get('playCount', 0) or 0,
                            "likes": video_dict.get('stats', {}).get('diggCount', 0) or 0,
                            "comments": video_dict.get('stats', {}).get('commentCount', 0) or 0,
                            "duration": video_dict.get('video', {}).get('duration', 30) or 30,
                            "published_at": str(video_dict.get('createTime', '')),
                            "author": video.author.username,
                            "hashtags": [tag.get('hashtagName', '') for tag in video_dict.get('textExtra', []) if tag.get('hashtagName')],
                            "music": video_dict.get('music', {}).get('title', '') if video_dict.get('music') else '',
                        }
                        videos.append(video_data)
                        video_count += 1
                        logger.info(f"✅ Found: {video_data['title'][:50]}... ({video_data['views']} views)")
                        
                    except Exception as e:
                        logger.warning(f"⚠️ Error processing video {video.id}: {e}")
                        continue
                        
            except Exception as hashtag_error:
                logger.warning(f"⚠️ Hashtag search failed: {hashtag_error}")
                
                # Method 2: Fallback to trending videos (doesn't require auth)
                logger.info("🔥 Falling back to trending videos...")
                try:
                    video_count = 0
                    async for video in api.trending.videos(count=max_results):
                        if video_count >= max_results:
                            break
                        
                        try:
                            video_dict = video.as_dict
                            
                            # Check if video is relevant to query (simple keyword match)
                            desc = video_dict.get('desc', '').lower()
                            if any(keyword.lower() in desc for keyword in query.split()):
                                video_data = {
                                    "video_id": video.id,
                                    "platform": "tiktok",
                                    "title": video_dict.get('desc', '') or f"Trending TikTok video",
                                    "description": video_dict.get('desc', '') or "",
                                    "url": f"https://www.tiktok.com/@{video.author.username}/video/{video.id}",
                                    "thumbnail_url": video_dict.get('video', {}).get('cover', '') or "",
                                    "views": video_dict.get('stats', {}).get('playCount', 0) or 0,
                                    "likes": video_dict.get('stats', {}).get('diggCount', 0) or 0,
                                    "comments": video_dict.get('stats', {}).get('commentCount', 0) or 0,
                                    "duration": video_dict.get('video', {}).get('duration', 30) or 30,
                                    "published_at": str(video_dict.get('createTime', '')),
                                    "author": video.author.username,
                                    "hashtags": [tag.get('hashtagName', '') for tag in video_dict.get('textExtra', []) if tag.get('hashtagName')],
                                    "music": video_dict.get('music', {}).get('title', '') if video_dict.get('music') else '',
                                }
                                videos.append(video_data)
                                logger.info(f"✅ Found trending: {video_data['title'][:50]}... ({video_data['views']} views)")
                        
                        except Exception as e:
                            logger.warning(f"⚠️ Error processing trending video: {e}")
                            continue
                        
                        video_count += 1
                        
                except Exception as trending_error:
                    logger.error(f"❌ Trending search also failed: {trending_error}")
        
        if videos:
            logger.info(f"🎯 Successfully found {len(videos)} TikTok videos")
            return {
                "success": True,
                "videos": videos,
                "total_found": len(videos),
                "message": f"Найдено {len(videos)} TikTok видео по запросу '{query}'"
            }
        else:
            logger.warning(f"❌ No TikTok videos found for query: '{query}'")
            return {
                "success": False,
                "videos": [],
                "total_found": 0,
                "message": f"По запросу '{query}' TikTok видео не найдены. Попробуйте: 1) Добавить переменную ms_token из браузера, 2) Использовать более популярные ключевые слова."
            }
            
    except Exception as e:
        logger.error(f"❌ TikTok search error: {e}")
        return {
            "success": False,
            "videos": [],
            "total_found": 0,
            "message": f"Ошибка поиска TikTok: {str(e)}. Совет: получите ms_token из браузера для лучших результатов."
        }

async def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        print("Usage: python tiktok_search.py <query> [max_results]")
        print("Note: Set ms_token environment variable for better results")
        print("Get ms_token: Go to tiktok.com -> F12 -> Application -> Cookies -> Copy msToken value")
        sys.exit(1)
    
    query = sys.argv[1]
    max_results = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    
    result = await search_tiktok_videos(query, max_results)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    asyncio.run(main())