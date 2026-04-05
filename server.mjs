import app from './app.mjs';

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API Express (Modo Local) escutando na porta ${PORT}`);
});
