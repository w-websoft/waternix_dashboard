from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "워터닉스 IoT 관리 시스템"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "waternix-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://waternix:waternix123@localhost:5432/waternix_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # MQTT Broker
    MQTT_HOST: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_TLS_PORT: int = 8883
    MQTT_USERNAME: Optional[str] = None
    MQTT_PASSWORD: Optional[str] = None
    MQTT_TLS_ENABLED: bool = False
    MQTT_TOPIC_PREFIX: str = "waternix"

    # Modbus 기본 설정
    MODBUS_TIMEOUT: float = 3.0
    MODBUS_RETRIES: int = 3
    MODBUS_POLL_INTERVAL: float = 5.0

    # Serial 기본 설정
    SERIAL_BAUDRATE: int = 19200
    SERIAL_BYTESIZE: int = 8
    SERIAL_PARITY: str = "N"
    SERIAL_STOPBITS: int = 1
    SERIAL_TIMEOUT: float = 1.0

    # 알림 임계값
    ALERT_TDS_WARNING: int = 20       # ppm
    ALERT_TDS_CRITICAL: int = 50      # ppm
    ALERT_REJECTION_WARNING: float = 95.0   # %
    ALERT_REJECTION_CRITICAL: float = 90.0  # %
    ALERT_PRESSURE_MAX: float = 12.0  # bar
    ALERT_OFFLINE_WARNING_MIN: int = 5   # 분
    ALERT_OFFLINE_CRITICAL_MIN: int = 30  # 분
    ALERT_FILTER_WARNING_PCT: int = 80   # %
    ALERT_FILTER_CRITICAL_PCT: int = 95  # %

    # 관리자 계정
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "Waternix2026!@"
    ADMIN_EMAIL: str = "admin@waternix.com"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://gwaternix.w-websoftsrv.kr",
        "http://gwaternix.w-websoftsrv.kr",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
