"""
MQTT 통신 서비스
- IoT 게이트웨이 ↔ 서버 실시간 데이터 수신
- paho-mqtt 2.x 기반
"""
import asyncio
import json
import logging
from typing import Callable, Optional, Dict, Any
from datetime import datetime

import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)


class MQTTService:
    """
    MQTT 브로커 연결 및 구독/발행 서비스

    토픽 구조:
      waternix/{company_id}/{equipment_id}/telemetry  ← 센서 데이터 (30초)
      waternix/{company_id}/{equipment_id}/status     ← 상태 변경
      waternix/{company_id}/{equipment_id}/alert      ← 알람
      waternix/{company_id}/{equipment_id}/command    → 원격 제어
      waternix/{company_id}/{equipment_id}/heartbeat  ← 생존 신호 (60초)
    """

    def __init__(self, host: str, port: int = 1883,
                 username: Optional[str] = None,
                 password: Optional[str] = None,
                 tls_enabled: bool = False,
                 topic_prefix: str = "waternix"):
        self.host = host
        self.port = port
        self.topic_prefix = topic_prefix
        self._client = mqtt.Client(
            client_id=f"waternix-server-{id(self)}",
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        )
        self._handlers: Dict[str, list[Callable]] = {}
        self._connected = False

        if username and password:
            self._client.username_pw_set(username, password)
        if tls_enabled:
            self._client.tls_set()

        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

    def start(self):
        """백그라운드 MQTT 루프 시작"""
        self._client.connect(self.host, self.port, keepalive=60)
        self._client.loop_start()
        logger.info(f"MQTT 서비스 시작: {self.host}:{self.port}")

    def stop(self):
        self._client.loop_stop()
        self._client.disconnect()
        logger.info("MQTT 서비스 종료")

    def subscribe_all_equipment(self):
        """전체 장비 토픽 구독"""
        topics = [
            f"{self.topic_prefix}/+/+/telemetry",
            f"{self.topic_prefix}/+/+/status",
            f"{self.topic_prefix}/+/+/alert",
            f"{self.topic_prefix}/+/+/heartbeat",
        ]
        for topic in topics:
            self._client.subscribe(topic, qos=1)
            logger.info(f"MQTT 구독: {topic}")

    def publish_command(self, company_id: str, equipment_id: str,
                        command: str, params: Dict[str, Any] = None) -> bool:
        """원격 제어 명령 발행"""
        topic = f"{self.topic_prefix}/{company_id}/{equipment_id}/command"
        payload = json.dumps({
            "ts": int(datetime.now().timestamp() * 1000),
            "cmd": command,
            "params": params or {},
        })
        result = self._client.publish(topic, payload, qos=1)
        return result.rc == mqtt.MQTT_ERR_SUCCESS

    def on_telemetry(self, handler: Callable):
        """센서 데이터 수신 핸들러 등록"""
        self._handlers.setdefault("telemetry", []).append(handler)

    def on_status(self, handler: Callable):
        """상태 변경 핸들러 등록"""
        self._handlers.setdefault("status", []).append(handler)

    def on_alert(self, handler: Callable):
        """알람 핸들러 등록"""
        self._handlers.setdefault("alert", []).append(handler)

    def on_heartbeat(self, handler: Callable):
        """하트비트 핸들러 등록"""
        self._handlers.setdefault("heartbeat", []).append(handler)

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            self._connected = True
            logger.info("MQTT 브로커 연결 성공")
            self.subscribe_all_equipment()
        else:
            logger.error(f"MQTT 연결 실패: {reason_code}")

    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties):
        self._connected = False
        if reason_code != 0:
            logger.warning(f"MQTT 연결 끊김 (코드: {reason_code}), 재연결 시도...")

    def _on_message(self, client, userdata, msg: mqtt.MQTTMessage):
        try:
            topic_parts = msg.topic.split("/")
            if len(topic_parts) < 4:
                return

            _, company_id, equipment_id, message_type = topic_parts[:4]
            payload = json.loads(msg.payload.decode())

            logger.debug(f"MQTT 수신: {msg.topic} - {payload}")

            handlers = self._handlers.get(message_type, [])
            for handler in handlers:
                try:
                    handler(company_id, equipment_id, payload)
                except Exception as e:
                    logger.error(f"MQTT 핸들러 오류 [{message_type}]: {e}")

        except json.JSONDecodeError:
            logger.warning(f"MQTT JSON 파싱 실패: {msg.topic}")
        except Exception as e:
            logger.error(f"MQTT 메시지 처리 오류: {e}")

    @property
    def is_connected(self) -> bool:
        return self._connected
