export default async (req, res) => {
  try {
    const { default: app } = await import('../app.mjs');
    await app(req, res);
  } catch (err) {
    res.status(500).json({ 
      error: 'Vercel Import Error', 
      message: err.message, 
      stack: err.stack 
    });
  }
};
