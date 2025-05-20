#!/bin/bash

# Mata qualquer processo preso na porta 5000 (Node travado)
PORT=5000
PID=$(lsof -ti tcp:$PORT)
if [ -n "$PID" ]; then
  echo "Matando processo na porta $PORT (PID: $PID)..."
  kill -9 $PID
fi

# Função para encerrar os subprocessos
function cleanup {
  echo "Encerrando processos..."
  kill "$SERVER_PID" "$CLIENT_PID"
  wait "$SERVER_PID" "$CLIENT_PID"
  exit
}

# Captura CTRL+C e outros sinais
trap cleanup SIGINT SIGTERM

# Inicia o backend e salva o PID
npm run dev:server &
SERVER_PID=$!

# Inicia o frontend e salva o PID
npm run dev:client &
CLIENT_PID=$!

# Espera ambos
wait
