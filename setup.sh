#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# 워터닉스 IoT 관리 시스템 - 원클릭 설치/구동 스크립트
# WATERNIX IoT Equipment Management System - One-Click Setup
# ═══════════════════════════════════════════════════════════════════════════════

set -e  # 오류 발생 시 즉시 중단

# ─── 색상 정의 ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── 로고 ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}"
echo "  ██╗    ██╗ █████╗ ████████╗███████╗██████╗ ███╗   ██╗██╗██╗  ██╗"
echo "  ██║    ██║██╔══██╗╚══██╔══╝██╔════╝██╔══██╗████╗  ██║██║╚██╗██╔╝"
echo "  ██║ █╗ ██║███████║   ██║   █████╗  ██████╔╝██╔██╗ ██║██║ ╚███╔╝ "
echo "  ██║███╗██║██╔══██║   ██║   ██╔══╝  ██╔══██╗██║╚██╗██║██║ ██╔██╗ "
echo "  ╚███╔███╔╝██║  ██║   ██║   ███████╗██║  ██║██║ ╚████║██║██╔╝ ██╗"
echo "   ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${BOLD}  IoT 수처리 장비 통합 관리 시스템 v1.0${NC}"
echo -e "  https://github.com/w-websoft/waternix_dashboard"
echo ""

# ─── 모드 선택 ─────────────────────────────────────────────────────────────────
MODE=${1:-"dev"}  # dev | docker | full

print_step() { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }
print_ok()   { echo -e "  ${GREEN}✓ $1${NC}"; }
print_warn() { echo -e "  ${YELLOW}⚠ $1${NC}"; }
print_err()  { echo -e "  ${RED}✗ $1${NC}"; }
print_info() { echo -e "  ${CYAN}ℹ $1${NC}"; }

# ─── 시스템 요구사항 확인 ────────────────────────────────────────────────────────
print_step "시스템 요구사항 확인"

check_command() {
    if command -v "$1" &>/dev/null; then
        print_ok "$1 설치 확인 ($(command -v "$1"))"
        return 0
    else
        print_warn "$1 미설치"
        return 1
    fi
}

OS="$(uname -s)"
print_info "운영체제: $OS"

# Node.js 확인 및 설치
if ! check_command node; then
    print_step "Node.js 설치 중..."
    if [ "$OS" = "Darwin" ]; then
        if check_command brew; then
            brew install node
        else
            echo "Homebrew 설치 중..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            brew install node
        fi
    elif [ "$OS" = "Linux" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    print_ok "Node.js 설치 완료"
fi

# Python 확인
if ! check_command python3; then
    print_err "Python3가 설치되어 있지 않습니다"
    if [ "$OS" = "Darwin" ]; then
        brew install python@3.11
    elif [ "$OS" = "Linux" ]; then
        sudo apt-get update && sudo apt-get install -y python3.11 python3-pip python3-venv
    fi
fi

# Docker 확인 (docker 모드일 때만 필수)
if [ "$MODE" = "docker" ] || [ "$MODE" = "full" ]; then
    if ! check_command docker; then
        print_err "Docker가 필요합니다. https://www.docker.com/products/docker-desktop 에서 설치하세요"
        exit 1
    fi
    if ! check_command docker-compose && ! docker compose version &>/dev/null 2>&1; then
        print_err "Docker Compose가 필요합니다"
        exit 1
    fi
fi

check_command git || { print_err "Git이 필요합니다"; exit 1; }

# ─── 환경변수 설정 ──────────────────────────────────────────────────────────────
print_step "환경변수 파일 생성"

if [ ! -f "backend/.env" ]; then
    cat > backend/.env << 'ENVEOF'
# ═══════════════════════════════════════════════════
# 워터닉스 IoT 시스템 - 환경변수 설정
# ═══════════════════════════════════════════════════

# 앱 설정
APP_NAME=워터닉스 IoT 관리 시스템
APP_VERSION=1.0.0
DEBUG=true

# 보안 (운영환경에서 반드시 변경!)
SECRET_KEY=waternix-dev-secret-key-change-in-production-2024

# 데이터베이스
DATABASE_URL=postgresql+asyncpg://waternix:waternix123@localhost:5432/waternix_db

# Redis
REDIS_URL=redis://localhost:6379/0

# MQTT 브로커
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_TLS_PORT=8883
MQTT_TLS_ENABLED=false
MQTT_TOPIC_PREFIX=waternix

# Modbus 기본 설정
MODBUS_TIMEOUT=3.0
MODBUS_RETRIES=3
MODBUS_POLL_INTERVAL=5.0

# 시리얼 기본 설정
SERIAL_BAUDRATE=19200

# 알림 임계값
ALERT_TDS_WARNING=20
ALERT_TDS_CRITICAL=50
ALERT_REJECTION_WARNING=95.0
ALERT_REJECTION_CRITICAL=90.0
ALERT_FILTER_WARNING_PCT=80
ALERT_FILTER_CRITICAL_PCT=95
ALERT_OFFLINE_WARNING_MIN=5
ALERT_OFFLINE_CRITICAL_MIN=30

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]
ENVEOF
    print_ok "backend/.env 파일 생성"
else
    print_info "backend/.env 파일 이미 존재 (건너뜀)"
fi

if [ ! -f "frontend/.env.local" ]; then
    cat > frontend/.env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
NEXT_PUBLIC_MAP_TILE=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
ENVEOF
    print_ok "frontend/.env.local 파일 생성"
fi

# ─── 개발 모드 ─────────────────────────────────────────────────────────────────
if [ "$MODE" = "dev" ]; then
    print_step "개발 환경 설정"

    # 프론트엔드 의존성 설치
    print_info "프론트엔드 패키지 설치 중..."
    cd frontend
    npm install --silent
    print_ok "프론트엔드 패키지 설치 완료"
    cd ..

    # 백엔드 가상환경 설정
    print_info "파이썬 가상환경 설정 중..."
    cd backend
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_ok "가상환경 생성: backend/venv"
    fi
    source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || true
    pip install --quiet -r requirements.txt
    print_ok "파이썬 패키지 설치 완료"
    cd ..

    echo ""
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ✅ 개발 환경 설정 완료!${NC}"
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BOLD}서버 실행 방법:${NC}"
    echo ""
    echo -e "  ${CYAN}# 터미널 1: 프론트엔드${NC}"
    echo -e "  cd frontend && npm run dev"
    echo -e "  → ${UNDERLINE}http://localhost:3000${NC}"
    echo ""
    echo -e "  ${CYAN}# 터미널 2: 백엔드 API${NC}"
    echo -e "  cd backend && source venv/bin/activate"
    echo -e "  uvicorn app.main:socket_app --reload --port 8000"
    echo -e "  → ${UNDERLINE}http://localhost:8000/api/docs${NC}"
    echo ""

# ─── Docker 모드 ───────────────────────────────────────────────────────────────
elif [ "$MODE" = "docker" ] || [ "$MODE" = "full" ]; then
    print_step "Docker Compose로 전체 시스템 구동"

    # mosquitto 디렉터리 확인
    mkdir -p mosquitto/data mosquitto/log mosquitto/certs
    print_ok "Mosquitto 디렉터리 준비"

    # nginx 설정
    if [ ! -d "nginx" ]; then
        mkdir -p nginx/certs
        cat > nginx/nginx.conf << 'NGINXEOF'
events { worker_connections 1024; }

http {
    upstream frontend { server frontend:3000; }
    upstream backend  { server backend:8000; }

    server {
        listen 80;
        server_name _;

        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
        }
    }
}
NGINXEOF
        print_ok "Nginx 설정 생성"
    fi

    print_info "Docker 이미지 빌드 및 서비스 시작 중... (최초 실행 시 5~10분 소요)"
    docker compose up -d --build

    print_info "서비스 상태 확인 중..."
    sleep 5
    docker compose ps

    echo ""
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ✅ 시스템 구동 완료!${NC}"
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BOLD}접속 URL:${NC}"
    echo -e "  🌐 대시보드:    ${CYAN}http://localhost:3000${NC}"
    echo -e "  📡 API 문서:    ${CYAN}http://localhost:8000/api/docs${NC}"
    echo -e "  🔌 MQTT 브로커: ${CYAN}mqtt://localhost:1883${NC}"
    echo ""
    echo -e "  ${BOLD}관리 명령어:${NC}"
    echo -e "  docker compose logs -f          # 전체 로그"
    echo -e "  docker compose logs -f backend  # 백엔드 로그"
    echo -e "  docker compose down             # 시스템 종료"
    echo -e "  docker compose restart          # 재시작"
    echo ""
fi

# ─── 공통 안내 ─────────────────────────────────────────────────────────────────
echo -e "  ${BOLD}사용법:${NC}"
echo -e "  bash setup.sh dev     # 개발 환경 설정"
echo -e "  bash setup.sh docker  # Docker Compose 실행"
echo ""
echo -e "  ${BOLD}문의:${NC} waternix@naver.com | 051-202-3055"
echo ""
