const express = require('express');
const { Message, Conversation } = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/threads — all conversations for the logged-in user
router.get('/threads', requireAuth, async (req, res) => {
  const threads = await Conversation.find({ participants: req.user.id })
    .populate('participants', 'name role')
    .sort({ lastMessageAt: -1 });
  res.json(threads);
});

// POST /api/messages/threads — start (or reuse) a conversation with another user
router.post('/threads', requireAuth, async (req, res) => {
  const { recipientId } = req.body;
  let convo = await Conversation.findOne({
    participants: { $all: [req.user.id, recipientId], $size: 2 }
  });
  if (!convo) {
    convo = await Conversation.create({ participants: [req.user.id, recipientId] });
  }
  res.status(201).json(convo);
});

// GET /api/messages/threads/:conversationId — messages in a thread
router.get('/threads/:conversationId', requireAuth, async (req, res) => {
  const messages = await Message.find({ conversation: req.params.conversationId }).sort({ createdAt: 1 });
  // Mark messages sent to me as read
  await Message.updateMany(
    { conversation: req.params.conversationId, sender: { $ne: req.user.id } },
    { read: true }
  );
  res.json(messages);
});

// POST /api/messages/threads/:conversationId — send a message
router.post('/threads/:conversationId', requireAuth, async (req, res) => {
  const { text, attachments } = req.body;
  const message = await Message.create({
    conversation: req.params.conversationId,
    sender: req.user.id,
    text,
    attachments
  });

  const convo = await Conversation.findByIdAndUpdate(req.params.conversationId, {
    lastMessage: text,
    lastMessageAt: new Date()
  });

  const recipientId = convo.participants.find((p) => String(p) !== req.user.id);
  if (recipientId) {
    await Notification.create({
      user: recipientId,
      type: 'message',
      text: `New message: "${text?.slice(0, 60) || 'Attachment'}"`
    });
  }

  res.status(201).json(message);
});

module.exports = router;
