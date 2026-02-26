const axios = require('axios');

class InstagramService {
  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    this.baseUrl = 'https://graph.instagram.com';
    this.userId = process.env.INSTAGRAM_USER_ID;
  }

  /**
   * Get Instagram user information
   */
  async getUserInfo() {
    try {
      const response = await axios.get(`${this.baseUrl}/${this.userId}`, {
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: this.accessToken
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Instagram user info:', error.message);
      throw error;
    }
  }

  /**
   * Get Instagram media posts
   * @param {number} limit - Maximum number of posts to fetch (default: 10)
   */
  async getUserMedia(limit = 10) {
    try {
      const response = await axios.get(`${this.baseUrl}/${this.userId}/media`, {
        params: {
          fields: 'id,media_type,media_url,thumbnail_url,caption,permalink,timestamp,username',
          limit: Math.min(limit, 25), // Instagram API limit is 25
          access_token: this.accessToken
        }
      });

      return this.formatMediaForSocialFeed(response.data.data);
    } catch (error) {
      console.error('Error fetching Instagram media:', error.message);
      throw error;
    }
  }

  /**
   * Get specific Instagram media by ID
   * @param {string} mediaId - Instagram media ID
   */
  async getMediaById(mediaId) {
    try {
      const response = await axios.get(`${this.baseUrl}/${mediaId}`, {
        params: {
          fields: 'id,media_type,media_url,thumbnail_url,caption,permalink,timestamp,username,like_count,comments_count',
          access_token: this.accessToken
        }
      });

      return this.formatMediaForSocialFeed([response.data])[0];
    } catch (error) {
      console.error('Error fetching Instagram media by ID:', error.message);
      throw error;
    }
  }

  /**
   * Format Instagram media for social feed display
   * @param {Array} media - Array of Instagram media objects
   */
  formatMediaForSocialFeed(media) {
    return media.map(item => ({
      id: item.id,
      platform: 'instagram',
      type: item.media_type?.toLowerCase() || 'image',
      title: this.extractTitleFromCaption(item.caption),
      description: item.caption || '',
      thumbnail: {
        default: item.thumbnail_url || item.media_url,
        medium: item.thumbnail_url || item.media_url,
        high: item.media_url,
        standard: item.media_url,
        maxres: item.media_url
      },
      url: item.permalink,
      publishedAt: item.timestamp,
      username: item.username,
      mediaType: item.media_type,
      mediaUrl: item.media_url,
      thumbnailUrl: item.thumbnail_url,
      statistics: {
        likeCount: parseInt(item.like_count || 0),
        commentCount: parseInt(item.comments_count || 0)
      },
      engagement: {
        likes: parseInt(item.like_count || 0),
        comments: parseInt(item.comments_count || 0)
      },
      metadata: {
        mediaId: item.id,
        mediaType: item.media_type,
        isVideo: item.media_type === 'VIDEO',
        isCarousel: item.media_type === 'CAROUSEL_ALBUM'
      }
    }));
  }

  /**
   * Extract title from Instagram caption (first line or first sentence)
   * @param {string} caption - Instagram post caption
   */
  extractTitleFromCaption(caption) {
    if (!caption) return 'Instagram Post';
    
    // Get first line or first sentence (up to 100 characters)
    const firstLine = caption.split('\n')[0];
    const firstSentence = firstLine.split('.')[0];
    const title = firstSentence.length > 100 ? 
      firstSentence.substring(0, 97) + '...' : 
      firstSentence;
    
    return title || 'Instagram Post';
  }

  /**
   * Refresh long-lived access token
   */
  async refreshAccessToken() {
    try {
      const response = await axios.get(`${this.baseUrl}/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: this.accessToken
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error refreshing Instagram access token:', error.message);
      throw error;
    }
  }

  /**
   * Check if Instagram API is properly configured
   */
  isConfigured() {
    return !!(this.accessToken && this.userId);
  }

  /**
   * Test Instagram API connection
   */
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        throw new Error('Instagram API not properly configured');
      }

      const userInfo = await this.getUserInfo();
      return {
        success: true,
        username: userInfo.username,
        accountType: userInfo.account_type,
        mediaCount: userInfo.media_count
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new InstagramService();