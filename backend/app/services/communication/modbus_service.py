"""
Modbus TCP/RTU 통신 서비스
- PLC, 인버터, 계측기 연동
- pymodbus 3.x 기반
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

from pymodbus.client import AsyncModbusTcpClient, AsyncModbusSerialClient
from pymodbus.exceptions import ModbusException
from pymodbus.payload import BinaryPayloadDecoder, BinaryPayloadBuilder
from pymodbus.constants import Endian

logger = logging.getLogger(__name__)


class DataType(str, Enum):
    UINT16 = "uint16"
    INT16 = "int16"
    UINT32 = "uint32"
    INT32 = "int32"
    FLOAT32 = "float32"
    BOOL = "bool"


@dataclass
class RegisterDef:
    address: int
    count: int
    data_type: DataType
    scale: float = 1.0
    unit: str = ""


# 워터닉스 표준 레지스터 맵
WATERNIX_REGISTER_MAP: Dict[str, RegisterDef] = {
    "flow_rate":        RegisterDef(0x0001, 2, DataType.FLOAT32, 1.0, "L/min"),
    "daily_volume":     RegisterDef(0x0003, 2, DataType.FLOAT32, 1.0, "L"),
    "inlet_pressure":   RegisterDef(0x0005, 2, DataType.FLOAT32, 1.0, "bar"),
    "outlet_pressure":  RegisterDef(0x0007, 2, DataType.FLOAT32, 1.0, "bar"),
    "inlet_tds":        RegisterDef(0x0009, 1, DataType.UINT16,  1.0, "ppm"),
    "outlet_tds":       RegisterDef(0x000B, 1, DataType.UINT16,  1.0, "ppm"),
    "temperature":      RegisterDef(0x000D, 2, DataType.FLOAT32, 1.0, "°C"),
    "power_kw":         RegisterDef(0x000F, 2, DataType.FLOAT32, 1.0, "kW"),
    "running_hours":    RegisterDef(0x0011, 2, DataType.FLOAT32, 1.0, "h"),
    "status_bits":      RegisterDef(0x0100, 1, DataType.UINT16,  1.0, ""),
    "error_code":       RegisterDef(0x0101, 1, DataType.UINT16,  1.0, ""),
}

WATERNIX_COIL_MAP: Dict[str, int] = {
    "start":      0x0001,
    "stop":       0x0002,
    "flush":      0x0003,
    "alarm_reset": 0x0010,
}


class ModbusTCPService:
    """Modbus TCP 클라이언트 서비스"""

    def __init__(self, host: str, port: int = 502, slave_id: int = 1,
                 timeout: float = 3.0, retries: int = 3):
        self.host = host
        self.port = port
        self.slave_id = slave_id
        self.timeout = timeout
        self.retries = retries
        self._client: Optional[AsyncModbusTcpClient] = None

    async def connect(self) -> bool:
        try:
            self._client = AsyncModbusTcpClient(
                host=self.host,
                port=self.port,
                timeout=self.timeout,
                retries=self.retries,
            )
            result = await self._client.connect()
            if result:
                logger.info(f"Modbus TCP 연결 성공: {self.host}:{self.port}")
            return result
        except Exception as e:
            logger.error(f"Modbus TCP 연결 실패 {self.host}:{self.port}: {e}")
            return False

    async def disconnect(self):
        if self._client:
            self._client.close()
            self._client = None

    async def read_sensor_data(self, register_map: Dict[str, RegisterDef] = None) -> Dict[str, Any]:
        """센서 데이터 일괄 읽기"""
        if not self._client or not self._client.connected:
            await self.connect()

        reg_map = register_map or WATERNIX_REGISTER_MAP
        data = {}

        for key, reg in reg_map.items():
            try:
                result = await self._client.read_holding_registers(
                    address=reg.address,
                    count=reg.count,
                    slave=self.slave_id,
                )
                if not result.isError():
                    value = self._decode_register(result.registers, reg.data_type)
                    if value is not None:
                        data[key] = round(value * reg.scale, 3)
            except ModbusException as e:
                logger.warning(f"레지스터 읽기 실패 [{key}] addr={reg.address}: {e}")

        return data

    async def write_coil(self, coil_name: str) -> bool:
        """제어 코일 쓰기 (기동/정지/플러싱 등)"""
        if coil_name not in WATERNIX_COIL_MAP:
            logger.error(f"알 수 없는 코일: {coil_name}")
            return False

        address = WATERNIX_COIL_MAP[coil_name]
        try:
            result = await self._client.write_coil(address, True, slave=self.slave_id)
            return not result.isError()
        except ModbusException as e:
            logger.error(f"코일 쓰기 실패 [{coil_name}]: {e}")
            return False

    def _decode_register(self, registers: List[int], data_type: DataType) -> Optional[float]:
        decoder = BinaryPayloadDecoder.fromRegisters(
            registers,
            byteorder=Endian.BIG,
            wordorder=Endian.BIG,
        )
        try:
            match data_type:
                case DataType.FLOAT32:
                    return decoder.decode_32bit_float()
                case DataType.UINT16:
                    return float(decoder.decode_16bit_uint())
                case DataType.INT16:
                    return float(decoder.decode_16bit_int())
                case DataType.UINT32:
                    return float(decoder.decode_32bit_uint())
                case DataType.INT32:
                    return float(decoder.decode_32bit_int())
                case _:
                    return None
        except Exception:
            return None

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, *args):
        await self.disconnect()


class ModbusRTUService:
    """Modbus RTU (RS485/RS232) 클라이언트 서비스"""

    def __init__(self, port: str, baudrate: int = 19200, parity: str = "N",
                 stopbits: int = 1, bytesize: int = 8,
                 timeout: float = 1.0, slave_id: int = 1):
        self.port = port
        self.slave_id = slave_id
        self._client: Optional[AsyncModbusSerialClient] = None
        self._params = dict(
            method="rtu",
            port=port,
            baudrate=baudrate,
            parity=parity,
            stopbits=stopbits,
            bytesize=bytesize,
            timeout=timeout,
        )

    async def connect(self) -> bool:
        try:
            self._client = AsyncModbusSerialClient(**self._params)
            result = await self._client.connect()
            if result:
                logger.info(f"Modbus RTU 연결 성공: {self.port}")
            return result
        except Exception as e:
            logger.error(f"Modbus RTU 연결 실패 {self.port}: {e}")
            return False

    async def read_sensor_data(self, register_map: Dict[str, RegisterDef] = None) -> Dict[str, Any]:
        if not self._client or not self._client.connected:
            await self.connect()

        reg_map = register_map or WATERNIX_REGISTER_MAP
        data = {}
        for key, reg in reg_map.items():
            try:
                result = await self._client.read_holding_registers(
                    address=reg.address,
                    count=reg.count,
                    slave=self.slave_id,
                )
                if not result.isError():
                    decoder = BinaryPayloadDecoder.fromRegisters(
                        result.registers, byteorder=Endian.BIG, wordorder=Endian.BIG
                    )
                    value = decoder.decode_32bit_float() if reg.data_type == DataType.FLOAT32 \
                        else float(decoder.decode_16bit_uint())
                    data[key] = round(value * reg.scale, 3)
            except Exception as e:
                logger.warning(f"RTU 레지스터 읽기 실패 [{key}]: {e}")

        return data

    async def disconnect(self):
        if self._client:
            self._client.close()
