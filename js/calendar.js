/* =========================================
   전기기능사 실습실 예약시스템 V6
   달력 기능
========================================= */

"use strict";


/* =========================================
   달력 상태
========================================= */

let calendarViewDate =
    new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
    );



/* =========================================
   달력 생성
========================================= */

function renderCalendar(){

    const calendarGrid =
        getElement("calendarGrid");

    const calendarTitle =
        getElement("calendarTitle");

    if(
        !calendarGrid ||
        !calendarTitle
    ){

        return;

    }


    const year =
        calendarViewDate.getFullYear();

    const monthIndex =
        calendarViewDate.getMonth();

    const monthNumber =
        monthIndex + 1;


    calendarTitle.textContent =
        `${year}년 ${monthNumber}월`;


    clearElement(calendarGrid);


    const firstDayIndex =
        new Date(
            year,
            monthIndex,
            1
        ).getDay();


    const lastDate =
        new Date(
            year,
            monthIndex + 1,
            0
        ).getDate();


    const monthlyReservationCount =
        getMonthlyReservationCount(
            year,
            monthIndex
        );


    for(
        let emptyIndex=0;
        emptyIndex<firstDayIndex;
        emptyIndex++
    ){

        const emptyCell =
            document.createElement("div");

        emptyCell.className =
            "calendar-day empty";

        calendarGrid.appendChild(
            emptyCell
        );

    }


    for(
        let day=1;
        day<=lastDate;
        day++
    ){

        const date =
            new Date(
                year,
                monthIndex,
                day
            );

        const dateKey =
            formatDateKey(date);

        const weekDay =
            date.getDay();

        const reservationCount =
            monthlyReservationCount[dateKey] || 0;

        const dayButton =
            document.createElement("button");

        dayButton.type =
            "button";

        dayButton.className =
            "calendar-day";

        dayButton.dataset.date =
            dateKey;


        if(weekDay === 0){

            dayButton.classList.add(
                "sunday"
            );

        }


        if(weekDay === 6){

            dayButton.classList.add(
                "saturday"
            );

        }


        if(dateKey === getTodayKey()){

            dayButton.classList.add(
                "today"
            );

        }


        if(isPastDate(dateKey)){

            dayButton.classList.add(
                "past"
            );

        }


        const reservationLevel =
            getCalendarReservationLevel(
                reservationCount
            );

        if(reservationLevel){

            dayButton.classList.add(
                reservationLevel
            );

        }


        const selectedDateInput =
            getElement("selectedDate");

        const selectedDate =
            selectedDateInput
                ? selectedDateInput.value
                : "";

        if(selectedDate === dateKey){

            dayButton.classList.add(
                "selected"
            );

        }


        const dayNumber =
            document.createElement("span");

        dayNumber.className =
            "calendar-day-number";

        dayNumber.textContent =
            String(day);

        dayButton.appendChild(
            dayNumber
        );


        if(reservationCount > 0){

            const countBadge =
                document.createElement("span");

            countBadge.className =
                "reservation-count";

            countBadge.textContent =
                `${reservationCount}건`;

            dayButton.appendChild(
                countBadge
            );

        }


        dayButton.addEventListener(
            "click",
            ()=>{

                selectCalendarDate(
                    dateKey
                );

            }
        );


        calendarGrid.appendChild(
            dayButton
        );

    }

}



/* =========================================
   날짜 선택
========================================= */

function selectCalendarDate(dateKey){

    const selectedDateInput =
        getElement("selectedDate");

    if(!selectedDateInput){

        return;

    }


    selectedDateInput.value =
        dateKey;


    document
        .querySelectorAll(
            ".calendar-day.selected"
        )
        .forEach(dayElement=>{

            dayElement.classList.remove(
                "selected"
            );

        });


    const selectedDayElement =
        document.querySelector(
            `.calendar-day[data-date="${dateKey}"]`
        );

    if(selectedDayElement){

        selectedDayElement.classList.add(
            "selected"
        );

    }


    renderSelectedDateReservations(
        dateKey
    );


    if(
        typeof renderWorkstations ===
        "function"
    ){

        renderWorkstations();

    }

}



/* =========================================
   이전 달
========================================= */

function moveToPreviousMonth(){

    calendarViewDate =
        new Date(
            calendarViewDate.getFullYear(),
            calendarViewDate.getMonth() - 1,
            1
        );

    renderCalendar();

}



/* =========================================
   다음 달
========================================= */

function moveToNextMonth(){

    calendarViewDate =
        new Date(
            calendarViewDate.getFullYear(),
            calendarViewDate.getMonth() + 1,
            1
        );

    renderCalendar();

}



/* =========================================
   현재 달로 이동
========================================= */

function moveToCurrentMonth(){

    const today =
        new Date();

    calendarViewDate =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

    renderCalendar();

}



/* =========================================
   달력 새로고침
========================================= */

function refreshCalendar(){

    renderCalendar();

}



/* =========================================
   달력 버튼 연결
========================================= */

function bindCalendarEvents(){

    const previousButton =
        getElement("prevMonthBtn");

    const nextButton =
        getElement("nextMonthBtn");


    if(previousButton){

        previousButton.addEventListener(
            "click",
            moveToPreviousMonth
        );

    }


    if(nextButton){

        nextButton.addEventListener(
            "click",
            moveToNextMonth
        );

    }

}



/* =========================================
   초기 날짜 선택
========================================= */

function initializeCalendar(){

    bindCalendarEvents();

    renderCalendar();

}



/* =========================================
   전역 공개
========================================= */

window.renderCalendar =
    renderCalendar;

window.selectCalendarDate =
    selectCalendarDate;

window.moveToPreviousMonth =
    moveToPreviousMonth;

window.moveToNextMonth =
    moveToNextMonth;

window.moveToCurrentMonth =
    moveToCurrentMonth;

window.refreshCalendar =
    refreshCalendar;

window.initializeCalendar =
    initializeCalendar;