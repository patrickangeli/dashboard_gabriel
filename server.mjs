import app from './app.mjs';

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Express (Modo Local) escutando na porta ${PORT}`);
});
