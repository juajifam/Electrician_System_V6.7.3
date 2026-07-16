/* =========================================
   전기기능사 실습실 예약시스템 V6
   공통 유틸리티
========================================= */

"use strict";


/* =========================================
   공통 설정
========================================= */

const RESERVATION_CONFIG = {

    storageKey: "electricPracticeReservationsV6",

    workstationCount: 10,

    timeSlots: {

        morning: {
            key: "morning",
            label: "오전",
            timeText: "08:00~12:00"
        },

        afternoon: {
            key: "afternoon",
            label: "오후",
            timeText: "13:00~17:00"
        },

        full: {
            key: "full",
            label: "하루종일",
            timeText: "08:00~17:00"
        }

    }

};



/* =========================================
   날짜 관련
========================================= */

/**
 * 숫자를 두 자리 문자열로 변환
 * 예: 7 → "07"
 */
function padNumber(value){

    return String(value).padStart(2, "0");

}


/**
 * Date 객체를 YYYY-MM-DD 형식으로 변환
 * UTC가 아닌 휴대폰의 현재 지역 날짜를 사용
 */
function formatDateKey(date){

    if(!(date instanceof Date) || Number.isNaN(date.getTime())){

        return "";

    }

    const year = date.getFullYear();
    const month = padNumber(date.getMonth() + 1);
    const day = padNumber(date.getDate());

    return `${year}-${month}-${day}`;

}



/**
 * 여러 날짜 표기(YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD)를
 * YYYY-MM-DD 형식으로 통일한다.
 */
function normalizeDateKey(value){

    const text = cleanText(value);

    if(!text){
        return "";
    }

    const match = text.match(/^(\d{4})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})\.?$/);

    if(!match){
        return text;
    }

    const normalized = `${match[1]}-${padNumber(Number(match[2]))}-${padNumber(Number(match[3]))}`;

    return parseDateKey(normalized) ? normalized : text;
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
function getTodayKey(){

    return formatDateKey(new Date());

}


/**
 * YYYY-MM-DD 문자열을 Date 객체로 변환
 */
function parseDateKey(dateKey){

    if(typeof dateKey !== "string"){

        return null;

    }

    const match = dateKey.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if(!match){

        return null;

    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    const date = new Date(
        year,
        month,
        day
    );

    if(
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day
    ){

        return null;

    }

    return date;

}


/**
 * 날짜를 화면 표시용 형식으로 변환
 * 예: 2026년 7월 10일 (금)
 */
function formatKoreanDate(dateKey){

    const date = parseDateKey(dateKey);

    if(!date){

        return "-";

    }

    const weekdayNames = [
        "일",
        "월",
        "화",
        "수",
        "목",
        "금",
        "토"
    ];

    return (
        `${date.getFullYear()}년 ` +
        `${date.getMonth() + 1}월 ` +
        `${date.getDate()}일 ` +
        `(${weekdayNames[date.getDay()]})`
    );

}


/**
 * 날짜를 짧게 표시
 * 예: 07.10 (금)
 */
function formatShortDate(dateKey){

    const date = parseDateKey(dateKey);

    if(!date){

        return "-";

    }

    const weekdayNames = [
        "일",
        "월",
        "화",
        "수",
        "목",
        "금",
        "토"
    ];

    return (
        `${padNumber(date.getMonth() + 1)}.` +
        `${padNumber(date.getDate())} ` +
        `(${weekdayNames[date.getDay()]})`
    );

}


/**
 * 날짜가 오늘보다 이전인지 확인
 */
function isPastDate(dateKey){

    const targetDate = parseDateKey(dateKey);
    const today = parseDateKey(getTodayKey());

    if(!targetDate || !today){

        return false;

    }

    return targetDate.getTime() < today.getTime();

}


/**
 * 날짜 두 개를 비교
 */
function compareDateKeys(firstDateKey, secondDateKey){

    const firstDate = parseDateKey(firstDateKey);
    const secondDate = parseDateKey(secondDateKey);

    if(!firstDate && !secondDate){

        return 0;

    }

    if(!firstDate){

        return 1;

    }

    if(!secondDate){

        return -1;

    }

    return firstDate.getTime() - secondDate.getTime();

}



/* =========================================
   예약 시간 관련
========================================= */

/**
 * 시간 키를 한글 이름으로 변환
 */
function getTimeLabel(timeKey){

    const slot =
        RESERVATION_CONFIG.timeSlots[timeKey];

    return slot ? slot.label : "-";

}


/**
 * 시간 범위 표시
 */
function getTimeText(timeKey){

    const slot =
        RESERVATION_CONFIG.timeSlots[timeKey];

    return slot ? slot.timeText : "-";

}


/**
 * 기존 저장 데이터의 시간 형식을
 * V6 시간 키로 변환
 */
function normalizeTimeKey(value){

    const text =
        String(value || "")
        .trim()
        .toLowerCase();

    if(
        text === "morning" ||
        text === "오전"
    ){

        return "morning";

    }

    if(
        text === "afternoon" ||
        text === "오후"
    ){

        return "afternoon";

    }

    if(
        text === "full" ||
        text === "하루종일" ||
        text === "종일"
    ){

        return "full";

    }

    return "";

}


/**
 * 두 예약 시간이 충돌하는지 확인
 */
function isTimeConflict(firstTime, secondTime){

    const first =
        normalizeTimeKey(firstTime);

    const second =
        normalizeTimeKey(secondTime);

    if(!first || !second){

        return false;

    }

    if(
        first === "full" ||
        second === "full"
    ){

        return true;

    }

    return first === second;

}



/* =========================================
   문자열 관련
========================================= */

/**
 * 문자열 앞뒤 공백 제거
 */
function cleanText(value){

    return String(value || "").trim();

}


/**
 * HTML 특수문자 변환
 */
function escapeHTML(value){

    return cleanText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/**
 * 검색용 문자열 변환
 */
function normalizeSearchText(value){

    return cleanText(value)
        .toLowerCase()
        .replace(/\s+/g, "");

}


/**
 * 연락처 숫자 중심 정리
 */
function normalizePhone(value){

    return cleanText(value)
        .replace(/[^0-9]/g, "");

}


/**
 * 화면 표시용 연락처 형식
 */
function formatPhone(value){

    const phone = normalizePhone(value);

    if(phone.length === 11){

        return (
            `${phone.slice(0, 3)}-` +
            `${phone.slice(3, 7)}-` +
            `${phone.slice(7)}`
        );

    }

    if(phone.length === 10){

        return (
            `${phone.slice(0, 3)}-` +
            `${phone.slice(3, 6)}-` +
            `${phone.slice(6)}`
        );

    }

    return phone || "-";

}



/* =========================================
   예약 데이터 관련
========================================= */

/**
 * 예약 고유 ID 생성
 */
function createReservationId(){

    return (
        "reservation-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );

}


/**
 * 작업대 번호 정상화
 */
function normalizeStation(value){

    const station = Number(value);

    if(
        Number.isInteger(station) &&
        station >= 1 &&
        station <= RESERVATION_CONFIG.workstationCount
    ){

        return station;

    }

    return 0;

}


/**
 * 군번 표준화
 */
function normalizeMilitaryId(value){

    return cleanText(value)
        /* 휴대폰 키보드에서 입력되는 다양한 하이픈 문자를 일반 - 로 통일 */
        .replace(/[‐‑‒–—―−﹘﹣－]/g, "-")
        .replace(/\s+/g, "")
        .replace(/[^0-9-]/g, "");

}


/**
 * 군번 비교용 표준화
 * 저장 형식은 유지하고 비교할 때만 하이픈을 제거한다.
 */
function normalizeMilitaryIdForCompare(value){

    return normalizeMilitaryId(value)
        .replace(/-/g, "");

}


/**
 * 이전 버전 예약 데이터를
 * V6 형식으로 변환
 */
function normalizeReservation(item){

    const source =
        item && typeof item === "object"
        ? item
        : {};

    const id =
        cleanText(source.id) ||
        createReservationId();

    const rank =
        cleanText(source.rank);

    const militaryId =
        normalizeMilitaryId(
            source.militaryId ||
            source.serviceNumber ||
            source.armyNumber ||
            ""
        );

    const name =
        cleanText(
            source.name ||
            source.userName
        );

    const unit =
        cleanText(
            source.unit ||
            source.department
        );

    const phone =
        normalizePhone(
            source.phone ||
            source.contact ||
            source.militaryId
        );

    const date =
        normalizeDateKey(
            source.date ||
            source.reservationDate
        );

    const time =
        normalizeTimeKey(
            source.time ||
            source.timeSlot
        );

    const station =
        normalizeStation(
            source.station ||
            source.workstation
        );

    const createdAt =
        cleanText(source.createdAt) ||
        new Date().toISOString();

    return {

        id: id,

        rank: rank,

        militaryId: militaryId,

        name: name,

        unit: unit,

        phone: phone,

        date: date,

        time: time,

        station: station,

        createdAt: createdAt

    };

}


/**
 * 예약 데이터가 정상적인지 확인
 */
function isValidReservation(item){

    if(!item){

        return false;

    }

    return Boolean(

        cleanText(item.id) &&
        cleanText(item.name) &&
        cleanText(item.unit) &&
        normalizePhone(item.phone) &&
        parseDateKey(item.date) &&
        normalizeTimeKey(item.time) &&
        normalizeStation(item.station)

    );

}


/**
 * 예약 정렬
 * 날짜 → 시간 → 작업대 순서
 */
function sortReservations(data){

    const timeOrder = {
        morning: 1,
        afternoon: 2,
        full: 3
    };

    return [...data].sort(
        (first, second)=>{

            const dateCompare =
                compareDateKeys(
                    first.date,
                    second.date
                );

            if(dateCompare !== 0){

                return dateCompare;

            }

            const firstTimeOrder =
                timeOrder[normalizeTimeKey(first.time)] || 9;

            const secondTimeOrder =
                timeOrder[normalizeTimeKey(second.time)] || 9;

            if(firstTimeOrder !== secondTimeOrder){

                return firstTimeOrder - secondTimeOrder;

            }

            return (
                normalizeStation(first.station) -
                normalizeStation(second.station)
            );

        }
    );

}


/**
 * 예약 목록에서 검색
 */
function searchReservations(data, keyword){

    const searchKeyword =
        normalizeSearchText(keyword);

    if(!searchKeyword){

        return [];

    }

    return data.filter(
        item=>{

            const targetText =
                normalizeSearchText(
                    [
                        item.rank,
                        item.militaryId,
                        item.name,
                        item.unit,
                        item.phone,
                        item.date,
                        getTimeLabel(item.time),
                        `${item.station}번`
                    ].join(" ")
                );

            return targetText.includes(searchKeyword);

        }
    );

}



/* =========================================
   DOM 관련
========================================= */

/**
 * ID로 요소 가져오기
 */
function getElement(id){

    return document.getElementById(id);

}


/**
 * 요소의 내용 비우기
 */
function clearElement(element){

    if(element){

        element.innerHTML = "";

    }

}


/**
 * 요소 표시
 */
function showElement(element){

    if(element){

        element.hidden = false;

    }

}


/**
 * 요소 숨기기
 */
function hideElement(element){

    if(element){

        element.hidden = true;

    }

}



/* =========================================
   전역 공개
========================================= */

window.RESERVATION_CONFIG =
    RESERVATION_CONFIG;

window.padNumber =
    padNumber;

window.formatDateKey =
    formatDateKey;

window.getTodayKey =
    getTodayKey;

window.parseDateKey =
    parseDateKey;

window.formatKoreanDate =
    formatKoreanDate;

window.formatShortDate =
    formatShortDate;

window.isPastDate =
    isPastDate;

window.compareDateKeys =
    compareDateKeys;

window.getTimeLabel =
    getTimeLabel;

window.getTimeText =
    getTimeText;

window.normalizeTimeKey =
    normalizeTimeKey;

window.isTimeConflict =
    isTimeConflict;

window.cleanText =
    cleanText;

window.escapeHTML =
    escapeHTML;

window.normalizeSearchText =
    normalizeSearchText;

window.normalizePhone =
    normalizePhone;

window.formatPhone =
    formatPhone;

window.createReservationId =
    createReservationId;

window.normalizeStation =
    normalizeStation;

window.normalizeReservation =
    normalizeReservation;

window.isValidReservation =
    isValidReservation;

window.sortReservations =
    sortReservations;

window.searchReservations =
    searchReservations;

window.getElement =
    getElement;

window.clearElement =
    clearElement;

window.showElement =
    showElement;

window.hideElement =
    hideElement;