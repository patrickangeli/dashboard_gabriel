#!/bin/bash

echo "🚀 Iniciando o ambiente do Dashboard..."

# 1. Sobe o banco de dados via Docker em background
echo "📦 Subindo o banco de dados (PostgreSQL) com Docker..."
docker-compose up -d

# Aguarda alguns segundos para o banco iniciar completamente
echo "⏳ Aguardando o banco iniciar..."
sleep 3

# 2. Torna as portas públicas (se estiver rodando no GitHub Codespaces)
if [ -n "$CODESPACE_NAME" ]; then
  echo "🌐 Configurando portas como públicas no Codespaces..."
  gh codespace ports visibility 5173:public -c $CODESPACE_NAME 2>/dev/null
  gh codespace ports visibility 5174:public -c $CODESPACE_NAME 2>/dev/null
  gh codespace ports visibility 3001:public -c $CODESPACE_NAME 2>/dev/null
  gh codespace ports visibility 5555:public -c $CODESPACE_NAME 2>/dev/null
fi

# 3. Inicia o Prisma Studio em background
echo "🗄️  Iniciando Prisma Studio na porta 5555..."
npx prisma studio > prisma_studio.log 2>&1 &
PRISMA_PID=$!

# 4. Inicia a API (Backend) e o Frontend (Vite)
echo "💻 Iniciando Frontend (React) e Backend (Express)..."
echo "👉 Pressione Ctrl+C para encerrar tudo."
npm run dev

# Quando o usuário pressionar Ctrl+C e matar o 'npm run dev', matamos o Prisma Studio também
kill $PRISMA_PID
echo "🛑 Ambiente encerrado!"
