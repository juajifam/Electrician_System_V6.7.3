/* =========================================
   전기기능사 실습실 예약시스템 V6.4.2
   작업대 선택 및 상태 관리
========================================= */

"use strict";


/* =========================================
   작업대 상태 클래스 초기화
========================================= */

function resetWorkstationClasses(button){

    if(!button){

        return;

    }

    button.classList.remove(
        "available",
        "morning-reserved",
        "afternoon-reserved",
        "both-reserved",
        "full-reserved",
        "selected",
        "unavailable",
        "closed-workstation"
    );

    button.disabled = false;

}



/* =========================================
   작업대 상태 계산
========================================= */

function getWorkstationVisualState(
    stationStatus,
    selectedTime
){

    const status =
        stationStatus || {
            morning:false,
            afternoon:false,
            full:false
        };

    const time =
        normalizeTimeKey(selectedTime);


    if(status.full){

        return {
            className:"full-reserved",
            unavailable:true
        };

    }


    if(
        status.morning &&
        status.afternoon
    ){

        return {
            className:"both-reserved",
            unavailable:true
        };

    }


    if(status.morning){

        return {
            className:"morning-reserved",
            unavailable:
                time === "morning" ||
                time === "full"
        };

    }


    if(status.afternoon){

        return {
            className:"afternoon-reserved",
            unavailable:
                time === "afternoon" ||
                time === "full"
        };

    }


    return {
        className:"available",
        unavailable:false
    };

}



/* =========================================
   작업대 화면 출력
========================================= */

function renderWorkstations(){

    const selectedDateInput =
        getElement("selectedDate");

    const selectedTimeInput =
        getElement("selectedTime");

    const selectedStationInput =
        getElement("selectedStation");


    const selectedDate =
        selectedDateInput
            ? selectedDateInput.value
            : "";

    const selectedTime =
        selectedTimeInput
            ? selectedTimeInput.value
            : "morning";

    const selectedStation =
        selectedStationInput
            ? normalizeStation(
                selectedStationInput.value
            )
            : 0;


    const statusMap =
        selectedDate
            ? getWorkstationStatusMap(
                selectedDate
            )
            : {};


    document
        .querySelectorAll(
            ".workstation-button"
        )
        .forEach(button=>{

            resetWorkstationClasses(
                button
            );


            const station =
                normalizeStation(
                    button.dataset.station
                );


            const stationStatus =
                statusMap[station] || {
                    morning:false,
                    afternoon:false,
                    full:false
                };


            const visualState =
                getWorkstationVisualState(
                    stationStatus,
                    selectedTime
                );


            button.classList.add(
                visualState.className
            );


            if(visualState.unavailable){

                button.classList.add(
                    "unavailable"
                );

                button.disabled = true;

            }


            if(
                station === selectedStation &&
                !visualState.unavailable
            ){

                button.classList.add(
                    "selected"
                );

            }


            if(
                station === selectedStation &&
                visualState.unavailable
            ){

                if(selectedStationInput){

                    selectedStationInput.value =
                        "";

                }

            }

        });

}



/* =========================================
   작업대 선택
========================================= */

function selectWorkstation(station){

    const selectedDateInput =
        getElement("selectedDate");

    const selectedTimeInput =
        getElement("selectedTime");

    const selectedStationInput =
        getElement("selectedStation");


    const selectedDate =
        selectedDateInput
            ? selectedDateInput.value
            : "";

    const selectedTime =
        selectedTimeInput
            ? selectedTimeInput.value
            : "";

    const normalizedStation =
        normalizeStation(station);


    if(!selectedDate){

        showMessage(
            "먼저 예약 날짜를 선택하세요."
        );

        return;

    }


    if(!selectedTime){

        showMessage(
            "사용 시간을 선택하세요."
        );

        return;

    }


    if(!normalizedStation){

        showMessage(
            "작업대 정보가 올바르지 않습니다.",
            "error"
        );

        return;

    }


    const conflict =
        hasReservationConflict(
            selectedDate,
            selectedTime,
            normalizedStation
        );


    if(conflict){

        showMessage(
            "선택한 시간에는 이미 예약된 작업대입니다."
        );

        return;

    }


    if(selectedStationInput){

        selectedStationInput.value =
            String(normalizedStation);

    }


    renderWorkstations();

}



/* =========================================
   작업대 선택 해제
========================================= */

function clearSelectedWorkstation(){

    const selectedStationInput =
        getElement("selectedStation");

    if(selectedStationInput){

        selectedStationInput.value = "";

    }

    renderWorkstations();

}



/* =========================================
   작업대 버튼 이벤트 연결
========================================= */

function bindWorkstationEvents(){

    document
        .querySelectorAll(
            ".workstation-button"
        )
        .forEach(button=>{

            button.addEventListener(
                "click",
                ()=>{

                    if(button.disabled){

                        return;

                    }

                    selectWorkstation(
                        button.dataset.station
                    );

                }
            );

        });

}



/* =========================================
   초기 실행
========================================= */

function initializeWorkstations(){

    bindWorkstationEvents();

    renderWorkstations();

}



/* =========================================
   전역 공개
========================================= */

window.resetWorkstationClasses =
    resetWorkstationClasses;

window.getWorkstationVisualState =
    getWorkstationVisualState;

window.renderWorkstations =
    renderWorkstations;

window.selectWorkstation =
    selectWorkstation;

window.clearSelectedWorkstation =
    clearSelectedWorkstation;

window.initializeWorkstations =
    initializeWorkstations;