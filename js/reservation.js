/* =========================================
   전기기능사 실습실 예약시스템 V6
   예약 등록·초기화·충돌 확인
========================================= */

"use strict";


/* =========================================
   예약 입력값 가져오기
========================================= */

function getReservationFormData(){

    const rankElement =
        getElement("rank");

    const militaryIdElement =
        getElement("militaryId");

    const nameElement =
        getElement("name");

    const unitElement =
        getElement("unit");

    const phoneElement =
        getElement("phone");

    const selectedDateElement =
        getElement("selectedDate");

    const selectedTimeElement =
        getElement("selectedTime");

    const selectedStationElement =
        getElement("selectedStation");


    return {

        rank:
            rankElement
                ? cleanText(rankElement.value)
                : "",

        militaryId:
            militaryIdElement
                ? normalizeMilitaryId(militaryIdElement.value)
                : "",

        name:
            nameElement
                ? cleanText(nameElement.value)
                : "",

        unit:
            unitElement
                ? cleanText(unitElement.value)
                : "",

        phone:
            phoneElement
                ? normalizePhone(phoneElement.value)
                : "",

        date:
            selectedDateElement
                ? cleanText(selectedDateElement.value)
                : "",

        time:
            selectedTimeElement
                ? normalizeTimeKey(
                    selectedTimeElement.value
                )
                : "",

        station:
            selectedStationElement
                ? normalizeStation(
                    selectedStationElement.value
                )
                : 0

    };

}



/* =========================================
   예약 입력값 검사
========================================= */

function validateReservationForm(formData){

    if(!formData.rank){

        return {
            valid:false,
            message:"계급을 선택하세요."
        };

    }


    if(!formData.militaryId){

        return {
            valid:false,
            message:"군번을 입력하세요."
        };

    }


    if(formData.militaryId.length < 4){

        return {
            valid:false,
            message:"군번을 정확히 입력하세요."
        };

    }


    if(!formData.name){

        return {
            valid:false,
            message:"성명을 입력하세요."
        };

    }


    if(formData.name.length < 2){

        return {
            valid:false,
            message:"성명을 정확히 입력하세요."
        };

    }


    if(!formData.unit){

        return {
            valid:false,
            message:"소속을 입력하세요."
        };

    }


    if(!formData.phone){

        return {
            valid:false,
            message:"연락처를 입력하세요."
        };

    }


    if(formData.phone.length < 8){

        return {
            valid:false,
            message:"연락처를 정확히 입력하세요."
        };

    }


    if(!parseDateKey(formData.date)){

        return {
            valid:false,
            message:"예약 날짜를 선택하세요."
        };

    }


    if(isPastDate(formData.date)){

        return {
            valid:false,
            message:"지난 날짜에는 예약할 수 없습니다."
        };

    }


    if(!formData.time){

        return {
            valid:false,
            message:"사용 시간을 선택하세요."
        };

    }


    if(!formData.station){

        return {
            valid:false,
            message:"작업대를 선택하세요."
        };

    }


    return {
        valid:true,
        message:""
    };

}



/* =========================================
   동일 사용자 중복 예약 검사
========================================= */

/**
 * 동일 날짜에 같은 사용자가 여러 작업대를
 * 예약하지 못하도록 확인
 *
 * 오전 + 오후는 같은 작업대에 한해 허용
 */
function hasUserDateConflict(formData){

    const reservations =
        getStoredReservationsByDate(
            formData.date
        );

    const sameUserReservations =
        reservations.filter(item=>
            normalizeMilitaryIdForCompare(item.militaryId) ===
                normalizeMilitaryIdForCompare(formData.militaryId)
        );


    if(sameUserReservations.length === 0){

        return false;

    }


    /* 동일 군번은 같은 날짜에 1건만 예약 가능 */
    return true;

}



/* =========================================
   예약 등록
========================================= */

function createReservation(){

    const formData =
        getReservationFormData();


    const validation =
        validateReservationForm(
            formData
        );


    if(!validation.valid){

        showMessage(
            validation.message
        );

        return false;

    }


    const workstationConflict =
        hasReservationConflict(
            formData.date,
            formData.time,
            formData.station
        );


    if(workstationConflict){

        showMessage(
            "선택한 날짜와 시간에 이미 예약된 작업대입니다."
        );

        renderWorkstations();

        return false;

    }


    const userConflict =
        hasUserDateConflict(
            formData
        );


    if(userConflict){

        showMessage(
            "동일 군번으로는 같은 날짜에 1건만 예약할 수 있습니다."
        );

        return false;

    }


    const reservation = {

        id:
            createReservationId(),

        rank:
            formData.rank,

        militaryId:
            formData.militaryId,

        name:
            formData.name,

        unit:
            formData.unit,

        phone:
            formData.phone,

        date:
            formData.date,

        time:
            formData.time,

        station:
            formData.station,

        createdAt:
            new Date().toISOString()

    };


    const result =
        addStoredReservation(
            reservation
        );


    if(!result.success){

        showMessage(
            result.message ||
            "예약 저장에 실패했습니다.",
            "error"
        );

        return false;

    }


    showMessage(
        "예약이 완료되었습니다.",
        "success"
    );


    refreshReservationSystem();

    clearReservationSelection();

    return true;

}



/* =========================================
   예약 선택값만 초기화
========================================= */

function clearReservationSelection(){

    const selectedStationElement =
        getElement("selectedStation");

    if(selectedStationElement){

        selectedStationElement.value = "";

    }


    renderWorkstations();

}



/* =========================================
   사용자 입력 전체 초기화
========================================= */

function resetReservationForm(){

    const rankElement =
        getElement("rank");

    const militaryIdElement =
        getElement("militaryId");

    const nameElement =
        getElement("name");

    const unitElement =
        getElement("unit");

    const phoneElement =
        getElement("phone");

    const selectedDateElement =
        getElement("selectedDate");

    const selectedTimeElement =
        getElement("selectedTime");

    const selectedStationElement =
        getElement("selectedStation");


    if(rankElement){

        rankElement.value = "";

    }


    if(militaryIdElement){

        militaryIdElement.value = "";

    }


    if(nameElement){

        nameElement.value = "";

    }


    if(unitElement){

        unitElement.value = "";

    }


    if(phoneElement){

        phoneElement.value = "";

    }


    if(selectedDateElement){

        selectedDateElement.value = "";

    }


    if(selectedTimeElement){

        selectedTimeElement.value =
            "morning";

    }


    if(selectedStationElement){

        selectedStationElement.value = "";

    }


    document
        .querySelectorAll(
            ".time-slot"
        )
        .forEach(button=>{

            button.classList.remove(
                "selected"
            );

        });


    const morningButton =
        document.querySelector(
            '.time-slot[data-time="morning"]'
        );

    if(morningButton){

        morningButton.classList.add(
            "selected"
        );

    }


    document
        .querySelectorAll(
            ".calendar-day.selected"
        )
        .forEach(day=>{

            day.classList.remove(
                "selected"
            );

        });


    renderSelectedDateReservations("");

    renderWorkstations();

}



/* =========================================
   예약 시스템 전체 새로고침
========================================= */

function refreshReservationSystem(){

    const selectedDateElement =
        getElement("selectedDate");

    const selectedDate =
        selectedDateElement
            ? selectedDateElement.value
            : "";


    refreshCalendar();

    renderSelectedDateReservations(
        selectedDate
    );

    renderReservationStatistics(
        selectedDate
    );

    renderWorkstations();

}



/* =========================================
   예약 버튼 이벤트 연결
========================================= */

function bindReservationEvents(){

    const reserveButton =
        getElement("reserveBtn");

    const resetButton =
        getElement("resetBtn");


    if(reserveButton){

        reserveButton.addEventListener(
            "click",
            createReservation
        );

    }


    if(resetButton){

        resetButton.addEventListener(
            "click",
            ()=>{

                const confirmed =
                    confirm(
                        "입력한 내용을 모두 초기화하시겠습니까?"
                    );

                if(!confirmed){

                    return;

                }

                resetReservationForm();

            }
        );

    }

}



/* =========================================
   연락처 자동 정리
========================================= */

function bindPhoneInput(){

    const phoneElement =
        getElement("phone");

    if(!phoneElement){

        return;

    }


    phoneElement.addEventListener(
        "input",
        ()=>{

            const numbers =
                normalizePhone(
                    phoneElement.value
                );

            phoneElement.value =
                numbers.slice(0, 11);

        }
    );

}



/* =========================================
   초기 실행
========================================= */

function initializeReservation(){

    bindReservationEvents();

    bindPhoneInput();

}



/* =========================================
   전역 공개
========================================= */

window.getReservationFormData =
    getReservationFormData;

window.validateReservationForm =
    validateReservationForm;

window.hasUserDateConflict =
    hasUserDateConflict;

window.createReservation =
    createReservation;

window.clearReservationSelection =
    clearReservationSelection;

window.resetReservationForm =
    resetReservationForm;

window.refreshReservationSystem =
    refreshReservationSystem;

window.initializeReservation =
    initializeReservation;