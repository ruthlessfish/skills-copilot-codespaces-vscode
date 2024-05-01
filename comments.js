// create a web server that listens for incoming requests
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

// GET request to fetch all comments for a specific post
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// POST request to create a new comment for a specific post
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;

  // Fetch all comments for a specific post
  const comments = commentsByPostId[req.params.id] || [];

  // Add the new comment to the array of comments
  comments.push({ id: commentId, content, status: 'pending' });

  // Store the updated array of comments in the object
  commentsByPostId[req.params.id] = comments;

  // Emit an event to the event bus
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending'
    }
  });

  // Send back the updated list of comments
  res.status(201).send(comments);
});

// POST request to receive events from the event bus
app.post('/events', async (req, res) => {
  console.log('Received Event:', req.body.type);

  const { type, data } = req.body;

  if (type === 'CommentModerated') {
    const { postId, id, status } = data;

    // Fetch all comments for a specific post
    const comments = commentsByPostId[postId];

    // Find the comment that needs to be updated
    const comment = comments.find(comment => {
      return comment.id === id;
    });

    // Update the status of the comment
    comment.status = status;

    // Emit an event to the event bus
    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        status,
        postId