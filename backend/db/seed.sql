-- ============================================================
-- Waternix 초기 샘플 데이터 (seed)
-- ============================================================

-- 업체 (Companies)
INSERT INTO companies (id, name, business_no, contact, phone, email, address, city, district, lat, lng, contract_start, contract_end, status, notes) VALUES
  ('c001', '한국수처리(주)', '123-45-67890', '김대표', '02-1234-5678', 'info@kwp.co.kr', '서울특별시 강남구 테헤란로 123', '서울', '강남구', 37.5084, 127.0621, '2023-01-01', '2025-12-31', 'active', '서울 본사'),
  ('c002', '청정워터시스템', '234-56-78901', '이부장', '051-234-5678', 'clean@cws.co.kr', '부산광역시 해운대구 센텀로 456', '부산', '해운대구', 35.1631, 129.1320, '2023-03-01', '2025-02-28', 'active', '부산 지점'),
  ('c003', '수성환경산업', '345-67-89012', '박실장', '042-345-6789', 'susong@sei.co.kr', '대전광역시 유성구 과학로 789', '대전', '유성구', 36.3741, 127.3558, '2023-06-01', '2025-05-31', 'active', NULL),
  ('c004', '광주정수기술', '456-78-90123', '최과장', '062-456-7890', 'gj@gwangju-water.co.kr', '광주광역시 북구 첨단과기로 321', '광주', '북구', 35.2196, 126.8479, '2022-12-01', '2024-11-30', 'active', NULL),
  ('c005', '대구수처리연구소', '567-89-01234', '정연구원', '053-567-8901', 'dgwr@daegu.co.kr', '대구광역시 달성군 테크노대로 654', '대구', '달성군', 35.8714, 128.5011, '2023-09-01', '2026-08-31', 'active', '반도체 산업단지'),
  ('c006', '인천워터솔루션', '678-90-12345', '강팀장', '032-678-9012', 'iws@incheon.co.kr', '인천광역시 연수구 송도과학로 987', '인천', '연수구', 37.4037, 126.6953, '2023-02-01', '2025-01-31', 'active', '송도 국제도시'),
  ('c007', '울산해수담수화', '789-01-23456', '조부장', '052-789-0123', 'usea@ulsan.co.kr', '울산광역시 남구 삼산로 147', '울산', '남구', 35.5665, 129.3312, '2022-07-01', '2024-06-30', 'active', '해수담수화 전문'),
  ('c008', '경기워터테크', '890-12-34567', '임대리', '031-890-1234', 'gwt@gyeonggi.co.kr', '경기도 수원시 영통구 광교로 258', '경기', '수원시', 37.2636, 127.0286, '2023-04-01', '2026-03-31', 'active', NULL)
ON CONFLICT (id) DO NOTHING;

-- 장비 (Equipment)
INSERT INTO equipment (id, company_id, serial_no, model, equipment_type, name, status, lat, lng, address, city, district, install_date, warranty_end, capacity_lph, comm_type, comm_config, company_name) VALUES
  ('e001', 'c001', 'WNX-RO-2401', 'WaterNix-RO3000', 'ro', '강남사옥 역삼투압 정수기', 'normal', 37.5084, 127.0621, '서울 강남구 테헤란로 123', '서울', '강남구', '2024-01-15', '2026-01-14', 3000, 'modbus_tcp', '{"host":"192.168.1.101","port":502,"slave_id":1}', '한국수처리(주)'),
  ('e002', 'c001', 'WNX-UV-2402', 'WaterNix-UV500', 'uv', '강남사옥 UV 살균기', 'normal', 37.5084, 127.0621, '서울 강남구 테헤란로 123', '서울', '강남구', '2024-01-15', '2026-01-14', 500, 'modbus_tcp', '{"host":"192.168.1.102","port":502,"slave_id":2}', '한국수처리(주)'),
  ('e003', 'c002', 'WNX-RO-2403', 'WaterNix-RO5000', 'ro', '해운대 공장 대형 정수기', 'warning', 35.1631, 129.1320, '부산 해운대구 센텀로 456', '부산', '해운대구', '2023-09-01', '2025-08-31', 5000, 'mqtt', '{"host":"mqtt.waternix.co.kr","port":1883,"topic":"device/e003"}', '청정워터시스템'),
  ('e004', 'c002', 'WNX-PRE-2404', 'WaterNix-PRE200', 'prefilter', '해운대 전처리 필터', 'normal', 35.1631, 129.1320, '부산 해운대구 센텀로 456', '부산', '해운대구', '2023-09-01', '2025-08-31', 200, 'mqtt', '{"host":"mqtt.waternix.co.kr","port":1883,"topic":"device/e004"}', '청정워터시스템'),
  ('e005', 'c003', 'WNX-DI-2405', 'WaterNix-DI1000', 'di', '유성 반도체 초순수', 'normal', 36.3741, 127.3558, '대전 유성구 과학로 789', '대전', '유성구', '2024-03-01', '2026-02-28', 1000, 'modbus_rtu', '{"serial_port":"/dev/ttyUSB0","baudrate":9600}', '수성환경산업'),
  ('e006', 'c004', 'WNX-RO-2406', 'WaterNix-RO2000', 'ro', '광주 공장 정수기', 'error', 35.2196, 126.8479, '광주 북구 첨단과기로 321', '광주', '북구', '2023-11-15', '2025-11-14', 2000, 'mqtt', '{"host":"mqtt.waternix.co.kr","port":1883,"topic":"device/e006"}', '광주정수기술'),
  ('e007', 'c005', 'WNX-SEA-2407', 'WaterNix-SEA10000', 'seawater', '대구 해수담수화 설비', 'normal', 35.8714, 128.5011, '대구 달성군 테크노대로 654', '대구', '달성군', '2024-06-01', '2026-05-31', 10000, 'modbus_tcp', '{"host":"192.168.2.101","port":502,"slave_id":1}', '대구수처리연구소'),
  ('e008', 'c006', 'WNX-SOFT-2408', 'WaterNix-SOFT300', 'softener', '인천 연수기', 'maintenance', 37.4037, 126.6953, '인천 연수구 송도과학로 987', '인천', '연수구', '2023-08-01', '2025-07-31', 300, 'mqtt', '{"host":"mqtt.waternix.co.kr","port":1883,"topic":"device/e008"}', '인천워터솔루션'),
  ('e009', 'c007', 'WNX-SEA-2409', 'WaterNix-SEA20000', 'seawater', '울산 대형 담수화 플랜트', 'normal', 35.5665, 129.3312, '울산 남구 삼산로 147', '울산', '남구', '2023-12-01', '2025-11-30', 20000, 'opcua', '{"endpoint":"opc.tcp://192.168.3.100:4840"}', '울산해수담수화'),
  ('e010', 'c008', 'WNX-RO-2410', 'WaterNix-RO4000', 'ro', '수원 R&D센터 정수기', 'offline', 37.2636, 127.0286, '경기 수원시 영통구 광교로 258', '경기', '수원시', '2024-02-15', '2026-02-14', 4000, 'modbus_tcp', '{"host":"192.168.4.101","port":502,"slave_id":1}', '경기워터테크')
ON CONFLICT (id) DO NOTHING;

-- 소모품 (Consumables)
INSERT INTO consumables (id, name, category, part_no, brand, unit, stock_qty, min_qty, unit_cost, supplier, description) VALUES
  ('con001', 'RO 멤브레인 필터 4040', '필터', 'WN-RO-4040', 'WaterNix', 'EA', 12, 5, 85000, '한국필터공급(주)', '4인치 역삼투압 멤브레인'),
  ('con002', 'RO 멤브레인 필터 8040', '필터', 'WN-RO-8040', 'WaterNix', 'EA', 8, 3, 250000, '한국필터공급(주)', '8인치 대형 역삼투압 멤브레인'),
  ('con003', '5미크론 세디먼트 필터', '전처리필터', 'WN-SED-5M', 'WaterNix', 'EA', 50, 20, 8500, '필터플러스', '5마이크론 세디먼트 카트리지'),
  ('con004', '활성탄 CTO 필터', '전처리필터', 'WN-CTO-10', 'WaterNix', 'EA', 35, 15, 12000, '필터플러스', '10인치 활성탄 블록 필터'),
  ('con005', 'UV 램프 11W', 'UV부품', 'WN-UV-11W', 'WaterNix', 'EA', 6, 5, 45000, '자외선기술', '11W UV 살균 램프 (수명 9000h)'),
  ('con006', 'UV 쿼츠 슬리브', 'UV부품', 'WN-QS-01', 'WaterNix', 'EA', 4, 3, 28000, '자외선기술', 'UV 램프 보호 쿼츠 슬리브'),
  ('con007', 'O링 세트 (RO 하우징)', '소모품', 'WN-OR-RO', 'WaterNix', 'SET', 20, 8, 5500, '고무부품(주)', 'RO 필터 하우징 O링 세트'),
  ('con008', '이온교환 레진 1L', '수처리제', 'WN-IEX-1L', 'WaterNix', 'L', 30, 10, 35000, '수처리화학(주)', '양이온 교환 레진'),
  ('con009', '역삼투압 방청제', '수처리제', 'WN-ANT-01', 'WaterNix', 'KG', 3, 5, 120000, '수처리화학(주)', '스케일 방지 및 방청 약품'),
  ('con010', '고압 펌프 씰 키트', '펌프부품', 'WN-PUMP-SK', 'WaterNix', 'SET', 8, 4, 95000, '펌프코리아', '고압 부스터 펌프 씰 키트')
ON CONFLICT (id) DO NOTHING;

-- 필터 (장비별 필터 관리)
INSERT INTO filters (id, equipment_id, equipment_name, company_name, filter_name, filter_type, stage, install_date, replace_date, used_percent, status, part_no, supplier) VALUES
  ('f001', 'e001', '강남사옥 역삼투압 정수기', '한국수처리(주)', '1단계 세디먼트', '전처리', 1, '2024-01-15', '2024-07-15', 85.0, 'warning', 'WN-SED-5M', '필터플러스'),
  ('f002', 'e001', '강남사옥 역삼투압 정수기', '한국수처리(주)', '2단계 활성탄', '전처리', 2, '2024-01-15', '2024-07-15', 72.0, 'normal', 'WN-CTO-10', '필터플러스'),
  ('f003', 'e001', '강남사옥 역삼투압 정수기', '한국수처리(주)', '3단계 RO 멤브레인', '역삼투압', 3, '2024-01-15', '2026-01-15', 18.0, 'normal', 'WN-RO-4040', '한국필터공급(주)'),
  ('f004', 'e003', '해운대 공장 대형 정수기', '청정워터시스템', '1단계 전처리 세디먼트', '전처리', 1, '2023-09-01', '2024-03-01', 98.0, 'replace', 'WN-SED-5M', '필터플러스'),
  ('f005', 'e003', '해운대 공장 대형 정수기', '청정워터시스템', '2단계 RO 멤브레인 8040', '역삼투압', 2, '2023-09-01', '2025-09-01', 45.0, 'normal', 'WN-RO-8040', '한국필터공급(주)'),
  ('f006', 'e005', '유성 반도체 초순수', '수성환경산업', '이온교환 레진', 'DI', 1, '2024-03-01', '2024-09-01', 62.0, 'normal', 'WN-IEX-1L', '수처리화학(주)'),
  ('f007', 'e008', '인천 연수기', '인천워터솔루션', '연화 레진', '연수', 1, '2023-08-01', '2024-02-01', 96.0, 'replace', 'WN-IEX-1L', '수처리화학(주)')
ON CONFLICT (id) DO NOTHING;

-- 유지보수 기록 (Maintenance)
INSERT INTO maintenance_records (id, equipment_id, equipment_name, company_id, company_name, type, status, title, description, technician, scheduled_date, completed_date, cost, notes) VALUES
  ('m001', 'e001', '강남사옥 역삼투압 정수기', 'c001', '한국수처리(주)', 'preventive', 'scheduled', '6개월 정기 점검', '전처리 필터 교체 및 RO 압력 점검', '김기술', '2024-07-15', NULL, NULL, NULL),
  ('m002', 'e003', '해운대 공장 대형 정수기', 'c002', '청정워터시스템', 'corrective', 'in_progress', '전처리 필터 긴급 교체', '세디먼트 필터 막힘으로 인한 유량 저하 수리', '이엔지', '2024-06-28', NULL, 25000, '부품 발주 완료'),
  ('m003', 'e006', '광주 공장 정수기', 'c004', '광주정수기술', 'emergency', 'scheduled', '고압 펌프 이상 긴급 수리', 'RO 고압 펌프 이상 소음 및 압력 저하', '박수리', '2024-07-01', NULL, NULL, '긴급 출동 필요'),
  ('m004', 'e002', '강남사옥 UV 살균기', 'c001', '한국수처리(주)', 'preventive', 'completed', 'UV 램프 교체', '9000시간 사용으로 UV 램프 정기 교체', '최점검', '2024-05-10', '2024-05-10', 45000, '완료'),
  ('m005', 'e007', '대구 해수담수화 설비', 'c005', '대구수처리연구소', 'inspection', 'completed', '연간 정기 점검', '해수담수화 설비 전체 시스템 점검 및 세척', '정유지', '2024-04-15', '2024-04-16', 350000, '이상 없음')
ON CONFLICT (id) DO NOTHING;

-- 알림 (Alerts)
INSERT INTO alerts (id, equipment_id, equipment_name, company_name, severity, type, title, message, acknowledged, process_step) VALUES
  ('a001', 'e003', '해운대 공장 대형 정수기', '청정워터시스템', 'warning', 'filter_life', '전처리 필터 교체 필요', '1단계 세디먼트 필터 수명이 98%에 도달했습니다. 즉시 교체가 필요합니다.', false, 'investigating'),
  ('a002', 'e006', '광주 공장 정수기', '광주정수기술', 'critical', 'pump_fault', '고압 펌프 이상 감지', 'RO 고압 펌프에서 비정상적인 진동 및 소음이 감지되었습니다. 즉시 점검이 필요합니다.', false, 'processing'),
  ('a003', 'e010', '수원 R&D센터 정수기', '경기워터테크', 'warning', 'offline', '장비 연결 끊김', '장비가 8시간 이상 통신이 되지 않습니다. 전원 및 네트워크 상태를 확인하세요.', false, 'received'),
  ('a004', 'e008', '인천 연수기', '인천워터솔루션', 'info', 'maintenance_due', '정기 점검 예정', '인천 연수기의 정기 점검 일정이 7일 후입니다.', false, 'received'),
  ('a005', 'e001', '강남사옥 역삼투압 정수기', '한국수처리(주)', 'warning', 'filter_life', '1단계 필터 교체 권고', '세디먼트 필터 수명이 85%에 도달했습니다.', false, 'received')
ON CONFLICT (id) DO NOTHING;

-- 장비별 센서 읽기 샘플 (TimescaleDB)
-- sensor_readings 테이블에 daily_volume 컬럼이 있는 경우
-- INSERT INTO sensor_readings (equipment_id, time, daily_volume) VALUES ...
