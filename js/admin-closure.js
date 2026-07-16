/* 전기기능사 실습실 예약·관리 시스템 V6.4.4 - 관리자 예약 마감 관리 */
"use strict";
const ADMIN_CLOSURE_STORAGE_KEY = "electricPracticeClosuresV62";
const CLOSURE_REPAIR_SESSION_KEY = "electricPracticeClosureRepairV631";
let adminClosureCacheRaw = null;
let adminClosureCacheData = [];
function loadClosures(){
    try{
        const rawData = localStorage.getItem(ADMIN_CLOSURE_STORAGE_KEY) || "[]";
        if(rawData === adminClosureCacheRaw){
            return adminClosureCacheData;
        }
        const data = JSON.parse(rawData);
        adminClosureCacheRaw = rawData;
        adminClosureCacheData = Array.isArray(data) ? data : [];
        return adminClosureCacheData;
    }
    catch(error){
        console.error("마감 데이터 읽기 오류",error);
        adminClosureCacheRaw = "[]";
        adminClosureCacheData = [];
        return adminClosureCacheData;
    }
}

function saveClosures(items){
    try{
        const safeItems = Array.isArray(items) ? items : [];
        const rawData = JSON.stringify(safeItems);
        localStorage.setItem(ADMIN_CLOSURE_STORAGE_KEY, rawData);
        adminClosureCacheRaw = rawData;
        adminClosureCacheData = safeItems;
        return true;
    }
    catch(error){
        console.error("마감 데이터 저장 오류",error);
        return false;
    }
}



function getDatesInRange(startDate, endDate){
    const dates = [];
    const current = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    while(current <= end){
        dates.push(formatDateKey(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

function getTargetReservations(startDate, endDate){
    const start = normalizeDateKey(startDate);
    const end = normalizeDateKey(endDate);
    return getAllStoredReservations().filter(item => {
        const itemDate = normalizeDateKey(item.date);
        return itemDate >= start && itemDate <= end;
    });
}

function updateClosurePreview(){
    const type = getElement("closureType").value;
    const start = getElement("closureStartDate").value;
    const endInput = getElement("closureEndDate");
    endInput.disabled = type === "day";
    if(type === "day") endInput.value = start;
    const end = type === "day" ? start : endInput.value;
    const target = start && end && start <= end ? getTargetReservations(start, end) : [];
    getElement("closureTargetCount").textContent = `${target.length}건`;
    const preview = getElement("closureTargetPreview");
    preview.innerHTML = target.length
        ? target.slice(0, 8).map(item => `<div>${escapeHTML(item.date)} · ${escapeHTML(item.rank)} ${escapeHTML(item.name)} · ${escapeHTML(String(item.station))}번 작업대 · ${escapeHTML(getTimeLabel(item.time))}</div>`).join("") + (target.length > 8 ? `<div>외 ${target.length - 8}건</div>` : "")
        : '<div class="admin-empty-message">마감 대상 예약이 없습니다.</div>';
}

function executeClosure(){
    const type = getElement("closureType").value;
    const startDate = getElement("closureStartDate").value;
    const endDate = type === "day" ? startDate : getElement("closureEndDate").value;
    const reason = cleanText(getElement("closureReason").value);
    if(!startDate || !endDate){ alert("시작일과 종료일을 선택하세요."); return; }
    if(startDate > endDate){ alert("종료일은 시작일 이후여야 합니다."); return; }
    if(!reason){ alert("마감 사유를 입력하세요."); return; }
    const overlaps = loadClosures().some(item => startDate <= item.endDate && endDate >= item.startDate);
    if(overlaps){ alert("선택한 기간에 이미 마감된 날짜가 포함되어 있습니다."); return; }
    const target = getTargetReservations(startDate, endDate);
    const periodText = type === "day" ? startDate : `${startDate} ~ ${endDate}`;
    if(!confirm(`${periodText}\n마감 대상 예약 ${target.length}건을 모두 취소하고 마감하시겠습니까?`)) return;

    /* 현재 및 이전 버전 저장 키에서 선택 기간 예약을 완전히 제거 */
    const deletionResult = deleteStoredReservationsByDateRange(startDate, endDate);

    if(!deletionResult.success){
        alert(`예약 취소 저장에 실패했습니다.\n남아 있는 대상 예약: ${Math.max(0, deletionResult.remainingTargetCount)}건`);
        return;
    }
    const closures = loadClosures();
    closures.push({
        id:`closure-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        type,
        startDate,
        endDate,
        reason,
        cancelledCount:Math.max(target.length, deletionResult.deletedCount),
        createdAt:new Date().toISOString()
    });
    if(!saveClosures(closures)){ alert("마감 정보 저장에 실패했습니다."); return; }
    alert(`예약 ${Math.max(target.length, deletionResult.deletedCount)}건을 취소하고 마감했습니다.`);
    getElement("closureReason").value = "";
    renderClosureList();
    updateClosurePreview();
    if(typeof refreshAdminScreen === "function") refreshAdminScreen();
}

function releaseClosure(id){
    const item = loadClosures().find(entry => entry.id === id);
    if(!item || !confirm(`${item.startDate}${item.startDate === item.endDate ? "" : ` ~ ${item.endDate}`} 마감을 해제하시겠습니까?\n기존 취소 예약은 복원되지 않습니다.`)) return;
    saveClosures(loadClosures().filter(entry => entry.id !== id));
    renderClosureList();
    updateClosurePreview();
}

function renderClosureList(){
    const list = getElement("closureList");
    if(!list) return;
    const closures = loadClosures().sort((a,b) => a.startDate.localeCompare(b.startDate));
    if(!closures.length){
        list.innerHTML = '<div class="admin-empty-message">현재 마감된 날짜가 없습니다.</div>';
        return;
    }
    list.innerHTML = closures.map(item => `
        <div class="closure-list-item">
            <div class="closure-list-main">
                <strong>${item.type === "day" ? "하루 마감" : "기간 마감"}</strong>
                <span>${escapeHTML(item.startDate)}${item.startDate === item.endDate ? "" : ` ~ ${escapeHTML(item.endDate)}`}</span>
                <span>사유: ${escapeHTML(item.reason)}</span>
                <span>취소예약: ${Number(item.cancelledCount || 0)}건</span>
            </div>
            <button type="button" class="admin-danger-button closure-release-button" data-id="${escapeHTML(item.id)}">마감 해제</button>
        </div>`).join("");
    list.querySelectorAll(".closure-release-button").forEach(button => button.addEventListener("click", () => releaseClosure(button.dataset.id)));
}


function repairReservationsInsideExistingClosures(){
    const closures = loadClosures();
    let changed = false;

    closures.forEach(item => {
        const targets = getTargetReservations(item.startDate, item.endDate);
        if(!targets.length) return;

        const result = deleteStoredReservationsByDateRange(item.startDate, item.endDate);
        if(result.success){
            item.cancelledCount = Number(item.cancelledCount || 0) + Math.max(targets.length, result.deletedCount);
            changed = true;
        }
    });

    if(changed){
        saveClosures(closures);
    }

    return changed;
}

let closureManagementBound = false;
let closureManagementActivated = false;

function initializeClosureManagement(){
    if(closureManagementBound){
        return;
    }

    closureManagementBound = true;

    const today = getTodayKey();
    const startInput = getElement("closureStartDate");
    const endInput = getElement("closureEndDate");
    const executeButton = getElement("executeClosureBtn");

    if(startInput && !startInput.value){ startInput.value = today; }
    if(endInput && !endInput.value){ endInput.value = today; }

    ["closureType","closureStartDate","closureEndDate"].forEach(id => {
        const element = getElement(id);
        if(element){
            element.addEventListener("change", updateClosurePreview);
        }
    });

    if(executeButton){
        executeButton.addEventListener("click", executeClosure);
    }
}

function activateClosureManagement(){
    initializeClosureManagement();

    if(closureManagementActivated){
        return;
    }

    closureManagementActivated = true;

    /* 무거운 잔여 예약 보정은 관리자 인증 후 탭당 한 번만 실행한다. */
    if(sessionStorage.getItem(CLOSURE_REPAIR_SESSION_KEY) !== "done"){
        repairReservationsInsideExistingClosures();
        sessionStorage.setItem(CLOSURE_REPAIR_SESSION_KEY, "done");
    }

    updateClosurePreview();
    renderClosureList();
}

document.addEventListener("DOMContentLoaded", initializeClosureManagement);
window.activateClosureManagement = activateClosureManagement;
window.renderClosureList = renderClosureList;
