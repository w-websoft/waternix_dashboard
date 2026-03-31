"""
도로명주소 API 프록시 + 좌표 변환
- 행정안전부 도로명주소 API를 서버 측에서 호출해 CORS 우회
- Juso API의 entX(경도), entY(위도) 좌표 직접 반환
- API 키 없이 devtools_key 로 테스트 가능 (하루 100회 제한)
  → 실사용 시 NEXT_PUBLIC_JUSO_API_KEY 환경변수로 키 설정
"""
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/juso", tags=["도로명주소"])

JUSO_API_URL = "https://business.juso.go.kr/addrlink/addrLinkApi.do"
JUSO_CONFM_KEY = os.getenv("JUSO_CONFM_KEY", "devtools_key")


@router.get("/search", summary="도로명주소 검색")
async def search_address(
    keyword: str = Query(..., min_length=1, description="검색할 주소 키워드"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=20),
):
    """
    행정안전부 도로명주소 API를 서버에서 프록시 호출.
    브라우저 CORS 문제를 우회하고 entX/entY 좌표를 함께 반환.
    """
    params = {
        "currentPage": str(page),
        "countPerPage": str(per_page),
        "keyword": keyword,
        "confmKey": JUSO_CONFM_KEY,
        "resultType": "json",
        "addInfoYn": "Y",  # entX(경도), entY(위도) 포함
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(JUSO_API_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        results = data.get("results", {})
        common = results.get("common", {})
        error_code = common.get("errorCode", "0")

        if error_code != "0":
            error_msg = common.get("errorMessage", "도로명주소 API 오류")
            logger.warning(f"Juso API error: {error_code} - {error_msg}")
            # API 키 오류 시 Nominatim으로 대체 검색
            if error_code in ("-100", "E0001", "E0005"):
                return await _fallback_nominatim(keyword)
            raise HTTPException(status_code=502, detail=f"주소 API 오류: {error_msg}")

        juso_list = results.get("juso", []) or []
        items = []
        for j in juso_list:
            entry_x = j.get("entX") or j.get("x", "")
            entry_y = j.get("entY") or j.get("y", "")
            items.append({
                "roadAddr": j.get("roadAddr", ""),
                "roadAddrPart1": j.get("roadAddrPart1", ""),
                "zipNo": j.get("zipNo", ""),
                "siNm": j.get("siNm", ""),
                "sggNm": j.get("sggNm", ""),
                "emdNm": j.get("emdNm", ""),
                "addrDetail": j.get("addrDetail", ""),
                # Juso API 좌표 (GRS80/TM → WGS84 변환 필요할 수 있음)
                "entX": entry_x,
                "entY": entry_y,
                # WGS84 좌표 (entX, entY가 있을 때 직접 사용)
                "lng": float(entry_x) if entry_x and entry_x != "0" else None,
                "lat": float(entry_y) if entry_y and entry_y != "0" else None,
            })

        # 좌표가 없는 항목은 Nominatim으로 좌표 보완
        for item in items:
            if not item["lat"] or not item["lng"]:
                coords = await _geocode_nominatim(item["roadAddr"])
                if coords:
                    item["lat"] = coords[0]
                    item["lng"] = coords[1]

        total_count = int(common.get("totalCount", 0))
        return {"items": items, "total": total_count}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"도로명주소 검색 오류: {e}")
        # Nominatim 대체
        try:
            return await _fallback_nominatim(keyword)
        except Exception:
            raise HTTPException(status_code=500, detail="주소 검색 서비스를 사용할 수 없습니다")


async def _geocode_nominatim(address: str) -> Optional[tuple[float, float]]:
    """OpenStreetMap Nominatim으로 주소 → 좌표 변환"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": address,
                    "format": "json",
                    "limit": "1",
                    "countrycodes": "kr",
                },
                headers={"User-Agent": "Waternix-Dashboard/1.0", "Accept-Language": "ko"},
            )
            data = resp.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None


async def _fallback_nominatim(keyword: str) -> dict:
    """Juso API 실패 시 Nominatim 검색으로 대체"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": f"{keyword}, 대한민국",
                    "format": "json",
                    "limit": "8",
                    "countrycodes": "kr",
                    "addressdetails": "1",
                },
                headers={"User-Agent": "Waternix-Dashboard/1.0", "Accept-Language": "ko"},
            )
            data = resp.json()
            items = []
            for d in data:
                addr = d.get("address", {})
                road = d.get("display_name", "")
                items.append({
                    "roadAddr": road,
                    "roadAddrPart1": road,
                    "zipNo": addr.get("postcode", ""),
                    "siNm": addr.get("city") or addr.get("province") or addr.get("state", ""),
                    "sggNm": addr.get("city_district") or addr.get("county", ""),
                    "emdNm": addr.get("suburb") or addr.get("neighbourhood", ""),
                    "lat": float(d["lat"]),
                    "lng": float(d["lon"]),
                })
            return {"items": items, "total": len(items)}
    except Exception:
        return {"items": [], "total": 0}
