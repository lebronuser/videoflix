const express = require('express');
const Vote = require('../models/Vote');
const Video = require('../models/Video');
const Comment = require('../models/Comment');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Vote on video/comment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { targetId, targetType, voteType } = req.body;

    if (!targetId || !targetType || !voteType) {
      return res.status(400).json({ message: 'All fields required' });
    }

    // Find existing vote
    let existingVote = await Vote.findOne({
      user: req.userId,
      target: targetId,
      targetType,
    });

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Remove vote if same type
        await Vote.findByIdAndDelete(existingVote._id);

        // Update counts
        if (targetType === 'video') {
          await Video.findByIdAndUpdate(
            targetId,
            { $inc: { [voteType === 'upvote' ? 'likes' : 'dislikes']: -1 } }
          );
        } else {
          await Comment.findByIdAndUpdate(
            targetId,
            { $inc: { [voteType === 'upvote' ? 'likes' : 'dislikes']: -1 } }
          );
        }

        return res.json({ message: 'Vote removed' });
      } else {
        // Change vote type
        const oldType = existingVote.voteType;
        existingVote.voteType = voteType;
        await existingVote.save();

        // Update counts
        if (targetType === 'video') {
          await Video.findByIdAndUpdate(
            targetId,
            {
              $inc: {
                [oldType === 'upvote' ? 'likes' : 'dislikes']: -1,
                [voteType === 'upvote' ? 'likes' : 'dislikes']: 1,
              },
            }
          );
        } else {
          await Comment.findByIdAndUpdate(
            targetId,
            {
              $inc: {
                [oldType === 'upvote' ? 'likes' : 'dislikes']: -1,
                [voteType === 'upvote' ? 'likes' : 'dislikes']: 1,
              },
            }
          );
        }

        return res.json({ message: 'Vote updated' });
      }
    }

    // Create new vote
    const vote = new Vote({
      user: req.userId,
      target: targetId,
      targetType,
      voteType,
    });

    await vote.save();

    // Update counts
    if (targetType === 'video') {
      await Video.findByIdAndUpdate(
        targetId,
        { $inc: { [voteType === 'upvote' ? 'likes' : 'dislikes']: 1 } }
      );
    } else {
      await Comment.findByIdAndUpdate(
        targetId,
        { $inc: { [voteType === 'upvote' ? 'likes' : 'dislikes']: 1 } }
      );
    }

    res.status(201).json(vote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's vote on a target
router.get('/:targetId/:targetType', authMiddleware, async (req, res) => {
  try {
    const vote = await Vote.findOne({
      user: req.userId,
      target: req.params.targetId,
      targetType: req.params.targetType,
    });

    res.json(vote || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
