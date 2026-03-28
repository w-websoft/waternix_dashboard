"""
RS232/RS485 시리얼 통신 서비스
- pyserial 기반 직렬 통신
- 독자 프로토콜 및 Modbus RTU 지원
"""
import asyncio
import logging
import struct
from typing import Optional, Dict, Any, List, Tuple
from enum import Enum

import serial
import serial.tools.list_ports

logger = logging.getLogger(__name__)


class Parity(str, Enum):
    NONE = "N"
    EVEN = "E"
    ODD = "O"


class SerialService:
    """RS232/RS485 시리얼 통신 서비스"""

    def __init__(
        self,
        port: str,
        baudrate: int = 19200,
        bytesize: int = 8,
        parity: str = "N",
        stopbits: int = 1,
        timeout: float = 1.0,
        write_timeout: float = 1.0,
    ):
        self.port = port
        self._ser: Optional[serial.Serial] = None
        self._params = dict(
            port=port,
            baudrate=baudrate,
            bytesize=bytesize,
            parity=parity,
            stopbits=stopbits,
            timeout=timeout,
            write_timeout=write_timeout,
        )

    def open(self) -> bool:
        try:
            self._ser = serial.Serial(**self._params)
            logger.info(f"시리얼 포트 열기 성공: {self.port} ({self._params['baudrate']} baud)")
            return True
        except serial.SerialException as e:
            logger.error(f"시리얼 포트 열기 실패 {self.port}: {e}")
            return False

    def close(self):
        if self._ser and self._ser.is_open:
            self._ser.close()
            logger.info(f"시리얼 포트 닫기: {self.port}")

    def send_receive(self, data: bytes, expected_len: int = None, timeout: float = None) -> Optional[bytes]:
        """데이터 전송 후 응답 수신"""
        if not self._ser or not self._ser.is_open:
            logger.error("시리얼 포트가 열려있지 않습니다")
            return None

        try:
            self._ser.reset_input_buffer()
            self._ser.write(data)
            logger.debug(f"TX: {data.hex()}")

            if expected_len:
                response = self._ser.read(expected_len)
            else:
                response = self._ser.read_until(b'\r\n') or self._ser.read(256)

            if response:
                logger.debug(f"RX: {response.hex()}")
            return response if response else None

        except serial.SerialTimeoutException:
            logger.warning(f"시리얼 타임아웃: {self.port}")
            return None
        except serial.SerialException as e:
            logger.error(f"시리얼 통신 오류: {e}")
            return None

    def calc_crc16(self, data: bytes) -> Tuple[int, int]:
        """Modbus CRC16 계산"""
        crc = 0xFFFF
        for byte in data:
            crc ^= byte
            for _ in range(8):
                if crc & 0x0001:
                    crc = (crc >> 1) ^ 0xA001
                else:
                    crc >>= 1
        return crc & 0xFF, (crc >> 8) & 0xFF

    def build_modbus_rtu_request(self, slave_id: int, function_code: int,
                                  start_addr: int, count: int) -> bytes:
        """Modbus RTU 읽기 요청 패킷 생성"""
        frame = struct.pack(">BBHH", slave_id, function_code, start_addr, count)
        crc_lo, crc_hi = self.calc_crc16(frame)
        return frame + bytes([crc_lo, crc_hi])

    def parse_modbus_rtu_response(self, response: bytes, count: int) -> Optional[List[int]]:
        """Modbus RTU 응답 파싱"""
        if len(response) < 5:
            return None
        # CRC 검증
        crc_lo, crc_hi = self.calc_crc16(response[:-2])
        if response[-2] != crc_lo or response[-1] != crc_hi:
            logger.warning("Modbus CRC 검증 실패")
            return None
        byte_count = response[2]
        registers = []
        for i in range(count):
            offset = 3 + i * 2
            if offset + 2 > len(response):
                break
            reg_val = struct.unpack(">H", response[offset:offset+2])[0]
            registers.append(reg_val)
        return registers

    @staticmethod
    def list_available_ports() -> List[str]:
        """사용 가능한 시리얼 포트 목록"""
        ports = serial.tools.list_ports.comports()
        return [p.device for p in ports]

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, *args):
        self.close()


class AsyncSerialService:
    """비동기 시리얼 통신 서비스 (asyncio 기반)"""

    def __init__(self, port: str, baudrate: int = 19200, **kwargs):
        self._sync_service = SerialService(port, baudrate, **kwargs)
        self._loop = asyncio.get_event_loop()

    async def open(self) -> bool:
        return await self._loop.run_in_executor(None, self._sync_service.open)

    async def close(self):
        await self._loop.run_in_executor(None, self._sync_service.close)

    async def read_modbus_registers(self, slave_id: int, start_addr: int, count: int) -> Optional[List[int]]:
        """비동기 Modbus RTU 레지스터 읽기"""
        request = self._sync_service.build_modbus_rtu_request(slave_id, 0x03, start_addr, count)
        expected_len = 5 + count * 2
        response = await self._loop.run_in_executor(
            None, self._sync_service.send_receive, request, expected_len
        )
        if response:
            return self._sync_service.parse_modbus_rtu_response(response, count)
        return None
