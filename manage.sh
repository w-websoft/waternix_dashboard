#!/bin/bash
# 워터닉스 서비스 관리 스크립트
COMPOSE="docker compose -f /opt/waternix/docker-compose.prod.yml"
NGINX="/www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf"

case "$1" in
  start)
    echo '워터닉스 서비스 시작...'
    $COMPOSE up -d
    ;;
  stop)
    echo '워터닉스 서비스 중지...'
    $COMPOSE down
    ;;
  restart)
    echo '워터닉스 서비스 재시작...'
    $COMPOSE restart
    ;;
  status)
    $COMPOSE ps
    ;;
  logs)
    SERVICE=${2:-frontend}
    $COMPOSE logs --tail=100 -f $SERVICE
    ;;
  update)
    echo '코드 업데이트 및 재빌드...'
    cd /opt/waternix
    git fetch origin main
    git reset --hard origin/main
    $COMPOSE build frontend backend
    $COMPOSE up -d --no-deps frontend backend
    $NGINX
    echo '업데이트 완료!'
    ;;
  nginx)
    $NGINX
    echo 'Nginx 리로드 완료'
    ;;
  *)
    echo 'Usage: ./manage.sh {start|stop|restart|status|logs [service]|update|nginx}'
    ;;
esac
