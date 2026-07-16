/* 전기기능사 실습실 예약·관리 시스템 V6.4.2 - 예약 마감 공통 기능 */
"use strict";

const CLOSURE_STORAGE_KEY = "electricPracticeClosuresV62";
let closureCacheRaw = null;
let closureCacheData = [];

function loadClosures(){
    try{
        const rawData = localStorage.getItem(CLOSURE_STORAGE_KEY) || "[]";

        if(rawData === closureCacheRaw){
            return closureCacheData;
        }

        const data = JSON.parse(rawData);
        closureCacheRaw = rawData;
        closureCacheData = Array.isArray(data) ? data : [];
        return closureCacheData;
    }catch(error){
        console.error("마감 데이터 읽기 오류", error);
        closureCacheRaw = "[]";
        closureCacheData = [];
        return closureCacheData;
    }
}


function saveClosures(items){
    try{
        const safeItems = Array.isArray(items) ? items : [];
        const rawData = JSON.stringify(safeItems);
        localStorage.setItem(CLOSURE_STORAGE_KEY, rawData);
        closureCacheRaw = rawData;
        closureCacheData = safeItems;
        return true;
    }catch(error){
        console.error("마감 데이터 저장 오류", error);
        return false;
    }
}


function getClosureForDate(dateKey, closures){
    const target = cleanText(dateKey);
    const source = Array.isArray(closures) ? closures : loadClosures();
    return source.find(item => target >= item.startDate && target <= item.endDate) || null;
}

function getClosureMessage(dateKey){
    const closure = getClosureForDate(dateKey);
    return closure ? `예약이 마감되었습니다.\n사유 : ${closure.reason}` : "";
}

function updateClosureNotice(dateKey){
    let notice = document.getElementById("closureDateNotice");
    const calendarCard = document.querySelector(".calendar-card");
    if(!notice && calendarCard){
        notice = document.createElement("div");
        notice.id = "closureDateNotice";
        notice.className = "closure-date-notice hidden";
        calendarCard.appendChild(notice);
    }
    if(!notice) return;
    const closure = getClosureForDate(dateKey);
    if(closure){
        notice.textContent = `예약불가 · ${closure.reason}`;
        notice.classList.remove("hidden");
    }else{
        notice.textContent = "";
        notice.classList.add("hidden");
    }
}

const originalRenderCalendar = renderCalendar;
renderCalendar = function(){
    originalRenderCalendar();
    const closures = loadClosures();
    document.querySelectorAll(".calendar-day[data-date]").forEach(day => {
        const closure = getClosureForDate(day.dataset.date, closures);
        if(!closure) return;
        day.classList.add("closed-date");
        day.title = `예약불가: ${closure.reason}`;
        const badge = document.createElement("span");
        badge.className = "closure-badge";
        badge.textContent = "예약불가";
        day.appendChild(badge);
    });
};

const originalSelectCalendarDate = selectCalendarDate;
selectCalendarDate = function(dateKey){
    /* originalSelectCalendarDate 내부에서 이미 renderWorkstations가 호출된다.
       여기서 다시 호출하면 모바일 미리보기에서 같은 화면을 두 번 그리게 된다. */
    const stationInput = getElement("selectedStation");
    if(getClosureForDate(dateKey) && stationInput) stationInput.value = "";
    originalSelectCalendarDate(dateKey);
    updateClosureNotice(dateKey);
};

const originalRenderWorkstations = renderWorkstations;
renderWorkstations = function(){
    /* 원본 함수가 모든 상태 클래스를 초기화하므로 사전 DOM 순회는 생략한다. */
    originalRenderWorkstations();
    const dateInput = getElement("selectedDate");
    const dateKey = dateInput ? dateInput.value : "";
    const closure = getClosureForDate(dateKey);
    const reserveButton = getElement("reserveBtn");
    const stationInput = getElement("selectedStation");
    if(closure){
        document.querySelectorAll(".workstation-button").forEach(button => {
            button.disabled = true;
            button.classList.add("closed-workstation", "unavailable");
        });
        if(stationInput) stationInput.value = "";
        if(reserveButton){
            reserveButton.disabled = true;
            reserveButton.title = `예약불가: ${closure.reason}`;
        }
    }else if(reserveButton){
        reserveButton.disabled = false;
        reserveButton.removeAttribute("title");
    }
    updateClosureNotice(dateKey);
};

const originalCreateReservation = createReservation;
createReservation = function(){
    const dateInput = getElement("selectedDate");
    const dateKey = dateInput ? dateInput.value : "";
    const closure = getClosureForDate(dateKey);
    if(closure){
        showMessage(`예약이 마감되었습니다. 사유 : ${closure.reason}`, "error");
        alert(getClosureMessage(dateKey));
        return false;
    }
    return originalCreateReservation();
};

window.loadClosures = loadClosures;
window.saveClosures = saveClosures;
window.getClosureForDate = getClosureForDate;
window.getClosureMessage = getClosureMessage;
