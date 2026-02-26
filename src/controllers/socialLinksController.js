const SocialLink = require('../models/SocialLink');

/**
 * Get all social links
 * @route GET /api/admin/social-links
 * @access Admin
 */
const getAllSocialLinks = async (req, res) => {
  try {
    const socialLinks = await SocialLink.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: socialLinks
    });
  } catch (error) {
    console.error('Error fetching social links:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching social links'
    });
  }
};

/**
 * Get a single social link by ID
 * @route GET /api/admin/social-links/:id
 * @access Admin
 */
const getSocialLinkById = async (req, res) => {
  try {
    const socialLink = await SocialLink.findById(req.params.id);

    if (!socialLink) {
      return res.status(404).json({
        success: false,
        message: 'Social link not found'
      });
    }

    res.json({
      success: true,
      data: socialLink
    });
  } catch (error) {
    console.error('Error fetching social link:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching social link'
    });
  }
};

/**
 * Create a new social link
 * @route POST /api/admin/social-links
 * @access Admin
 */
const createSocialLink = async (req, res) => {
  try {
    const { platform, url, icon, color, displayName, isActive, sortOrder } = req.body;

    const newSocialLink = new SocialLink({
      platform,
      url,
      icon,
      color,
      displayName,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder !== undefined ? sortOrder : 0
    });

    const savedSocialLink = await newSocialLink.save();

    res.status(201).json({
      success: true,
      data: savedSocialLink,
      message: 'Social link created successfully'
    });
  } catch (error) {
    console.error('Error creating social link:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating social link'
    });
  }
};

/**
 * Update a social link
 * @route PUT /api/admin/social-links/:id
 * @access Admin
 */
const updateSocialLink = async (req, res) => {
  try {
    const { platform, url, icon, color, displayName, isActive, sortOrder } = req.body;

    const socialLink = await SocialLink.findById(req.params.id);

    if (!socialLink) {
      return res.status(404).json({
        success: false,
        message: 'Social link not found'
      });
    }

    // Update fields if provided
    if (platform !== undefined) socialLink.platform = platform;
    if (url !== undefined) socialLink.url = url;
    if (icon !== undefined) socialLink.icon = icon;
    if (color !== undefined) socialLink.color = color;
    if (displayName !== undefined) socialLink.displayName = displayName;
    if (isActive !== undefined) socialLink.isActive = isActive;
    if (sortOrder !== undefined) socialLink.sortOrder = sortOrder;

    const updatedSocialLink = await socialLink.save();

    res.json({
      success: true,
      data: updatedSocialLink,
      message: 'Social link updated successfully'
    });
  } catch (error) {
    console.error('Error updating social link:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating social link'
    });
  }
};

/**
 * Delete a social link
 * @route DELETE /api/admin/social-links/:id
 * @access Admin
 */
const deleteSocialLink = async (req, res) => {
  try {
    const socialLink = await SocialLink.findById(req.params.id);

    if (!socialLink) {
      return res.status(404).json({
        success: false,
        message: 'Social link not found'
      });
    }

    await socialLink.deleteOne();

    res.json({
      success: true,
      message: 'Social link deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting social link:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting social link'
    });
  }
};

module.exports = {
  getAllSocialLinks,
  getSocialLinkById,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink
};