require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiZW1haWwiOiJyb2xhbmQuYWxhdmVyYUBiYXJiaXpvbmZhc2hpb24uY29tIiwiaWF0IjoxNzY3ODM5NDc1LCJleHAiOjE3Njc4NjgyNzV9.7qCOd7A46iWL5l8Ru2a8rnYBzOte89wTsD9xycuYMFQ';

try {
  const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
  console.log('Token valid, payload:', payload);
} catch (err) {
  console.error('Token verification failed:', err.message);
}
