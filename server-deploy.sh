#!/bin/bash

# Script para iniciar o servidor Node.js sem depender do comando PM2 global
# Use: bash server-deploy.sh start|stop|status

# Variáveis de configuração
APP_DIR="/home/user/papodamentebr"  # Substitua pelo caminho da sua aplicação no servidor
LOG_FILE="$APP_DIR/app.log"
PID_FILE="$APP_DIR/app.pid"
NODE_BIN="/usr/bin/node"  # Caminho para o executável Node.js (ajuste se necessário)

# Função para iniciar a aplicação
start() {
    echo "Iniciando aplicação..."
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null; then
            echo "Aplicação já está rodando com PID: $PID"
            return 1
        else
            echo "PID file exists but process is not running. Removing PID file."
            rm "$PID_FILE"
        fi
    fi
    
    cd "$APP_DIR"
    nohup $NODE_BIN server.cjs >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Aplicação iniciada com PID: $(cat "$PID_FILE")"
}

# Função para parar a aplicação
stop() {
    echo "Parando aplicação..."
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null; then
            kill "$PID"
            rm "$PID_FILE"
            echo "Aplicação parada."
        else
            echo "Processo não está rodando. Removendo PID file."
            rm "$PID_FILE"
        fi
    else
        echo "PID file não encontrado. A aplicação não está rodando."
    fi
}

# Função para verificar o status da aplicação
status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null; then
            echo "Aplicação está rodando com PID: $PID"
        else
            echo "PID file exists but process is not running."
        fi
    else
        echo "Aplicação não está rodando."
    fi
}

# Executa a função com base no argumento fornecido
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        start
        ;;
    status)
        status
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0
