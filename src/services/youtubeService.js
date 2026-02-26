const axios = require('axios');

class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    this.channelId = process.env.YOUTUBE_CHANNEL_ID;
    this.channelHandle = process.env.YOUTUBE_CHANNEL_HANDLE; // Alternative to channel ID
  }

  /**
   * Get channel information by channel ID or handle
   */
  async getChannelInfo() {
    try {
      let url = `${this.baseUrl}/channels`;
      let params = {
        key: this.apiKey,
        part: 'snippet,statistics,contentDetails'
      };

      // Use channel ID if available, otherwise use handle
      if (this.channelId) {
        params.id = this.channelId;
      } else if (this.channelHandle) {
        params.forHandle = this.channelHandle;
      } else {
        throw new Error('YouTube channel ID or handle not configured');
      }

      const response = await axios.get(url, { params });
      
      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0];
      } else {
        throw new Error('Channel not found');
      }
    } catch (error) {
      console.error('Error fetching channel info:', error.message);
      throw error;
    }
  }

  /**
   * Get latest videos from the channel
   * @param {number} maxResults - Maximum number of videos to fetch (default: 10)
   * @param {string} order - Order of results (date, relevance, rating, title, viewCount)
   */
  async getChannelVideos(maxResults = 10, order = 'date') {
    try {
      // First get channel info to get the uploads playlist ID
      const channelInfo = await this.getChannelInfo();
      const uploadsPlaylistId = channelInfo.contentDetails.relatedPlaylists.uploads;

      // Get videos from uploads playlist
      const playlistResponse = await axios.get(`${this.baseUrl}/playlistItems`, {
        params: {
          key: this.apiKey,
          part: 'snippet,contentDetails',
          playlistId: uploadsPlaylistId,
          maxResults: maxResults,
          order: order
        }
      });

      const videoIds = playlistResponse.data.items.map(item => item.contentDetails.videoId);
      
      // Get detailed video information
      const videosResponse = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          part: 'snippet,statistics,contentDetails',
          id: videoIds.join(',')
        }
      });

      return this.formatVideosForSocialFeed(videosResponse.data.items);
    } catch (error) {
      console.error('Error fetching channel videos:', error.message);
      throw error;
    }
  }

  /**
   * Search for videos on the channel
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results
   */
  async searchChannelVideos(query, maxResults = 10) {
    try {
      const channelInfo = await this.getChannelInfo();
      
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          key: this.apiKey,
          part: 'snippet',
          channelId: channelInfo.id,
          q: query,
          type: 'video',
          maxResults: maxResults,
          order: 'relevance'
        }
      });

      const videoIds = response.data.items.map(item => item.id.videoId);
      
      // Get detailed video information
      const videosResponse = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          part: 'snippet,statistics,contentDetails',
          id: videoIds.join(',')
        }
      });

      return this.formatVideosForSocialFeed(videosResponse.data.items);
    } catch (error) {
      console.error('Error searching channel videos:', error.message);
      throw error;
    }
  }

  /**
   * Format YouTube videos for social feed display
   * @param {Array} videos - Array of YouTube video objects
   */
  formatVideosForSocialFeed(videos) {
    return videos.map(video => ({
      id: video.id,
      platform: 'youtube',
      type: 'video',
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: {
        default: video.snippet.thumbnails.default?.url,
        medium: video.snippet.thumbnails.medium?.url,
        high: video.snippet.thumbnails.high?.url,
        standard: video.snippet.thumbnails.standard?.url,
        maxres: video.snippet.thumbnails.maxres?.url
      },
      url: `https://www.youtube.com/watch?v=${video.id}`,
      publishedAt: video.snippet.publishedAt,
      channelTitle: video.snippet.channelTitle,
      tags: video.snippet.tags || [],
      duration: video.contentDetails?.duration,
      statistics: {
        viewCount: parseInt(video.statistics?.viewCount || 0),
        likeCount: parseInt(video.statistics?.likeCount || 0),
        commentCount: parseInt(video.statistics?.commentCount || 0)
      },
      engagement: {
        views: parseInt(video.statistics?.viewCount || 0),
        likes: parseInt(video.statistics?.likeCount || 0),
        comments: parseInt(video.statistics?.commentCount || 0)
      },
      metadata: {
        videoId: video.id,
        channelId: video.snippet.channelId,
        categoryId: video.snippet.categoryId,
        defaultLanguage: video.snippet.defaultLanguage,
        defaultAudioLanguage: video.snippet.defaultAudioLanguage
      }
    }));
  }

  /**
   * Get video by ID
   * @param {string} videoId - YouTube video ID
   */
  async getVideoById(videoId) {
    try {
      const response = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          part: 'snippet,statistics,contentDetails',
          id: videoId
        }
      });

      if (response.data.items && response.data.items.length > 0) {
        return this.formatVideosForSocialFeed(response.data.items)[0];
      } else {
        throw new Error('Video not found');
      }
    } catch (error) {
      console.error('Error fetching video by ID:', error.message);
      throw error;
    }
  }

  /**
   * Check if YouTube API is properly configured
   */
  isConfigured() {
    return !!(this.apiKey && (this.channelId || this.channelHandle));
  }

  /**
   * Search for videos using YouTube Search API (channel-specific search)
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of videos to fetch (default: 10)
   */
  async searchVideos(query, maxResults = 10) {
    try {
      if (!this.isConfigured()) {
        throw new Error('YouTube API not properly configured');
      }

      // Get channel info to ensure we search within the specific channel
      const channelInfo = await this.getChannelInfo();

      // Search for videos within the specific channel only
      const searchUrl = `${this.baseUrl}/search`;
      const searchParams = {
        key: this.apiKey,
        part: 'snippet',
        channelId: channelInfo.id, // Restrict search to specific channel
        type: 'video',
        q: query,
        maxResults: maxResults,
        order: 'relevance'
      };

      const searchResponse = await axios.get(searchUrl, { params: searchParams });
      
      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        return [];
      }

      // Extract video IDs
      const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');

      // Get detailed video information
      const videosUrl = `${this.baseUrl}/videos`;
      const videosParams = {
        key: this.apiKey,
        part: 'snippet,statistics,contentDetails',
        id: videoIds
      };

      const videosResponse = await axios.get(videosUrl, { params: videosParams });

      // Transform the data to match our expected format
      return videosResponse.data.items.map(video => ({
        id: video.id,
        platform: 'youtube',
        type: 'video',
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: {
          default: video.snippet.thumbnails.default?.url || '',
          medium: video.snippet.thumbnails.medium?.url || '',
          high: video.snippet.thumbnails.high?.url || '',
          standard: video.snippet.thumbnails.standard?.url || '',
          maxres: video.snippet.thumbnails.maxres?.url || ''
        },
        url: `https://www.youtube.com/watch?v=${video.id}`,
        publishedAt: video.snippet.publishedAt,
        channelTitle: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        duration: video.contentDetails.duration,
        tags: video.snippet.tags || [],
        engagement: {
          likes: parseInt(video.statistics.likeCount) || 0,
          comments: parseInt(video.statistics.commentCount) || 0,
          views: parseInt(video.statistics.viewCount) || 0
        },
        statistics: {
          viewCount: video.statistics.viewCount,
          likeCount: video.statistics.likeCount,
          commentCount: video.statistics.commentCount
        },
        metadata: {
          videoId: video.id,
          channelId: video.snippet.channelId,
          categoryId: video.snippet.categoryId,
          defaultLanguage: video.snippet.defaultLanguage,
          defaultAudioLanguage: video.snippet.defaultAudioLanguage
        }
      }));
    } catch (error) {
      console.error('Error searching YouTube videos:', error.message);
      throw error;
    }
  }

  /**
   * Test YouTube API connection
   */
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        throw new Error('YouTube API not properly configured');
      }

      const channelInfo = await this.getChannelInfo();
      return {
        success: true,
        channelTitle: channelInfo.snippet.title,
        subscriberCount: channelInfo.statistics.subscriberCount,
        videoCount: channelInfo.statistics.videoCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new YouTubeService();