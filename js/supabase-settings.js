/*
 * 전기기능사 실습실 예약·관리 시스템
 * Supabase 공용 설정 어댑터 (공지사항 · 예약 마감)
 *
 * 관리자가 바꾼 공지사항과 예약 마감(예약불가 날짜)을 Supabase에 저장하고,
 * 모든 사용자 화면이 같은 내용을 보도록 동기화한다.
 * 기존 화면 코드는 그대로 두고 저장·불러오기 함수만 교체한다.
 */
"use strict";

(function(){
    const client = window.electricSupabase;

    if(!client){
        console.error("Supabase 연결이 없어 공지사항·예약 마감 동기화를 건너뜁니다.");
        return;
    }

    const TABLE = "app_settings";
    const NOTICE_KEY = "notices";
    const CLOSURE_KEY = "closures";
    const LOCAL_NOTICE_KEY = "electricPracticeNoticesV61";
    const LOCAL_CLOSURE_KEY = "electricPracticeClosuresV62";

    const localSaveNotices = saveNotices;
    const localSaveClosures = saveClosures;

    const migrationTried = {};
    let pendingPushes = 0;
    let syncing = false;
    let resyncRequested = false;
    let closureCacheRaw = null;
    let closureCacheData = [];

    function isAdminPage(){
        return typeof initializeAdmin === "function";
    }

    function readLocalArray(storageKey){
        try{
            const raw = localStorage.getItem(storageKey);
            if(!raw){ return []; }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        }catch(error){
            console.error("저장 데이터 읽기 오류", storageKey, error);
            return [];
        }
    }

    function writeLocalIfDifferent(storageKey, items){
        const raw = JSON.stringify(items);
        try{
            if(localStorage.getItem(storageKey) === raw){ return false; }
            localStorage.setItem(storageKey, raw);
            return true;
        }catch(error){
            console.error("저장 데이터 기록 오류", storageKey, error);
            return false;
        }
    }

    function cleanClosureList(items){
        return (Array.isArray(items) ? items : []).filter(item=>
            item && typeof item === "object" &&
            typeof item.startDate === "string" &&
            typeof item.endDate === "string"
        );
    }

    /* ---------- 공지사항 ---------- */

    /* 기본 공지를 저장소에 기록하지 않고 보여주기만 한다.
       (기록하면 새 기기에서 열 때 관리자가 쓴 공지를 덮어쓸 수 있다.) */
    function loadNoticesShared(){
        const stored = normalizeNoticeArray(readLocalArray(LOCAL_NOTICE_KEY));
        return stored.length > 0 ? stored : getDefaultNotices();
    }

    function saveNoticesShared(notices){
        const normalized = normalizeNoticeArray(notices);
        const saved = localSaveNotices(normalized);
        if(!saved){ return false; }
        pushSetting(NOTICE_KEY, normalized, "공지사항");
        return true;
    }

    /* ---------- 예약 마감 ---------- */

    function loadClosuresShared(){
        let raw = "[]";
        try{
            raw = localStorage.getItem(LOCAL_CLOSURE_KEY) || "[]";
        }catch(error){
            void error;
        }
        if(raw !== closureCacheRaw){
            let parsed = [];
            try{
                const data = JSON.parse(raw);
                parsed = Array.isArray(data) ? data : [];
            }catch(error){
                console.error("마감 데이터 읽기 오류", error);
            }
            closureCacheRaw = raw;
            closureCacheData = parsed;
        }
        return closureCacheData.slice();
    }

    function saveClosuresShared(items){
        const safeItems = Array.isArray(items) ? items : [];
        const saved = localSaveClosures(safeItems);
        if(!saved){ return false; }
        closureCacheRaw = null;
        pushSetting(CLOSURE_KEY, safeItems, "예약 마감");
        return true;
    }

    /* ---------- Supabase 저장 ---------- */

    async function pushSetting(key, value, label){
        pendingPushes += 1;
        try{
            const { error } = await client
                .from(TABLE)
                .upsert(
                    { key, value, updated_at:new Date().toISOString() },
                    { onConflict:"key" }
                );
            if(error){ throw error; }
        }catch(error){
            console.error(`${label} 공용 저장 오류`, error);
            alert(`${label}을(를) 공용 저장소에 저장하지 못했습니다.\n인터넷 연결을 확인하고 다시 저장해 주세요.\n(이 기기에서만 바뀌어 보이며 다른 사람에게는 적용되지 않았습니다.)`);
        }finally{
            pendingPushes -= 1;
            syncSettings();
        }
    }

    /* ---------- Supabase 불러오기 ---------- */

    function safeCall(fn){
        try{ fn(); }catch(error){ console.error("화면 새로고침 오류", error); }
    }

    function refreshAfterSync(changed){
        if(changed.notices){
            if(typeof renderNotices === "function"){ safeCall(renderNotices); }

            const active = document.activeElement;
            const editing = active && /^noticeText\d$/.test(active.id || "");
            if(isAdminPage() && !editing && typeof loadNoticeEditor === "function"){
                safeCall(loadNoticeEditor);
            }
        }

        if(changed.closures){
            if(typeof window.refreshReservationSystem === "function"){
                safeCall(window.refreshReservationSystem);
            }
            if(typeof window.renderClosureList === "function"){
                safeCall(window.renderClosureList);
            }
            if(typeof window.refreshAdminScreen === "function"){
                safeCall(window.refreshAdminScreen);
            }
        }
    }

    async function syncSettings(){
        if(pendingPushes > 0){ return; }
        if(syncing){ resyncRequested = true; return; }
        syncing = true;

        try{
            const { data, error } = await client
                .from(TABLE)
                .select("key,value")
                .in("key", [NOTICE_KEY, CLOSURE_KEY]);

            if(error){ throw error; }

            const remote = {};
            (data || []).forEach(row=>{ remote[row.key] = row.value; });

            const changed = { notices:false, closures:false };

            if(Array.isArray(remote[NOTICE_KEY])){
                changed.notices = writeLocalIfDifferent(
                    LOCAL_NOTICE_KEY,
                    normalizeNoticeArray(remote[NOTICE_KEY])
                );
            }else if(isAdminPage() && !migrationTried[NOTICE_KEY]){
                /* 처음 한 번만: 관리자 기기에 있던 기존 공지를 공용 저장소로 올린다. */
                migrationTried[NOTICE_KEY] = true;
                const localNotices = normalizeNoticeArray(readLocalArray(LOCAL_NOTICE_KEY));
                if(localNotices.length > 0){
                    pushSetting(NOTICE_KEY, localNotices, "공지사항");
                }
            }

            if(Array.isArray(remote[CLOSURE_KEY])){
                changed.closures = writeLocalIfDifferent(
                    LOCAL_CLOSURE_KEY,
                    cleanClosureList(remote[CLOSURE_KEY])
                );
                if(changed.closures){ closureCacheRaw = null; }
            }else if(isAdminPage() && !migrationTried[CLOSURE_KEY]){
                /* 처음 한 번만: 관리자 기기에 있던 기존 예약 마감을 공용 저장소로 올린다. */
                migrationTried[CLOSURE_KEY] = true;
                const localClosures = cleanClosureList(readLocalArray(LOCAL_CLOSURE_KEY));
                if(localClosures.length > 0){
                    pushSetting(CLOSURE_KEY, localClosures, "예약 마감");
                }
            }

            refreshAfterSync(changed);
        }catch(error){
            console.error("공지·마감 동기화 오류", error);
        }finally{
            syncing = false;
            if(resyncRequested){
                resyncRequested = false;
                setTimeout(syncSettings, 0);
            }
        }
    }

    /* ---------- 기존 함수 교체 ---------- */

    loadNotices = loadNoticesShared;
    saveNotices = saveNoticesShared;
    loadClosures = loadClosuresShared;
    saveClosures = saveClosuresShared;

    window.loadNotices = loadNoticesShared;
    window.saveNotices = saveNoticesShared;
    window.loadClosures = loadClosuresShared;
    window.saveClosures = saveClosuresShared;
    window.syncSettings = syncSettings;

    function startRealtime(){
        client
            .channel("electric-settings-live")
            .on(
                "postgres_changes",
                { event:"*", schema:"public", table:TABLE },
                ()=>syncSettings()
            )
            .subscribe();
    }

    syncSettings().finally(startRealtime);
    window.addEventListener("online", ()=>syncSettings());
    document.addEventListener("visibilitychange", ()=>{
        if(document.visibilityState === "visible"){
            syncSettings();
        }
    });
})();
