/* =========================================
   전기기능사 실습실 예약·관리 시스템 V6.6
   사용자 화면 전체 실행
========================================= */

"use strict";


/* =========================================
   사용 시간 선택
========================================= */

function selectTimeSlot(timeKey){

    const normalizedTime =
        normalizeTimeKey(timeKey);

    if(!normalizedTime){

        return;

    }

    const selectedTimeInput =
        getElement("selectedTime");

    if(selectedTimeInput){

        selectedTimeInput.value =
            normalizedTime;

    }

    document
        .querySelectorAll(".time-slot")
        .forEach(button=>{

            const buttonTime =
                normalizeTimeKey(
                    button.dataset.time
                );

            button.classList.toggle(
                "selected",
                buttonTime === normalizedTime
            );

        });

    const selectedStationInput =
        getElement("selectedStation");

    if(selectedStationInput){

        selectedStationInput.value = "";

    }

    if(
        typeof renderWorkstations ===
        "function"
    ){

        renderWorkstations();

    }

}


/* =========================================
   사용 시간 버튼 연결
========================================= */

function bindTimeSlotEvents(){

    document
        .querySelectorAll(".time-slot")
        .forEach(button=>{

            button.addEventListener(
                "click",
                ()=>{

                    selectTimeSlot(
                        button.dataset.time
                    );

                }
            );

        });

}


/* =========================================
   관리자 화면 이동
========================================= */

let pageNavigationLocked = false;

function moveToAdminPage(event){

    if(pageNavigationLocked){
        if(event){ event.preventDefault(); }
        return;
    }

    pageNavigationLocked = true;

    const adminButton = getElement("adminMoveBtn");

    if(adminButton){
        adminButton.setAttribute("aria-disabled", "true");
        adminButton.textContent = "관리자 화면 여는 중...";
    }

    /* 링크의 기본 이동을 사용해 Acode 미리보기에서도 안정적으로 전환한다. */
    if(!event || !event.currentTarget || event.currentTarget.tagName !== "A"){
        window.location.href = "admin.html";
    }

}


/* =========================================
   관리자 버튼 연결
========================================= */

function bindAdminMoveEvent(){

    const adminButton =
        getElement("adminMoveBtn");

    if(!adminButton){

        return;

    }

    adminButton.addEventListener(
        "click",
        moveToAdminPage
    );

}


/* =========================================
   예약 현황 보기 전환
========================================= */

let reservationStatusMode = "summary";

function collapseReservationStatus(){
    reservationStatusMode = "summary";
    const list = getElement("reservationList");
    const title = getElement("selectedDateTitle");
    const button = getElement("showAllReservationBtn");
    if(title){ title.textContent = "예약 건수를 누르면 해당 현황이 표시됩니다."; }
    if(button){ button.textContent = "전체보기"; button.classList.remove("selected"); }
    if(list){ list.innerHTML = '<div class="empty-message">전체 예약은 건수로 표시됩니다. 오늘 건수나 달력 날짜를 눌러 상세 예약을 확인하세요.</div>'; }
}

function showAllReservations(){
    const button = getElement("showAllReservationBtn");
    if(reservationStatusMode === "all"){
        collapseReservationStatus();
        return;
    }
    reservationStatusMode = "all";
    const title = getElement("selectedDateTitle");
    if(title){ title.textContent = "전체 예약 현황"; }
    if(button){ button.textContent = "접기"; button.classList.add("selected"); }
    if(typeof renderAllReservations === "function"){ renderAllReservations("reservationList"); }
}

function showTodayReservations(){
    reservationStatusMode = "today";
    const button = getElement("showAllReservationBtn");
    if(button){ button.textContent = "전체보기"; button.classList.remove("selected"); }
    if(typeof renderSelectedDateReservations === "function"){ renderSelectedDateReservations(getTodayKey()); }
}

function showSelectedReservations(){
    reservationStatusMode = "selected";
    const button = getElement("showAllReservationBtn");
    if(button){ button.textContent = "전체보기"; button.classList.remove("selected"); }
    const selectedDateInput = getElement("selectedDate");
    const dateKey = selectedDateInput ? cleanText(selectedDateInput.value) : "";
    if(!dateKey){
        showMessage("먼저 달력에서 날짜를 선택하세요.");
        return;
    }
    if(typeof renderSelectedDateReservations === "function"){ renderSelectedDateReservations(dateKey); }
}

function bindShowAllReservationEvent(){
    const showAllButton = getElement("showAllReservationBtn");
    const totalButton = getElement("showTotalReservationBtn");
    const todayButton = getElement("showTodayReservationBtn");
    const selectedButton = getElement("showSelectedReservationBtn");
    if(showAllButton){ showAllButton.addEventListener("click", showAllReservations); }
    if(totalButton){ totalButton.addEventListener("click", showAllReservations); }
    if(todayButton){ todayButton.addEventListener("click", showTodayReservations); }
    if(selectedButton){ selectedButton.addEventListener("click", showSelectedReservations); }
}

/* =========================================
   기본 날짜 선택
========================================= */

function selectInitialDate(){

    const selectedDateInput =
        getElement("selectedDate");

    if(!selectedDateInput){

        return;

    }

    if(selectedDateInput.value){

        return;

    }

    const todayKey =
        getTodayKey();

    selectedDateInput.value =
        todayKey;

    if(
        typeof selectCalendarDate ===
        "function"
    ){

        selectCalendarDate(
            todayKey
        );

    }

}


/* =========================================
   저장 데이터 준비
========================================= */

function prepareStoredData(){

    if(
        typeof loadReservations !==
        "function"
    ){

        return;

    }

    /* loadReservations가 필요한 경우에만 데이터를 보정하므로
       시작 시 동일 데이터를 다시 저장하지 않는다. */
    loadReservations();

}


/* =========================================
   사용자 화면 전체 새로고침
========================================= */

let refreshFrameId = 0;

function runApplicationRefresh(){
    refreshFrameId = 0;

    if(typeof refreshCalendar === "function"){
        refreshCalendar();
    }

    if(typeof refreshReservationDisplay === "function"){
        refreshReservationDisplay();
    }

    /* refreshCalendar/selectCalendarDate 과정에서 작업대가 이미 갱신된다.
       선택 날짜가 없는 예외 상황에서만 직접 갱신한다. */
    const selectedDateInput = getElement("selectedDate");
    if(
        (!selectedDateInput || !selectedDateInput.value) &&
        typeof renderWorkstations === "function"
    ){
        renderWorkstations();
    }

    if(typeof renderNotices === "function"){
        renderNotices();
    }
}

function refreshApplication(){
    /* 짧은 시간에 여러 갱신 요청이 들어와도 화면은 프레임당 한 번만 그린다. */
    if(refreshFrameId){
        return;
    }

    if(typeof requestAnimationFrame === "function"){
        refreshFrameId = requestAnimationFrame(runApplicationRefresh);
    }else{
        runApplicationRefresh();
    }
}


/* =========================================
   앱 시작
========================================= */

let applicationInitialized = false;

function initializeApplication(){

    if(applicationInitialized){
        return;
    }

    applicationInitialized = true;

    try{

        prepareStoredData();

        if(
            typeof initializeUI ===
            "function"
        ){

            initializeUI();

        }

        if(
            typeof initializeCalendar ===
            "function"
        ){

            initializeCalendar();

        }

        if(
            typeof initializeWorkstations ===
            "function"
        ){

            initializeWorkstations();

        }

        if(
            typeof initializeReservation ===
            "function"
        ){

            initializeReservation();

        }

        if(
            typeof initializeMyPage ===
            "function"
        ){

            initializeMyPage();

        }

        bindTimeSlotEvents();

        bindAdminMoveEvent();

        bindShowAllReservationEvent();

        selectTimeSlot("morning");

        selectInitialDate();

        /* 전체 명단은 처음부터 만들지 않고 건수 요약만 표시한다. */
        collapseReservationStatus();

    }catch(error){

        applicationInitialized = false;

        console.error(
            "애플리케이션 초기화 오류",
            error
        );

        alert(
            "예약시스템을 불러오는 중 오류가 발생했습니다."
        );

    }

}


/* =========================================
   저장소 변경 감지
========================================= */

window.addEventListener(
    "storage",
    event=>{

        if(
            event.key ===
            RESERVATION_CONFIG.storageKey
        ){
            if(typeof clearReservationCache === "function"){
                clearReservationCache();
            }
            refreshApplication();
        }

        if(
            event.key ===
            "electricPracticeNoticesV61"
        ){

            if(
                typeof renderNotices ===
                "function"
            ){

                renderNotices();

            }

        }

    }
);


/* =========================================
   페이지 시작
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
);


/* =========================================
   전역 공개
========================================= */

window.selectTimeSlot =
    selectTimeSlot;

window.moveToAdminPage =
    moveToAdminPage;

window.showAllReservations =
    showAllReservations;

window.refreshApplication =
    refreshApplication;

window.initializeApplication =
    initializeApplication;