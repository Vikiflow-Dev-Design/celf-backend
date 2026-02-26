const express = require('express');
const router = express.Router();
const socialLinksController = require('../../controllers/socialLinksController');
const { validate } = require('../../middleware/validationMiddleware');
const {
  createSocialLinkSchema,
  updateSocialLinkSchema,
} = require('../../validators/socialLinksValidator');

// Temporarily disable authentication for demo purposes
// TODO: Re-enable authentication when admin accounts are set up
// router.use(authorize(['admin']));

// GET all social links
router.get('/', socialLinksController.getAllSocialLinks);

// GET single social link by ID
router.get('/:id', socialLinksController.getSocialLinkById);

// POST create new social link
router.post('/', validate(createSocialLinkSchema), socialLinksController.createSocialLink);

// PUT update social link
router.put('/:id', validate(updateSocialLinkSchema), socialLinksController.updateSocialLink);

// DELETE social link
router.delete('/:id', socialLinksController.deleteSocialLink);

module.exports = router;