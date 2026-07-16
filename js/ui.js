/* =========================================
   전기기능사 실습실 예약·관리 시스템 V6.4.2
   사용자 화면 출력 관리
========================================= */

"use strict";


/* =========================================
   시간 표시용 클래스
========================================= */

function getTimeBadgeClass(timeKey){

    const normalizedTime =
        normalizeTimeKey(timeKey);

    if(normalizedTime === "morning"){

        return "morning";

    }

    if(normalizedTime === "afternoon"){

        return "afternoon";

    }

    if(normalizedTime === "full"){

        return "full";

    }

    return "";

}



/* =========================================
   예약 카드 생성
========================================= */

function createReservationItemHTML(
    reservation,
    options={}
){

    const item =
        normalizeReservation(
            reservation
        );


    const showDate =
        options.showDate === true;


    const showPhone =
        options.showPhone === true;


    const showCancel =
        options.showCancel === true;


    const cancelButtonText =
        cleanText(
            options.cancelButtonText
        ) || "취소";


    const timeClass =
        getTimeBadgeClass(
            item.time
        );


    const rankName =
        [
            cleanText(item.rank),
            cleanText(item.name)
        ]
        .filter(Boolean)
        .join(" ");


    const personText =
        rankName ||
        item.name ||
        "-";


    const detailParts = [];


    if(showDate){

        detailParts.push(
            formatShortDate(
                item.date
            )
        );

    }


    detailParts.push(
        item.unit || "-"
    );


    if(showPhone){

        if(item.militaryId){
            detailParts.push(`군번 ${item.militaryId}`);
        }

        detailParts.push(
            formatPhone(
                item.phone
            )
        );

    }


    const detailText =
        detailParts.join(" · ");


    const rightContentHTML =
        showCancel
            ? `
                <button
                    type="button"
                    class="cancel-button"
                    data-reservation-id="${escapeHTML(item.id)}"
                >
                    ${escapeHTML(cancelButtonText)}
                </button>
            `
            : `
                <span class="reservation-station">
                    ${item.station}번
                </span>
            `;


    return `
        <article
            class="reservation-item"
            data-reservation-id="${escapeHTML(item.id)}"
        >

            <span
                class="reservation-time-badge ${timeClass}"
            >
                ${escapeHTML(
                    getTimeLabel(item.time)
                )}
            </span>


            <div class="reservation-main-info">

                <strong>
                    ${escapeHTML(personText)}
                </strong>

                <span>
                    ${escapeHTML(detailText)}
                    ·
                    ${item.station}번 작업대
                </span>

            </div>


            ${rightContentHTML}

        </article>
    `;

}



/* =========================================
   빈 화면 표시
========================================= */

function renderEmptyMessage(
    container,
    message
){

    if(!container){

        return;

    }


    container.innerHTML = `
        <div class="empty-message">
            ${escapeHTML(message)}
        </div>
    `;

}



/* =========================================
   예약 현황 통계
========================================= */

function renderReservationStatistics(
    selectedDate=""
){

    const statistics =
        getReservationStatistics(
            selectedDate
        );


    const totalElement =
        getElement(
            "totalReservationCount"
        );


    const todayElement =
        getElement(
            "todayReservationCount"
        );


    const selectedElement =
        getElement(
            "selectedDateReservationCount"
        );


    if(totalElement){

        totalElement.textContent =
            String(
                statistics.total
            );

    }


    if(todayElement){

        todayElement.textContent =
            String(
                statistics.today
            );

    }


    if(selectedElement){

        selectedElement.textContent =
            String(
                statistics.selected
            );

    }

}



/* =========================================
   선택 날짜 예약 현황
========================================= */

function renderSelectedDateReservations(
    dateKey
){

    const listElement =
        getElement(
            "reservationList"
        );


    const titleElement =
        getElement(
            "selectedDateTitle"
        );


    const selectedDate =
        cleanText(
            dateKey
        );


    renderReservationStatistics(
        selectedDate
    );


    if(!selectedDate){

        if(titleElement){

            titleElement.textContent =
                "날짜를 선택하면 예약 현황이 표시됩니다.";

        }


        renderEmptyMessage(
            listElement,
            "선택한 날짜가 없습니다."
        );


        return;

    }


    if(titleElement){

        titleElement.textContent =
            formatKoreanDate(
                selectedDate
            );

    }


    const reservations =
        sortReservations(
            getStoredReservationsByDate(
                selectedDate
            )
        );


    if(reservations.length === 0){

        renderEmptyMessage(
            listElement,
            "선택한 날짜에 예약이 없습니다."
        );


        return;

    }


    listElement.innerHTML =
        reservations
        .map(item=>
            createReservationItemHTML(
                item,
                {
                    showDate:false,
                    showPhone:false,
                    showCancel:false
                }
            )
        )
        .join("");

}



/* =========================================
   전체 예약 목록
========================================= */

function renderAllReservations(
    containerId="reservationList"
){

    const container =
        getElement(
            containerId
        );


    if(!container){

        return;

    }


    const reservations =
        sortReservations(
            getAllStoredReservations()
        );


    if(reservations.length === 0){

        renderEmptyMessage(
            container,
            "저장된 예약이 없습니다."
        );


        return;

    }


    container.innerHTML =
        reservations
        .map(item=>
            createReservationItemHTML(
                item,
                {
                    showDate:true,
                    showPhone:false,
                    showCancel:false
                }
            )
        )
        .join("");

}



/* =========================================
   나의 예약 결과
========================================= */

function renderMyReservationResult(
    reservations
){

    const container =
        getElement(
            "myReservationResult"
        );


    if(!container){

        return;

    }


    const data =
        Array.isArray(reservations)
            ? sortReservations(
                reservations
            )
            : [];


    if(data.length === 0){

        renderEmptyMessage(
            container,
            "조회된 예약이 없습니다."
        );


        return;

    }


    container.innerHTML =
        data
        .map(item=>
            createReservationItemHTML(
                item,
                {
                    showDate:true,
                    showPhone:false,
                    showCancel:true,
                    cancelButtonText:
                        "예약취소"
                }
            )
        )
        .join("");

}



/* =========================================
   나의 예약 조회 결과 닫기
========================================= */

function clearMyReservationResult(){

    const nameInput =
        getElement(
            "myReservationName"
        );


    const militaryIdInput =
        getElement(
            "myReservationMilitaryId"
        );


    const resultElement =
        getElement(
            "myReservationResult"
        );


    if(nameInput){

        nameInput.value = "";

    }


    if(militaryIdInput){

        militaryIdInput.value = "";

    }


    if(resultElement){

        resultElement.innerHTML = "";

    }

}



/* =========================================
   공지사항 종류 클래스
========================================= */

function getNoticeClass(type){

    const noticeType =
        normalizeNoticeType(
            type
        );


    if(noticeType === "important"){

        return "important";

    }


    if(noticeType === "guide"){

        return "guide";

    }


    return "general";

}



/* =========================================
   공지사항 종류 이름
========================================= */

function getNoticeTypeLabel(type){

    const noticeType =
        normalizeNoticeType(
            type
        );


    if(noticeType === "important"){

        return "중요";

    }


    if(noticeType === "guide"){

        return "안내";

    }


    return "일반";

}



/* =========================================
   공지사항 한 건 HTML 생성
========================================= */

function createNoticeItemHTML(
    notice
){

    const item =
        normalizeNotice(
            notice
        );


    const noticeClass =
        getNoticeClass(
            item.type
        );


    const typeLabel =
        getNoticeTypeLabel(
            item.type
        );


    return `
        <article
            class="notice-item ${noticeClass}"
            title="${escapeHTML(typeLabel)}"
        >
            <span>
                ${escapeHTML(item.text)}
            </span>
        </article>
    `;

}



/* =========================================
   사용자 화면 공지사항 표시
========================================= */

function renderNotices(){

    const noticeList =
        getElement(
            "noticeList"
        );


    if(!noticeList){

        return;

    }


    const notices =
        loadNotices();


    if(
        !Array.isArray(notices) ||
        notices.length === 0
    ){

        noticeList.innerHTML = `
            <div class="notice-empty-message">
                등록된 공지사항이 없습니다.
            </div>
        `;


        return;

    }


    noticeList.innerHTML =
        notices
        .map(
            createNoticeItemHTML
        )
        .join("");

}



/* =========================================
   선택 날짜 화면 새로고침
========================================= */

function refreshReservationDisplay(){

    const selectedDateInput =
        getElement(
            "selectedDate"
        );


    const selectedDate =
        selectedDateInput
            ? selectedDateInput.value
            : "";


    renderSelectedDateReservations(
        selectedDate
    );


    renderReservationStatistics(
        selectedDate
    );

}



/* =========================================
   알림 메시지
========================================= */

function showMessage(
    message,
    type="info"
){

    const text =
        cleanText(
            message
        );


    if(!text){

        return;

    }


    if(type === "error"){

        alert(
            `오류: ${text}`
        );


        return;

    }


    alert(text);

}



/* =========================================
   날짜별 작업대 상태 계산
========================================= */

function getWorkstationStatusMap(
    dateKey
){

    const statusMap = {};


    for(
        let station=1;
        station<=
            RESERVATION_CONFIG
            .workstationCount;
        station++
    ){

        statusMap[station] = {

            morning:false,

            afternoon:false,

            full:false

        };

    }


    const reservations =
        getStoredReservationsByDate(
            dateKey
        );


    reservations.forEach(item=>{

        const station =
            normalizeStation(
                item.station
            );


        const time =
            normalizeTimeKey(
                item.time
            );


        if(
            !station ||
            !statusMap[station]
        ){

            return;

        }


        if(time === "morning"){

            statusMap[station]
                .morning = true;

        }


        if(time === "afternoon"){

            statusMap[station]
                .afternoon = true;

        }


        if(time === "full"){

            statusMap[station]
                .full = true;


            statusMap[station]
                .morning = true;


            statusMap[station]
                .afternoon = true;

        }

    });


    return statusMap;

}



/* =========================================
   달력 예약 상태 등급
========================================= */

function getCalendarReservationLevel(
    reservationCount
){

    const count =
        Number(
            reservationCount
        ) || 0;


    const maximumReservations =
        RESERVATION_CONFIG
        .workstationCount * 2;


    if(count <= 0){

        return "";

    }


    if(
        count <
        maximumReservations * .4
    ){

        return "low-reservation";

    }


    if(
        count <
        maximumReservations
    ){

        return "medium-reservation";

    }


    return "full-reservation";

}



/* =========================================
   사용자 화면 초기화
========================================= */

function initializeUI(){

    renderReservationStatistics(
        ""
    );


    renderEmptyMessage(
        getElement(
            "reservationList"
        ),
        "날짜를 선택하면 예약 현황이 표시됩니다."
    );


    renderNotices();

}



/* =========================================
   전역 공개
========================================= */

window.getTimeBadgeClass =
    getTimeBadgeClass;


window.createReservationItemHTML =
    createReservationItemHTML;


window.renderEmptyMessage =
    renderEmptyMessage;


window.renderReservationStatistics =
    renderReservationStatistics;


window.renderSelectedDateReservations =
    renderSelectedDateReservations;


window.renderAllReservations =
    renderAllReservations;


window.renderMyReservationResult =
    renderMyReservationResult;


window.clearMyReservationResult =
    clearMyReservationResult;


window.getNoticeClass =
    getNoticeClass;


window.getNoticeTypeLabel =
    getNoticeTypeLabel;


window.createNoticeItemHTML =
    createNoticeItemHTML;


window.renderNotices =
    renderNotices;


window.refreshReservationDisplay =
    refreshReservationDisplay;


window.showMessage =
    showMessage;


window.getWorkstationStatusMap =
    getWorkstationStatusMap;


window.getCalendarReservationLevel =
    getCalendarReservationLevel;


window.initializeUI =
    initializeUI;