/* =========================================
   전기기능사 실습실 예약·관리 시스템 V6.4.2
   예약 및 공지사항 저장 관리
========================================= */

"use strict";


/* =========================================
   저장 키
========================================= */

const STORAGE_KEY =
    RESERVATION_CONFIG.storageKey;


const NOTICE_STORAGE_KEY =
    "electricPracticeNoticesV61";




/* =========================================
   예약 데이터 메모리 캐시 (V6.4.2 안정화)
========================================= */

let reservationCacheRaw = null;
let reservationCacheData = null;

function clearReservationCache(){
    reservationCacheRaw = null;
    reservationCacheData = null;
}

function setReservationCache(rawData, normalizedData){
    reservationCacheRaw = rawData;
    reservationCacheData = Array.isArray(normalizedData)
        ? normalizedData
        : [];
}

const LEGACY_STORAGE_KEYS = [

    "reservations",

    "electricPracticeReservations",

    "electricPracticeReservationsV5"

];



/* =========================================
   기본 공지사항
========================================= */

const DEFAULT_NOTICES = [

    {
        id:"notice-1",
        type:"guide",
        text:"사용 후 작업대 및 주변 정리정돈을 철저히 해주세요."
    },

    {
        id:"notice-2",
        type:"guide",
        text:"공구 및 자재는 사용 후 반드시 지정된 위치에 원위치해 주세요."
    },

    {
        id:"notice-3",
        type:"general",
        text:"기자재 이상 또는 파손 발견 시 즉시 관리자에게 알려주세요."
    },

    {
        id:"notice-4",
        type:"important",
        text:"무단 사용, 예약 후 미사용 또는 이용수칙 위반 시 사용이 제한될 수 있습니다."
    },

    {
        id:"notice-5",
        type:"general",
        text:"퇴실 전 전원 차단과 작업대 정리상태를 반드시 확인해 주세요."
    }

];



/* =========================================
   공통 저장 데이터 읽기
========================================= */

/**
 * LocalStorage에서 배열 형태 데이터 읽기
 */
function readStorageArray(storageKey){

    try{

        const rawData =
            localStorage.getItem(
                storageKey
            );


        if(!rawData){

            return [];

        }


        const parsedData =
            JSON.parse(rawData);


        return Array.isArray(parsedData)
            ? parsedData
            : [];

    }catch(error){

        console.error(
            `저장 데이터 읽기 오류: ${storageKey}`,
            error
        );

        return [];

    }

}



/* =========================================
   예약 데이터 보정
========================================= */

/**
 * 예약 배열을 V6.4.2 구조로 변환
 */
function normalizeReservationArray(data){

    if(!Array.isArray(data)){

        return [];

    }


    const normalizedData =
        data
        .map(item=>
            normalizeReservation(item)
        )
        .filter(item=>
            isValidReservation(item)
        );


    return removeDuplicateReservations(
        sortReservations(
            normalizedData
        )
    );

}



/**
 * 중복 예약 데이터 제거
 */
function removeDuplicateReservations(data){

    const usedKeys =
        new Set();


    return data.filter(item=>{

        const duplicateKey = [

            cleanText(item.id),

            cleanText(item.date),

            normalizeTimeKey(item.time),

            normalizeStation(item.station),

            normalizeMilitaryId(item.militaryId),

            normalizeSearchText(item.name),

            normalizePhone(item.phone)

        ].join("|");


        if(usedKeys.has(duplicateKey)){

            return false;

        }


        usedKeys.add(
            duplicateKey
        );


        return true;

    });

}



/* =========================================
   기존 버전 예약 가져오기
========================================= */

function migrateLegacyReservations(){

    let legacyData = [];


    LEGACY_STORAGE_KEYS.forEach(
        storageKey=>{

            const data =
                readStorageArray(
                    storageKey
                );


            if(data.length > 0){

                legacyData =
                    legacyData.concat(
                        data
                    );

            }

        }
    );


    return normalizeReservationArray(
        legacyData
    );

}



/* =========================================
   예약 데이터 불러오기
========================================= */

function loadReservations(){

    const rawCurrentData =
        localStorage.getItem(STORAGE_KEY);


    if(rawCurrentData !== null){

        if(
            reservationCacheData !== null &&
            reservationCacheRaw === rawCurrentData
        ){
            return reservationCacheData.slice();
        }

        let parsedData = [];

        try{
            const parsed = JSON.parse(rawCurrentData);
            parsedData = Array.isArray(parsed) ? parsed : [];
        }catch(error){
            console.error("예약 데이터 읽기 오류", error);
        }

        const normalizedCurrentData =
            normalizeReservationArray(parsedData);

        const normalizedRaw =
            JSON.stringify(normalizedCurrentData);

        /* 실제 보정이 필요할 때만 localStorage에 다시 기록한다. */
        if(normalizedRaw !== rawCurrentData){
            try{
                localStorage.setItem(STORAGE_KEY, normalizedRaw);
            }catch(error){
                console.error("예약 데이터 정리 저장 오류", error);
            }
        }

        setReservationCache(normalizedRaw, normalizedCurrentData);

        return normalizedCurrentData.slice();
    }


    /* 현재 버전 키가 아예 없을 때에만 1회 구버전 데이터를 이전 */
    const migratedData =
        migrateLegacyReservations();


    saveReservations(migratedData);


    return migratedData.slice();

}


/* =========================================
   예약 데이터 저장
========================================= */

function saveReservations(data){

    const normalizedData =
        normalizeReservationArray(data);

    const rawData =
        JSON.stringify(normalizedData);

    try{

        localStorage.setItem(STORAGE_KEY, rawData);

        setReservationCache(rawData, normalizedData);

        return true;

    }catch(error){

        console.error("예약 데이터 저장 오류", error);

        clearReservationCache();

        return false;

    }

}


/* =========================================
   예약 추가
========================================= */

function addStoredReservation(
    reservation
){

    const normalizedReservation =
        normalizeReservation(
            reservation
        );


    if(
        !isValidReservation(
            normalizedReservation
        )
    ){

        return {

            success:false,

            message:
                "예약 정보가 올바르지 않습니다.",

            reservation:null

        };

    }


    const reservations =
        loadReservations();


    reservations.push(
        normalizedReservation
    );


    const saved =
        saveReservations(
            reservations
        );


    return {

        success:saved,

        message:saved
            ? "예약이 저장되었습니다."
            : "예약 저장에 실패했습니다.",

        reservation:saved
            ? normalizedReservation
            : null

    };

}



/* =========================================
   예약 삭제
========================================= */

function deleteStoredReservation(
    reservationId
){

    const targetId =
        cleanText(
            reservationId
        );


    if(!targetId){

        return false;

    }


    const reservations =
        loadReservations();


    const filteredData =
        reservations.filter(
            item=>
                cleanText(item.id) !==
                targetId
        );


    if(
        filteredData.length ===
        reservations.length
    ){

        return false;

    }


    return saveReservations(
        filteredData
    );

}



/* =========================================
   예약 수정
========================================= */

function updateStoredReservation(
    reservationId,
    updateData
){

    const targetId =
        cleanText(
            reservationId
        );


    if(!targetId){

        return {

            success:false,

            reservation:null

        };

    }


    const reservations =
        loadReservations();


    let updatedReservation =
        null;


    const updatedData =
        reservations.map(item=>{

            if(
                cleanText(item.id) !==
                targetId
            ){

                return item;

            }


            const mergedData =
                normalizeReservation({

                    ...item,

                    ...updateData,

                    id:item.id

                });


            if(
                !isValidReservation(
                    mergedData
                )
            ){

                return item;

            }


            updatedReservation =
                mergedData;


            return mergedData;

        });


    if(!updatedReservation){

        return {

            success:false,

            reservation:null

        };

    }


    const saved =
        saveReservations(
            updatedData
        );


    return {

        success:saved,

        reservation:saved
            ? updatedReservation
            : null

    };

}



/* =========================================
   기간 예약 완전 삭제
========================================= */

/**
 * 현재 버전 및 이전 버전 저장 키에서 지정 기간의 예약을 모두 삭제한다.
 * 반환값에는 실제 삭제 건수와 삭제 후 남아 있는 대상 예약 수가 포함된다.
 */
function deleteStoredReservationsByDateRange(startDate, endDate){

    const start = normalizeDateKey(startDate);
    const end = normalizeDateKey(endDate);

    if(!parseDateKey(start) || !parseDateKey(end) || start > end){
        return {
            success:false,
            deletedCount:0,
            remainingTargetCount:0
        };
    }

    const storageKeys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
    let deletedCount = 0;

    try{

        storageKeys.forEach(storageKey=>{

            if(localStorage.getItem(storageKey) === null){
                return;
            }

            const original = readStorageArray(storageKey);

            const remaining = original.filter(item=>{
                const itemDate = normalizeDateKey(
                    item && (item.date || item.reservationDate)
                );
                const isTarget = itemDate >= start && itemDate <= end;
                if(isTarget){
                    deletedCount += 1;
                }
                return !isTarget;
            });

            if(storageKey === STORAGE_KEY){
                const normalizedRemaining =
                    normalizeReservationArray(remaining);
                const rawRemaining =
                    JSON.stringify(normalizedRemaining);

                localStorage.setItem(storageKey, rawRemaining);
                setReservationCache(rawRemaining, normalizedRemaining);
            }else{
                localStorage.setItem(storageKey, JSON.stringify(remaining));
            }
        });

        /* 현재 키가 없더라도 빈 배열을 기록해 구버전 데이터 재이전을 차단 */
        if(localStorage.getItem(STORAGE_KEY) === null){
            localStorage.setItem(STORAGE_KEY, "[]");
            setReservationCache("[]", []);
        }

        /* 재이전·재정규화를 유발하지 않고 현재 저장 결과만 검증한다. */
        const remainingTargetCount =
            readStorageArray(STORAGE_KEY).reduce((count, item)=>{
                const itemDate = normalizeDateKey(item && item.date);
                return count + (itemDate >= start && itemDate <= end ? 1 : 0);
            }, 0);

        return {
            success:remainingTargetCount === 0,
            deletedCount,
            remainingTargetCount
        };

    }catch(error){
        console.error("기간 예약 삭제 오류", error);
        return {
            success:false,
            deletedCount,
            remainingTargetCount:-1
        };
    }
}


/* =========================================
   예약 조회
========================================= */

function getAllStoredReservations(){

    return loadReservations();

}



function getStoredReservationsByDate(
    dateKey
){

    const targetDate =
        cleanText(
            dateKey
        );


    return loadReservations()
        .filter(item=>
            item.date ===
            targetDate
        );

}



function getStoredReservationsByStation(
    dateKey,
    station
){

    const targetDate =
        cleanText(
            dateKey
        );


    const targetStation =
        normalizeStation(
            station
        );


    return loadReservations()
        .filter(item=>

            item.date === targetDate &&

            item.station === targetStation

        );

}



function getTodayStoredReservations(){

    return getStoredReservationsByDate(
        getTodayKey()
    );

}



function getMyStoredReservations(
    militaryId,
    name
){

    const targetMilitaryId =
        normalizeMilitaryIdForCompare(militaryId);

    const targetName =
        normalizeSearchText(name);


    if(!targetMilitaryId || !targetName){

        return [];

    }


    return loadReservations()
        .filter(item=>
            normalizeMilitaryIdForCompare(item.militaryId) === targetMilitaryId &&
            normalizeSearchText(item.name) === targetName
        );

}



function findStoredReservations(
    keyword
){

    return searchReservations(

        loadReservations(),

        keyword

    );

}



/* =========================================
   예약 충돌 확인
========================================= */

function hasReservationConflict(
    dateKey,
    timeKey,
    station,
    excludeReservationId=""
){

    const targetDate =
        cleanText(
            dateKey
        );


    const targetTime =
        normalizeTimeKey(
            timeKey
        );


    const targetStation =
        normalizeStation(
            station
        );


    const excludedId =
        cleanText(
            excludeReservationId
        );


    if(
        !parseDateKey(targetDate) ||
        !targetTime ||
        !targetStation
    ){

        return false;

    }


    return loadReservations()
        .some(item=>{


            if(
                excludedId &&
                cleanText(item.id) ===
                excludedId
            ){

                return false;

            }


            if(

                item.date !== targetDate ||

                item.station !== targetStation

            ){

                return false;

            }


            return isTimeConflict(

                item.time,

                targetTime

            );

        });

}



/* =========================================
   예약 통계
========================================= */

function getReservationStatistics(
    selectedDate=""
){

    const reservations =
        loadReservations();


    const todayKey =
        getTodayKey();


    const selectedDateKey =
        cleanText(
            selectedDate
        );


    return {

        total:
            reservations.length,

        today:
            reservations.filter(
                item=>
                    item.date === todayKey
            ).length,

        selected:
            selectedDateKey
                ? reservations.filter(
                    item=>
                        item.date ===
                        selectedDateKey
                ).length
                : 0

    };

}



/* =========================================
   월별 예약 건수
========================================= */

function getMonthlyReservationCount(
    year,
    monthIndex
){

    const targetYear =
        Number(year);


    const targetMonth =
        Number(monthIndex);


    if(
        !Number.isInteger(targetYear) ||
        !Number.isInteger(targetMonth)
    ){

        return {};

    }


    const countMap = {};


    loadReservations()
        .forEach(item=>{


            const date =
                parseDateKey(
                    item.date
                );


            if(!date){

                return;

            }


            if(

                date.getFullYear() !==
                    targetYear ||

                date.getMonth() !==
                    targetMonth

            ){

                return;

            }


            countMap[item.date] =
                (
                    countMap[item.date] ||
                    0
                ) + 1;

        });


    return countMap;

}



/* =========================================
   예약 전체 삭제
========================================= */

function clearAllStoredReservations(){

    try{

        localStorage.removeItem(
            STORAGE_KEY
        );


        return true;

    }catch(error){

        console.error(
            "전체 예약 삭제 오류",
            error
        );


        return false;

    }

}



/* =========================================
   공지 종류 보정
========================================= */

function normalizeNoticeType(type){

    const noticeType =
        cleanText(type)
        .toLowerCase();


    if(
        noticeType === "important" ||
        noticeType === "guide" ||
        noticeType === "general"
    ){

        return noticeType;

    }


    return "general";

}



/* =========================================
   공지 한 건 보정
========================================= */

function normalizeNotice(
    notice,
    index=0
){

    const source =
        notice &&
        typeof notice === "object"
            ? notice
            : {};


    return {

        id:
            cleanText(source.id) ||
            `notice-${index + 1}`,

        type:
            normalizeNoticeType(
                source.type
            ),

        text:
            cleanText(
                source.text
            )

    };

}



/* =========================================
   공지 배열 보정
========================================= */

function normalizeNoticeArray(
    notices
){

    if(!Array.isArray(notices)){

        return [];

    }


    return notices
        .slice(0, 5)
        .map(
            (notice, index)=>
                normalizeNotice(
                    notice,
                    index
                )
        )
        .filter(notice=>
            Boolean(notice.text)
        );

}



/* =========================================
   공지사항 저장
========================================= */

function saveNotices(
    notices
){

    const normalizedNotices =
        normalizeNoticeArray(
            notices
        );


    try{

        localStorage.setItem(

            NOTICE_STORAGE_KEY,

            JSON.stringify(
                normalizedNotices
            )

        );


        return true;

    }catch(error){

        console.error(
            "공지사항 저장 오류",
            error
        );


        return false;

    }

}



/* =========================================
   공지사항 불러오기
========================================= */

function loadNotices(){

    const storedNotices =
        readStorageArray(
            NOTICE_STORAGE_KEY
        );


    const normalizedNotices =
        normalizeNoticeArray(
            storedNotices
        );


    /*
     저장된 공지가 있으면 그대로 사용
    */
    if(normalizedNotices.length > 0){

        return normalizedNotices;

    }


    /*
     저장된 공지가 없으면 기본 공지 저장
    */
    const defaultNotices =
        DEFAULT_NOTICES.map(
            (notice, index)=>
                normalizeNotice(
                    notice,
                    index
                )
        );


    saveNotices(
        defaultNotices
    );


    return defaultNotices;

}



/* =========================================
   기본 공지사항 가져오기
========================================= */

function getDefaultNotices(){

    return DEFAULT_NOTICES.map(
        (notice, index)=>
            normalizeNotice(
                notice,
                index
            )
    );

}



/* =========================================
   공지사항 기본내용 복원
========================================= */

function resetNoticesToDefault(){

    const defaultNotices =
        getDefaultNotices();


    const saved =
        saveNotices(
            defaultNotices
        );


    return {

        success:saved,

        notices:saved
            ? defaultNotices
            : []

    };

}



/* =========================================
   공지사항 전체 삭제
========================================= */

function clearStoredNotices(){

    try{

        localStorage.removeItem(
            NOTICE_STORAGE_KEY
        );


        return true;

    }catch(error){

        console.error(
            "공지사항 삭제 오류",
            error
        );


        return false;

    }

}



/* =========================================
   전역 공개
========================================= */

window.loadReservations =
    loadReservations;


window.saveReservations =
    saveReservations;


window.addStoredReservation =
    addStoredReservation;


window.deleteStoredReservation =
    deleteStoredReservation;


window.updateStoredReservation =
    updateStoredReservation;


window.clearReservationCache = clearReservationCache;

window.getAllStoredReservations =
    getAllStoredReservations;


window.getStoredReservationsByDate =
    getStoredReservationsByDate;


window.getStoredReservationsByStation =
    getStoredReservationsByStation;


window.getTodayStoredReservations =
    getTodayStoredReservations;


window.getMyStoredReservations =
    getMyStoredReservations;


window.findStoredReservations =
    findStoredReservations;


window.hasReservationConflict =
    hasReservationConflict;


window.getReservationStatistics =
    getReservationStatistics;


window.getMonthlyReservationCount =
    getMonthlyReservationCount;


window.clearAllStoredReservations =
    clearAllStoredReservations;


window.DEFAULT_NOTICES =
    DEFAULT_NOTICES;


window.normalizeNoticeType =
    normalizeNoticeType;


window.normalizeNotice =
    normalizeNotice;


window.normalizeNoticeArray =
    normalizeNoticeArray;


window.saveNotices =
    saveNotices;


window.loadNotices =
    loadNotices;


window.getDefaultNotices =
    getDefaultNotices;


window.resetNoticesToDefault =
    resetNoticesToDefault;


window.clearStoredNotices =
    clearStoredNotices;