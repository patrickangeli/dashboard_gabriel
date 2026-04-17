import app from '../app.mjs';

export default async (req, res) => {
  try {
    await app(req, res);
  } catch (err) {
    res.status(500).json({ 
      error: 'Vercel Function App Runtime Error', 
      message: err.message, 
      stack: err.stack 
    });
  }
};
