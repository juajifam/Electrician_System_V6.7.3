/* =========================================
   전기기능사 실습실 예약시스템 V6.6.1
   나의 예약 조회 및 취소
========================================= */

"use strict";


/* =========================================
   나의 예약 조회
========================================= */

function searchMyReservations(){

    const nameInput =
        getElement("myReservationName");

    const militaryIdInput =
        getElement("myReservationMilitaryId");


    const name =
        nameInput
            ? cleanText(nameInput.value)
            : "";

    const militaryId =
        militaryIdInput
            ? normalizeMilitaryId(militaryIdInput.value)
            : "";


    if(!name){

        showMessage(
            "성명을 입력하세요."
        );

        return;

    }


    if(!militaryId){

        showMessage(
            "군번을 입력하세요."
        );

        return;

    }


    const reservations =
        getMyStoredReservations(
            militaryId,
            name
        );


    renderMyReservationResult(
        reservations
    );

}



/* =========================================
   나의 예약 취소
========================================= */

function cancelMyReservation(
    reservationId
){

    const targetId =
        cleanText(reservationId);

    if(!targetId){

        showMessage(
            "예약 정보를 확인할 수 없습니다.",
            "error"
        );

        return;

    }


    const reservations =
        getAllStoredReservations();


    const reservation =
        reservations.find(
            item=>
                cleanText(item.id) ===
                targetId
        );


    if(!reservation){

        showMessage(
            "이미 취소되었거나 존재하지 않는 예약입니다."
        );

        refreshMyReservationSearch();

        return;

    }


    const reservationText =

        `${formatKoreanDate(reservation.date)}\n` +
        `${getTimeLabel(reservation.time)} ` +
        `${reservation.station}번 작업대`;


    const confirmed =
        confirm(
            `${reservationText}\n\n예약을 취소하시겠습니까?`
        );


    if(!confirmed){

        return;

    }


    const deleted =
        deleteStoredReservation(
            targetId
        );


    if(!deleted){

        showMessage(
            "예약 취소에 실패했습니다.",
            "error"
        );

        return;

    }


    showMessage(
        "예약이 취소되었습니다.",
        "success"
    );


    refreshReservationSystem();

    refreshMyReservationSearch();

}



/* =========================================
   최근 입력값으로 다시 조회
========================================= */

function refreshMyReservationSearch(){

    const nameInput =
        getElement("myReservationName");

    const militaryIdInput =
        getElement("myReservationMilitaryId");


    const name =
        nameInput
            ? cleanText(nameInput.value)
            : "";

    const militaryId =
        militaryIdInput
            ? normalizeMilitaryId(militaryIdInput.value)
            : "";


    if(!militaryId || !name){

        clearMyReservationResult();

        return;

    }


    const reservations =
        getMyStoredReservations(
            militaryId,
            name
        );


    renderMyReservationResult(
        reservations
    );

}



/* =========================================
   취소 버튼 이벤트 위임
========================================= */

function bindMyReservationCancelEvents(){

    const resultContainer =
        getElement(
            "myReservationResult"
        );


    if(!resultContainer){

        return;

    }


    resultContainer.addEventListener(
        "click",
        event=>{

            const cancelButton =
                event.target.closest(
                    ".cancel-button"
                );


            if(!cancelButton){

                return;

            }


            cancelMyReservation(
                cancelButton.dataset
                    .reservationId
            );

        }
    );

}



/* =========================================
   조회 버튼 연결
========================================= */

function bindMyReservationSearchEvents(){

    const searchButton =
        getElement(
            "myReservationSearchBtn"
        );

    const clearButton =
        getElement(
            "clearMyReservationBtn"
        );

    const nameInput =
        getElement(
            "myReservationName"
        );

    const militaryIdInput =
        getElement(
            "myReservationMilitaryId"
        );


    if(searchButton){

        searchButton.addEventListener(
            "click",
            searchMyReservations
        );

    }


    if(clearButton){

        clearButton.addEventListener(
            "click",
            clearMyReservationResult
        );

    }


    if(nameInput){

        nameInput.addEventListener(
            "keydown",
            event=>{

                if(event.key === "Enter"){

                    searchMyReservations();

                }

            }
        );

    }



    if(militaryIdInput){

        militaryIdInput.addEventListener(
            "input",
            ()=>{

                militaryIdInput.value =
                    normalizeMilitaryId(
                        militaryIdInput.value
                    );

            }
        );


        militaryIdInput.addEventListener(
            "keydown",
            event=>{

                if(event.key === "Enter"){

                    searchMyReservations();

                }

            }
        );

    }

}



/* =========================================
   초기 실행
========================================= */

function initializeMyPage(){

    bindMyReservationSearchEvents();

    bindMyReservationCancelEvents();

}



/* =========================================
   전역 공개
========================================= */

window.searchMyReservations =
    searchMyReservations;

window.cancelMyReservation =
    cancelMyReservation;

window.refreshMyReservationSearch =
    refreshMyReservationSearch;

window.initializeMyPage =
    initializeMyPage;