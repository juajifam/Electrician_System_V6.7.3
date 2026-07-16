/* =========================================
   전기기능사 실습실 예약·관리 시스템 V6.7
   관리자 화면 기능
========================================= */

"use strict";


/* =========================================
   관리자 설정
========================================= */

const ADMIN_PASSWORD_STORAGE_KEY = "electricianAdminPassword";
const DEFAULT_ADMIN_PASSWORD = "1234";
const MASTER_CODE = "6300";
const MASTER_SESSION_KEY = "electricianMasterSession";

function getAdminPassword(){
    const saved = localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY);
    return saved || DEFAULT_ADMIN_PASSWORD;
}

function isMasterSession(){
    return sessionStorage.getItem(MASTER_SESSION_KEY) === "true";
}

function setMasterSession(enabled){
    if(enabled){
        sessionStorage.setItem(MASTER_SESSION_KEY, "true");
    }else{
        sessionStorage.removeItem(MASTER_SESSION_KEY);
    }
}


let currentAdminFilter = "none";
let currentAdminKeyword = "";

let adminCalendarViewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let adminCalendarSelectedDate = getTodayKey();



/* =========================================
   관리자 로그인
========================================= */

function loginAdmin(){

    const passwordInput =
        getElement("adminPasswordInput");

    const loginSection =
        getElement("adminLoginSection");

    const adminContent =
        getElement("adminContent");

    const password =
        passwordInput
            ? cleanText(passwordInput.value)
            : "";


    if(!password){

        alert("관리자 비밀번호를 입력하세요.");

        return;

    }


    if(password !== getAdminPassword()){

        alert("관리자 비밀번호가 올바르지 않습니다.");

        if(passwordInput){

            passwordInput.select();

        }

        return;

    }


    enterAdminContent(false);

}



function showMasterLoginArea(){
    const area = getElement("masterLoginArea");
    if(area){ area.classList.toggle("hidden"); }
}

function enterAdminContent(masterMode){
    const loginSection = getElement("adminLoginSection");
    const adminContent = getElement("adminContent");
    const badge = getElement("adminSessionBadge");
    const passwordSection = getElement("passwordChangeSection");

    setMasterSession(Boolean(masterMode));

    if(loginSection){ loginSection.classList.add("hidden"); }
    if(adminContent){ adminContent.classList.remove("hidden"); }
    if(badge){ badge.textContent = masterMode ? "마스터 관리자" : "일반 관리자"; }
    if(passwordSection){ passwordSection.classList.toggle("hidden", !masterMode); }

    refreshAdminScreen();
    loadNoticeEditor();

    if(typeof activateClosureManagement === "function"){
        activateClosureManagement();
    }
}

function loginMaster(){
    const input = getElement("masterCodeInput");
    const code = input ? cleanText(input.value) : "";

    if(!code){
        alert("마스터 코드를 입력하세요.");
        return;
    }
    if(code !== MASTER_CODE){
        alert("마스터 코드가 올바르지 않습니다.");
        if(input){ input.select(); }
        return;
    }
    enterAdminContent(true);
}

function changeAdminPassword(){
    if(!isMasterSession()){
        alert("마스터 로그인에서만 비밀번호를 변경할 수 있습니다.");
        return;
    }

    const currentInput = getElement("currentAdminPasswordInput");
    const newInput = getElement("newAdminPasswordInput");
    const confirmInput = getElement("confirmAdminPasswordInput");
    const message = getElement("passwordChangeMessage");
    const current = currentInput ? cleanText(currentInput.value) : "";
    const next = newInput ? cleanText(newInput.value) : "";
    const confirm = confirmInput ? cleanText(confirmInput.value) : "";

    if(current !== getAdminPassword()){
        alert("현재 관리자 비밀번호가 올바르지 않습니다.");
        return;
    }
    if(next.length < 4){
        alert("새 비밀번호는 4자리 이상 입력하세요.");
        return;
    }
    if(next !== confirm){
        alert("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
        return;
    }

    localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, next);
    if(currentInput){ currentInput.value = ""; }
    if(newInput){ newInput.value = ""; }
    if(confirmInput){ confirmInput.value = ""; }
    if(message){ message.textContent = "공용 관리자 비밀번호가 변경되었습니다."; }
    alert("공용 관리자 비밀번호가 변경되었습니다.");
}

/* =========================================
   사용자 화면 이동
========================================= */

let adminPageNavigationLocked = false;

function moveToUserPage(event){

    if(adminPageNavigationLocked){
        if(event){ event.preventDefault(); }
        return;
    }

    adminPageNavigationLocked = true;

    const userButton = getElement("userPageBtn");

    if(userButton){
        userButton.setAttribute("aria-disabled", "true");
        userButton.textContent = "사용자 화면 여는 중...";
    }

    /* 링크의 기본 이동을 사용해 Acode 미리보기에서도 안정적으로 전환한다. */
    if(!event || !event.currentTarget || event.currentTarget.tagName !== "A"){
        window.location.href = "index.html";
    }

}



/* =========================================
   관리자 통계
========================================= */

function renderAdminStatistics(){

    const reservations =
        getAllStoredReservations();

    const todayReservations =
        getTodayStoredReservations();

    const totalElement =
        getElement("adminTotalCount");

    const todayElement =
        getElement("adminTodayCount");

    const usageElement =
        getElement("adminUsageRate");


    if(totalElement){

        totalElement.textContent =
            String(reservations.length);

    }


    if(todayElement){

        todayElement.textContent =
            String(todayReservations.length);

    }

    const weekElement = getElement("adminWeekCount");
    if(weekElement){
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const startKey = formatDateKey(start);
        const endKey = formatDateKey(end);
        const weekCount = reservations.filter(item=> item.date >= startKey && item.date <= endKey).length;
        weekElement.textContent = String(weekCount);
    }

    const closureElement = getElement("adminClosureCount");
    if(closureElement){
        closureElement.textContent = String(typeof loadClosures === "function" ? loadClosures().length : 0);
    }


    let usedSlots = 0;


    todayReservations.forEach(
        reservation=>{

            const time =
                normalizeTimeKey(
                    reservation.time
                );


            if(time === "full"){

                usedSlots += 2;

            }else{

                usedSlots += 1;

            }

        }
    );


    const maximumSlots =
        RESERVATION_CONFIG.workstationCount * 2;


    const usageRate =
        maximumSlots > 0
            ? Math.min(
                100,
                Math.round(
                    (
                        usedSlots /
                        maximumSlots
                    ) * 100
                )
            )
            : 0;


    if(usageElement){

        usageElement.textContent =
            `${usageRate}%`;

    }

}



/* =========================================
   시간 표시 클래스
========================================= */

function getAdminTimeClass(timeKey){

    const time =
        normalizeTimeKey(timeKey);


    if(
        time === "morning" ||
        time === "afternoon" ||
        time === "full"
    ){

        return time;

    }


    return "";

}



/* =========================================
   관리자 예약 카드 생성
========================================= */

function createAdminReservationItemHTML(
    reservation
){

    const item =
        normalizeReservation(
            reservation
        );


    const personName =
        [
            cleanText(item.rank),
            cleanText(item.name)
        ]
        .filter(Boolean)
        .join(" ") || "-";


    return `
        <article
            class="admin-reservation-item"
            data-reservation-id="${escapeHTML(item.id)}"
        >

            <span
                class="admin-reservation-time ${getAdminTimeClass(item.time)}"
            >
                ${escapeHTML(
                    getTimeLabel(item.time)
                )}
            </span>


            <div class="admin-reservation-info">

                <div class="admin-reservation-person-row">

                    <strong>
                        ${escapeHTML(personName)}
                    </strong>

                    <span class="admin-reservation-unit">
                        ${escapeHTML(item.unit || "-")}
                    </span>

                </div>


                <span>
                    ${escapeHTML(
                        formatShortDate(item.date)
                    )}
                    ·
                    ${escapeHTML(
                        getTimeText(item.time)
                    )}
                    ·
                    ${item.station}번 작업대
                </span>


                <span>
                    군번
                    ${escapeHTML(item.militaryId || "-")}
                    · 연락처
                    ${escapeHTML(
                        formatPhone(item.phone)
                    )}
                </span>

            </div>


            <button
                type="button"
                class="admin-delete-button"
                data-reservation-id="${escapeHTML(item.id)}"
            >
                삭제
            </button>

        </article>
    `;

}



/* =========================================
   예약 삭제 버튼 연결
========================================= */

function bindReservationDeleteButtons(container){

    if(!container){
        return;
    }

    container
        .querySelectorAll(".admin-delete-button")
        .forEach(button=>{

            if(button.dataset.deleteBound === "true"){
                return;
            }

            button.dataset.deleteBound = "true";

            button.addEventListener("click", event=>{
                event.preventDefault();
                event.stopPropagation();

                deleteAdminReservation(
                    button.dataset.reservationId
                );
            });
        });
}


/* =========================================
   필터 대상 데이터
========================================= */

function getFilteredAdminReservations(){

    let reservations =
        getAllStoredReservations();


    if(currentAdminFilter === "none"){
        return [];
    }

    if(currentAdminFilter === "today"){
        const todayKey = getTodayKey();
        reservations = reservations.filter(item=> item.date === todayKey);
    }

    if(currentAdminFilter === "week"){
        const now = new Date();
        now.setHours(0,0,0,0);
        const day = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - day);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const startKey = formatDateKey(start);
        const endKey = formatDateKey(end);
        reservations = reservations.filter(item=> item.date >= startKey && item.date <= endKey);
    }


    if(currentAdminKeyword){

        reservations =
            searchReservations(
                reservations,
                currentAdminKeyword
            );

    }


    return sortReservations(
        reservations
    );

}



/* =========================================
   관리자 예약 목록 표시
========================================= */

function renderAdminReservationList(){

    const listElement =
        getElement("adminReservationList");

    const adminCalendarGrid = getElement("adminCalendarGrid");
    const adminCalendarPrevBtn = getElement("adminCalendarPrevBtn");
    const adminCalendarNextBtn = getElement("adminCalendarNextBtn");
    const adminCalendarList = getElement("adminCalendarReservationList");

    const countElement =
        getElement("adminListCount");


    if(!listElement){

        return;

    }


    const reservations =
        getFilteredAdminReservations();


    if(countElement){

        countElement.textContent =
            `${reservations.length}건`;

    }


    const titleElement = getElement("adminListTitle");
    if(titleElement){
        const titles = {none:"예약 상세 목록", today:"오늘 예약", week:"이번 주 예약", all:"전체 예약"};
        titleElement.textContent = currentAdminKeyword ? "검색 결과" : (titles[currentAdminFilter] || "예약 상세 목록");
    }

    const closeStatusButton = getElement("closeAdminStatusBtn");
    if(closeStatusButton){
        const hasOpenStatus = currentAdminFilter !== "none" || Boolean(currentAdminKeyword);
        closeStatusButton.classList.toggle("hidden", !hasOpenStatus);
    }

    if(reservations.length === 0){
        const message = currentAdminFilter === "none"
            ? "오늘·이번 주·전체 예약 건수 또는 달력 날짜를 눌러 상세 목록을 확인하세요."
            : "표시할 예약 내역이 없습니다.";
        listElement.innerHTML = `<div class="admin-empty-message">${message}</div>`;
        return;
    }


    listElement.innerHTML =
        reservations
        .map(
            createAdminReservationItemHTML
        )
        .join("");

    bindReservationDeleteButtons(listElement);

}



/* =========================================
   관리자 달력형 예약현황 (V6.5)
========================================= */

function getAdminClosureForDate(dateKey){
    if(typeof loadClosures !== "function") return null;
    const key = cleanText(dateKey);
    return loadClosures().find(item=>{
        const start = cleanText(item.startDate);
        const end = cleanText(item.endDate || item.startDate);
        return start && end && key >= start && key <= end;
    }) || null;
}

function renderAdminCalendar(){
    const grid = getElement("adminCalendarGrid");
    const title = getElement("adminCalendarTitle");
    if(!grid || !title) return;

    const year = adminCalendarViewDate.getFullYear();
    const month = adminCalendarViewDate.getMonth();
    title.textContent = `${year}년 ${month + 1}월`;

    const reservations = getAllStoredReservations();
    const counts = Object.create(null);
    reservations.forEach(item=>{
        const date = cleanText(item.date);
        if(date){ counts[date] = (counts[date] || 0) + 1; }
    });

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const fragment = document.createDocumentFragment();

    for(let i=0; i<firstDay; i++){
        const empty = document.createElement("div");
        empty.className = "admin-calendar-day empty";
        fragment.appendChild(empty);
    }

    for(let day=1; day<=lastDate; day++){
        const date = new Date(year, month, day);
        const dateKey = formatDateKey(date);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "admin-calendar-day";
        button.dataset.date = dateKey;

        if(date.getDay() === 0) button.classList.add("sunday");
        if(date.getDay() === 6) button.classList.add("saturday");
        if(dateKey === getTodayKey()) button.classList.add("today");
        if(dateKey === adminCalendarSelectedDate) button.classList.add("selected");

        const closure = getAdminClosureForDate(dateKey);
        if(closure){
            button.classList.add("closed");
            button.title = `예약불가: ${cleanText(closure.reason) || "마감"}`;
        }

        const count = counts[dateKey] || 0;
        const statusHTML = closure
            ? '<span class="admin-calendar-closed-label">마감</span>'
            : (count ? `<span class="admin-calendar-count">${count}건</span>` : "");
        button.innerHTML = `<span class="admin-calendar-day-number">${day}</span><span class="admin-calendar-status">${statusHTML}</span>`;
        fragment.appendChild(button);
    }

    grid.replaceChildren(fragment);
    renderAdminCalendarDayReservations();
}

function renderAdminCalendarDayReservations(){
    const list = getElement("adminCalendarReservationList");
    const dateLabel = getElement("adminCalendarSelectedDate");
    const countLabel = getElement("adminCalendarSelectedCount");
    if(!list) return;

    const dateKey = cleanText(adminCalendarSelectedDate);
    const reservations = sortReservations(
        getAllStoredReservations().filter(item=>cleanText(item.date) === dateKey)
    );

    if(dateLabel){ dateLabel.textContent = dateKey ? `${formatKoreanDate(dateKey)} 예약현황` : "날짜를 선택하세요"; }
    if(countLabel){ countLabel.textContent = `${reservations.length}건`; }

    const selectedCounts = {morning:0, afternoon:0, full:0};
    reservations.forEach(item=>{
        const key = normalizeTimeKey(item.time);
        if(Object.prototype.hasOwnProperty.call(selectedCounts, key)){ selectedCounts[key] += 1; }
    });
    const totalCount = getElement("adminSelectedTotalCount");
    const morningCount = getElement("adminSelectedMorningCount");
    const afternoonCount = getElement("adminSelectedAfternoonCount");
    const fullCount = getElement("adminSelectedFullCount");
    if(totalCount){ totalCount.textContent = String(reservations.length); }
    if(morningCount){ morningCount.textContent = String(selectedCounts.morning); }
    if(afternoonCount){ afternoonCount.textContent = String(selectedCounts.afternoon); }
    if(fullCount){ fullCount.textContent = String(selectedCounts.full); }

    if(!dateKey){
        list.innerHTML = '<div class="admin-empty-message">날짜를 선택하면 해당 날짜의 예약현황이 표시됩니다.</div>';
        return;
    }

    if(reservations.length === 0){
        const closure = getAdminClosureForDate(dateKey);
        list.innerHTML = `<div class="admin-empty-message">${closure ? `예약 마감일입니다.<br>사유: ${escapeHTML(cleanText(closure.reason) || "-")}` : "해당 날짜의 예약이 없습니다."}</div>`;
        return;
    }

    list.innerHTML = reservations.map(createAdminReservationItemHTML).join("");
    bindReservationDeleteButtons(list);
}

function selectAdminCalendarDate(dateKey){
    adminCalendarSelectedDate = cleanText(dateKey);
    const parts = adminCalendarSelectedDate.split("-").map(Number);
    if(parts.length === 3 && parts.every(Number.isFinite)){
        adminCalendarViewDate = new Date(parts[0], parts[1] - 1, 1);
    }
    renderAdminCalendar();
    const detail = getElement("adminCalendarDetailHeading");
    if(detail){ requestAnimationFrame(()=>detail.scrollIntoView({behavior:"smooth", block:"start"})); }
}

function moveAdminCalendarMonth(offset){
    adminCalendarViewDate = new Date(
        adminCalendarViewDate.getFullYear(),
        adminCalendarViewDate.getMonth() + offset,
        1
    );
    renderAdminCalendar();
}

function moveAdminCalendarToToday(){
    const today = new Date();
    adminCalendarViewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    adminCalendarSelectedDate = getTodayKey();
    renderAdminCalendar();
    const detail = getElement("adminCalendarDetailHeading");
    if(detail){ requestAnimationFrame(()=>detail.scrollIntoView({behavior:"smooth", block:"start"})); }
}

function resetAdminSearch(){
    const searchInput = getElement("adminSearchInput");
    if(searchInput){ searchInput.value = ""; }
    currentAdminKeyword = "";
    currentAdminFilter = "none";
    updateAdminFilterButtons();
    renderAdminReservationList();
}

function toggleAdminSection(bodyId, buttonId, forceOpen){
    const body = getElement(bodyId);
    const button = getElement(buttonId);
    if(!body || !button){ return; }
    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : body.classList.contains("hidden");
    body.classList.toggle("hidden", !shouldOpen);
    button.textContent = shouldOpen ? "접기" : "펼치기";
    button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
}

/* =========================================
   전체예약 필터
========================================= */

function scrollToAdminReservationStatus(){
    const section = getElement("adminReservationList");
    const card = section ? section.closest(".admin-card") : null;
    if(card){
        requestAnimationFrame(()=>card.scrollIntoView({behavior:"smooth", block:"start"}));
    }
}

function showAllAdminReservations(){

    currentAdminFilter = "all";
    currentAdminKeyword = "";
    const searchInput = getElement("adminSearchInput");
    if(searchInput){ searchInput.value = ""; }

    updateAdminFilterButtons();

    renderAdminReservationList();

    renderAdminCalendar();

}



/* =========================================
   오늘예약 필터
========================================= */

function showTodayAdminReservations(){

    currentAdminFilter = "today";
    currentAdminKeyword = "";
    const searchInput = getElement("adminSearchInput");
    if(searchInput){ searchInput.value = ""; }

    updateAdminFilterButtons();

    renderAdminReservationList();
    scrollToAdminReservationStatus();

}

function showWeekAdminReservations(){
    currentAdminFilter = "week";
    currentAdminKeyword = "";
    const searchInput = getElement("adminSearchInput");
    if(searchInput){ searchInput.value = ""; }
    updateAdminFilterButtons();
    renderAdminReservationList();
    scrollToAdminReservationStatus();
}

function collapseAdminReservationList(){
    currentAdminFilter = "none";
    currentAdminKeyword = "";
    const searchInput = getElement("adminSearchInput");
    if(searchInput){ searchInput.value = ""; }
    updateAdminFilterButtons();
    renderAdminReservationList();
}



/* =========================================
   필터 버튼 표시
========================================= */

function updateAdminFilterButtons(){

    const allButton =
        getElement("showAllAdminBtn");

    const todayButton =
        getElement("showTodayAdminBtn");

    const todaySummaryButton = getElement("adminTodaySummaryBtn");
    const weekSummaryButton = getElement("adminWeekSummaryBtn");
    const allSummaryButton = getElement("adminAllSummaryBtn");
    const closureSummaryButton = getElement("adminClosureSummaryBtn");


    if(allButton){

        allButton.classList.toggle(
            "selected",
            currentAdminFilter === "all"
        );

    }


    if(todayButton){

        todayButton.classList.toggle(
            "selected",
            currentAdminFilter === "today"
        );

    }

    if(todaySummaryButton){ todaySummaryButton.classList.toggle("selected", currentAdminFilter === "today"); }
    if(weekSummaryButton){ weekSummaryButton.classList.toggle("selected", currentAdminFilter === "week"); }
    if(allSummaryButton){ allSummaryButton.classList.toggle("selected", currentAdminFilter === "all"); }
    if(closureSummaryButton){ closureSummaryButton.classList.remove("selected"); }

}



/* =========================================
   관리자 검색
========================================= */

function runAdminSearch(){

    const searchInput =
        getElement("adminSearchInput");


    currentAdminKeyword = searchInput ? cleanText(searchInput.value) : "";
    currentAdminFilter = currentAdminKeyword ? "all" : "none";
    renderAdminReservationList();

}



/* =========================================
   예약 삭제
========================================= */

function deleteAdminReservation(
    reservationId
){

    const targetId =
        cleanText(reservationId);


    if(!targetId){

        alert("예약 정보를 확인할 수 없습니다.");

        return;

    }


    const reservation =
        getAllStoredReservations()
        .find(
            item=>
                cleanText(item.id) === targetId
        );


    if(!reservation){

        alert(
            "이미 삭제되었거나 존재하지 않는 예약입니다."
        );

        refreshAdminScreen();

        return;

    }


    const personName =
        [
            cleanText(reservation.rank),
            cleanText(reservation.name)
        ]
        .filter(Boolean)
        .join(" ");


    const confirmed =
        confirm(
            `${formatKoreanDate(reservation.date)}\n` +
            `${getTimeLabel(reservation.time)} ` +
            `${reservation.station}번 작업대\n` +
            `${personName} / ${reservation.unit}\n\n` +
            "이 예약을 삭제하시겠습니까?"
        );


    if(!confirmed){

        return;

    }


    const deleted =
        deleteStoredReservation(
            targetId
        );


    if(!deleted){

        alert("예약 삭제에 실패했습니다.");

        return;

    }


    alert("예약이 삭제되었습니다.");


    refreshAdminScreen();

}



/* =========================================
   공지사항 편집창 불러오기
========================================= */

function loadNoticeEditor(){

    const notices =
        loadNotices();


    for(
        let index = 1;
        index <= 5;
        index++
    ){

        const typeElement =
            getElement(
                `noticeType${index}`
            );

        const textElement =
            getElement(
                `noticeText${index}`
            );

        const notice =
            notices[index - 1];


        if(typeElement){

            typeElement.value =
                notice
                    ? normalizeNoticeType(
                        notice.type
                    )
                    : "general";

        }


        if(textElement){

            textElement.value =
                notice
                    ? cleanText(
                        notice.text
                    )
                    : "";

        }

    }


    showNoticeSaveMessage("");

}



/* =========================================
   공지사항 편집값 가져오기
========================================= */

function getNoticeEditorData(){

    const notices = [];


    for(
        let index = 1;
        index <= 5;
        index++
    ){

        const typeElement =
            getElement(
                `noticeType${index}`
            );

        const textElement =
            getElement(
                `noticeText${index}`
            );

        const text =
            textElement
                ? cleanText(
                    textElement.value
                )
                : "";


        if(!text){

            continue;

        }


        notices.push({

            id:`notice-${index}`,

            type:
                typeElement
                    ? normalizeNoticeType(
                        typeElement.value
                    )
                    : "general",

            text:text

        });

    }


    return notices;

}



/* =========================================
   공지 저장 메시지
========================================= */

function showNoticeSaveMessage(
    message,
    isError = false
){

    const messageElement =
        getElement(
            "noticeSaveMessage"
        );


    if(!messageElement){

        return;

    }


    messageElement.textContent =
        cleanText(message);


    messageElement.style.color =
        isError
            ? "#d32f2f"
            : "#2e7d32";

}



/* =========================================
   공지사항 저장
========================================= */

function saveAdminNotices(){

    const notices =
        getNoticeEditorData();


    if(notices.length === 0){

        const confirmed =
            confirm(
                "입력된 공지사항이 없습니다.\n공지사항을 모두 비우시겠습니까?"
            );


        if(!confirmed){

            return;

        }

    }


    const saved =
        saveNotices(
            notices
        );


    if(!saved){

        showNoticeSaveMessage(
            "공지사항 저장에 실패했습니다.",
            true
        );

        return;

    }


    showNoticeSaveMessage(
        "공지사항이 저장되었습니다."
    );


    alert(
        "공지사항이 저장되었습니다."
    );

}



/* =========================================
   기본 공지사항 복원
========================================= */

function restoreDefaultNotices(){

    const confirmed =
        confirm(
            "공지사항을 기본 내용으로 복원하시겠습니까?"
        );


    if(!confirmed){

        return;

    }


    const result =
        resetNoticesToDefault();


    if(!result.success){

        showNoticeSaveMessage(
            "기본 공지 복원에 실패했습니다.",
            true
        );

        return;

    }


    loadNoticeEditor();


    showNoticeSaveMessage(
        "기본 공지사항으로 복원되었습니다."
    );


    alert(
        "기본 공지사항으로 복원되었습니다."
    );

}



/* =========================================
   관리자 화면 새로고침
========================================= */

function refreshAdminScreen(){

    renderAdminStatistics();

    updateAdminFilterButtons();

    renderAdminReservationList();

    renderAdminCalendar();

}



/* =========================================
   관리자 이벤트 연결
========================================= */

function bindAdminEvents(){

    const loginButton =
        getElement("adminLoginBtn");

    const passwordInput =
        getElement("adminPasswordInput");

    const showMasterButton =
        getElement("showMasterLoginBtn");

    const masterLoginButton =
        getElement("masterLoginBtn");

    const masterCodeInput =
        getElement("masterCodeInput");

    const changePasswordButton =
        getElement("changeAdminPasswordBtn");

    const userPageButton =
        getElement("userPageBtn");

    const allButton =
        getElement("showAllAdminBtn");

    const todayButton =
        getElement("showTodayAdminBtn");

    const todaySummaryButton =
        getElement("adminTodaySummaryBtn");

    const weekSummaryButton =
        getElement("adminWeekSummaryBtn");

    const allSummaryButton =
        getElement("adminAllSummaryBtn");

    const closureSummaryButton =
        getElement("adminClosureSummaryBtn");

    const closeAdminStatusButton =
        getElement("closeAdminStatusBtn");

    const searchButton =
        getElement("adminSearchBtn");

    const searchResetButton =
        getElement("adminSearchResetBtn");

    const searchInput =
        getElement("adminSearchInput");

    const saveNoticeButton =
        getElement("saveNoticeBtn");

    const resetNoticeButton =
        getElement("resetNoticeBtn");

    const listElement =
        getElement("adminReservationList");

    const adminCalendarPrevBtn =
        getElement("adminCalendarPrevBtn");

    const adminCalendarNextBtn =
        getElement("adminCalendarNextBtn");

    const toggleClosureSectionBtn = getElement("toggleClosureSectionBtn");
    const toggleNoticeSectionBtn = getElement("toggleNoticeSectionBtn");
    const adminScrollTopBtn = getElement("adminScrollTopBtn");

    const adminCalendarGrid =
        getElement("adminCalendarGrid");

    const adminCalendarList =
        getElement("adminCalendarReservationList");


    if(loginButton){

        loginButton.addEventListener(
            "click",
            loginAdmin
        );

    }


    if(passwordInput){

        passwordInput.addEventListener(
            "keydown",
            event=>{

                if(event.key === "Enter"){

                    loginAdmin();

                }

            }
        );

    }


    if(showMasterButton){
        showMasterButton.addEventListener("click", showMasterLoginArea);
    }

    if(masterLoginButton){
        masterLoginButton.addEventListener("click", loginMaster);
    }

    if(masterCodeInput){
        masterCodeInput.addEventListener("keydown", event=>{
            if(event.key === "Enter"){ loginMaster(); }
        });
    }

    if(changePasswordButton){
        changePasswordButton.addEventListener("click", changeAdminPassword);
    }

    if(userPageButton){

        userPageButton.addEventListener(
            "click",
            moveToUserPage
        );

    }


    if(allButton){

        allButton.addEventListener(
            "click",
            showAllAdminReservations
        );

    }


    if(todayButton){

        todayButton.addEventListener(
            "click",
            showTodayAdminReservations
        );

    }

    if(todaySummaryButton){ todaySummaryButton.addEventListener("click", showTodayAdminReservations); }
    if(weekSummaryButton){ weekSummaryButton.addEventListener("click", showWeekAdminReservations); }
    if(allSummaryButton){ allSummaryButton.addEventListener("click", ()=>{
        if(currentAdminFilter === "all" && !currentAdminKeyword){ collapseAdminReservationList(); }
        else{ showAllAdminReservations(); }
    }); }
    if(closureSummaryButton){ closureSummaryButton.addEventListener("click", ()=>{
        updateAdminFilterButtons();
        closureSummaryButton.classList.add("selected");
        const section = getElement("closureManagementSection") || document.querySelector(".closure-management-card");
        toggleAdminSection("closureManagementBody", "toggleClosureSectionBtn", true);
        if(section){ section.scrollIntoView({behavior:"smooth", block:"start"}); }
    }); }


    if(closeAdminStatusButton){
        closeAdminStatusButton.addEventListener("click", collapseAdminReservationList);
    }

    if(searchButton){
        searchButton.addEventListener("click", runAdminSearch);
    }

    if(searchResetButton){
        searchResetButton.addEventListener("click", resetAdminSearch);
    }


    if(searchInput){

        searchInput.addEventListener(
            "keydown",
            event=>{

                if(event.key === "Enter"){

                    runAdminSearch();

                }

            }
        );


        searchInput.addEventListener(
            "input",
            ()=>{

                if(
                    cleanText(
                        searchInput.value
                    ) === ""
                ){

                    currentAdminKeyword = "";
                    currentAdminFilter = "none";
                    renderAdminReservationList();

                }

            }
        );

    }


    if(saveNoticeButton){

        saveNoticeButton.addEventListener(
            "click",
            saveAdminNotices
        );

    }


    if(resetNoticeButton){

        resetNoticeButton.addEventListener(
            "click",
            restoreDefaultNotices
        );

    }


    if(adminCalendarPrevBtn){
        adminCalendarPrevBtn.addEventListener("click", ()=>moveAdminCalendarMonth(-1));
    }

    if(adminCalendarNextBtn){
        adminCalendarNextBtn.addEventListener("click", ()=>moveAdminCalendarMonth(1));
    }


    if(toggleClosureSectionBtn){
        toggleClosureSectionBtn.addEventListener("click", ()=>toggleAdminSection("closureManagementBody", "toggleClosureSectionBtn"));
    }

    if(toggleNoticeSectionBtn){
        toggleNoticeSectionBtn.addEventListener("click", ()=>toggleAdminSection("noticeManagementBody", "toggleNoticeSectionBtn"));
    }

    if(adminScrollTopBtn){
        adminScrollTopBtn.addEventListener("click", ()=>window.scrollTo({top:0, behavior:"smooth"}));
        window.addEventListener("scroll", ()=>{
            adminScrollTopBtn.classList.toggle("visible", window.scrollY > 500);
        }, {passive:true});
    }

    if(adminCalendarGrid){
        adminCalendarGrid.addEventListener("click", event=>{
            const button = event.target.closest("button[data-date]");
            if(button){ selectAdminCalendarDate(button.dataset.date); }
        });
    }

    /* 삭제 버튼은 목록을 그릴 때 각 버튼에 직접 연결한다.
       Acode 미리보기에서 동적 목록의 위임 클릭이 누락되는 현상을 방지한다. */
    void adminCalendarList;
    void listElement;

}



/* =========================================
   관리자 초기화
========================================= */

let adminInitialized = false;

function initializeAdmin(){

    if(adminInitialized){
        return;
    }

    adminInitialized = true;

    try{

        /* 로그인 전에는 무거운 예약·공지 렌더링을 하지 않는다. */
        bindAdminEvents();

        updateAdminFilterButtons();

    }catch(error){

        adminInitialized = false;

        console.error(
            "관리자 화면 초기화 오류",
            error
        );


        alert(
            "관리자 화면을 불러오는 중 오류가 발생했습니다."
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

            refreshAdminScreen();

        }


        if(
            event.key ===
            "electricPracticeNoticesV61"
        ){

            loadNoticeEditor();

        }

    }
);



/* =========================================
   페이지 시작
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeAdmin
);



/* =========================================
   전역 공개
========================================= */

window.loginAdmin =
    loginAdmin;

window.moveToUserPage =
    moveToUserPage;

window.renderAdminStatistics =
    renderAdminStatistics;

window.renderAdminReservationList =
    renderAdminReservationList;

window.showAllAdminReservations =
    showAllAdminReservations;

window.showTodayAdminReservations =
    showTodayAdminReservations;

window.runAdminSearch =
    runAdminSearch;

window.resetAdminSearch = resetAdminSearch;

window.deleteAdminReservation =
    deleteAdminReservation;

window.loadNoticeEditor =
    loadNoticeEditor;

window.getNoticeEditorData =
    getNoticeEditorData;

window.saveAdminNotices =
    saveAdminNotices;

window.restoreDefaultNotices =
    restoreDefaultNotices;

window.refreshAdminScreen =
    refreshAdminScreen;

window.initializeAdmin =
    initializeAdmin;