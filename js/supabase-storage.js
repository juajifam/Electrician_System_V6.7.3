/*
 * 전기기능사 실습실 예약·관리 시스템
 * Supabase 공용 예약 저장 어댑터
 *
 * 기존 화면·검증 로직은 유지하면서 예약 데이터만 Supabase와 동기화한다.
 */
"use strict";

(function(){
    const config = window.SUPABASE_CONFIG;
    const supabaseFactory = window.supabase && window.supabase.createClient;

    if(!config || !supabaseFactory){
        console.error("Supabase 라이브러리 또는 연결 설정을 불러오지 못했습니다.");
        return;
    }

    const client = supabaseFactory(config.url, config.publishableKey, {
        auth:{ persistSession:false, autoRefreshToken:false },
        realtime:{ params:{ eventsPerSecond:10 } }
    });

    window.electricSupabase = client;

    const localLoadReservations = loadReservations;
    const localSaveReservations = saveReservations;
    const localAddStoredReservation = addStoredReservation;
    const localDeleteStoredReservation = deleteStoredReservation;
    const localUpdateStoredReservation = updateStoredReservation;
    const localDeleteByDateRange = deleteStoredReservationsByDateRange;

    let remoteReady = false;
    let syncInProgress = false;
    let realtimeChannel = null;

    function makeUuid(){
        if(window.crypto && typeof window.crypto.randomUUID === "function"){
            return window.crypto.randomUUID();
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character=>{
            const random = Math.random() * 16 | 0;
            const value = character === "x" ? random : (random & 0x3 | 0x8);
            return value.toString(16);
        });
    }

    /* 새 예약 ID를 DB의 uuid 형식과 동일하게 만든다. */
    window.createReservationId = makeUuid;
    try{ createReservationId = makeUuid; }catch(error){ void error; }

    function rowToReservation(row){
        return normalizeReservation({
            id: row.id,
            rank: row.rank,
            militaryId: row.military_id || "",
            name: row.name,
            unit: row.unit || "",
            phone: row.phone,
            date: row.reservation_date,
            time: row.time_slot || row.period,
            station: row.workstation,
            createdAt: row.client_created_at || row.created_at
        });
    }

    function reservationToRow(reservation){
        const normalized = normalizeReservation(reservation);
        const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized.id)
            ? normalized.id
            : makeUuid();

        normalized.id = id;

        return {
            id,
            reservation_date: normalized.date,
            workstation: normalized.station,
            period: normalized.time,
            time_slot: normalized.time,
            rank: normalized.rank,
            military_id: normalized.militaryId,
            name: normalized.name,
            unit: normalized.unit,
            phone: normalized.phone,
            client_created_at: normalized.createdAt || new Date().toISOString()
        };
    }

    function notifyRefresh(){
        try{
            window.dispatchEvent(new CustomEvent("electric-reservations-synced"));
        }catch(error){
            void error;
        }

        if(typeof window.refreshReservationSystem === "function"){
            window.refreshReservationSystem();
        }
        if(typeof window.refreshAdminScreen === "function"){
            window.refreshAdminScreen();
        }
        if(typeof window.refreshMyReservationSearch === "function"){
            window.refreshMyReservationSearch();
        }
    }

    function showConnectionMessage(message, isError){
        console[isError ? "error" : "info"](message);
        if(typeof window.showMessage === "function"){
            window.showMessage(message, isError ? "error" : "success");
        }
    }

    async function syncRemoteReservations(options={}){
        if(syncInProgress){ return false; }
        syncInProgress = true;

        try{
            const { data, error } = await client
                .from(config.table)
                .select("id,reservation_date,workstation,period,time_slot,rank,military_id,name,unit,phone,created_at,client_created_at")
                .order("reservation_date", { ascending:true })
                .order("workstation", { ascending:true });

            if(error){ throw error; }

            const normalized = normalizeReservationArray((data || []).map(rowToReservation));
            localSaveReservations(normalized);
            remoteReady = true;
            notifyRefresh();
            return true;
        }catch(error){
            console.error("Supabase 예약 동기화 오류", error);
            if(options.showError){
                showConnectionMessage("공용 예약 데이터를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.", true);
            }
            return false;
        }finally{
            syncInProgress = false;
        }
    }

    function loadReservationsFromSharedCache(){
        return localLoadReservations();
    }

    function addSharedReservation(reservation){
        const normalized = normalizeReservation(reservation);
        const row = reservationToRow(normalized);
        normalized.id = row.id;

        const localResult = localAddStoredReservation(normalized);
        if(!localResult.success){ return localResult; }

        client
            .from(config.table)
            .insert(row)
            .then(({ error })=>{
                if(error){
                    localDeleteStoredReservation(normalized.id);
                    notifyRefresh();
                    const conflict = String(error.code) === "23P01" || String(error.code) === "23505";
                    showConnectionMessage(
                        conflict
                            ? "다른 사용자가 먼저 예약했습니다. 예약 현황을 다시 확인해 주세요."
                            : "공용 데이터베이스 저장에 실패했습니다. 예약이 취소되었습니다.",
                        true
                    );
                    return;
                }
                syncRemoteReservations();
            });

        return {
            success:true,
            message:"예약이 공용 데이터베이스에 저장 중입니다.",
            reservation:normalized
        };
    }

    function deleteSharedReservation(reservationId){
        const id = cleanText(reservationId);
        const deletedLocally = localDeleteStoredReservation(id);
        if(!deletedLocally){ return false; }

        client
            .from(config.table)
            .delete()
            .eq("id", id)
            .then(({ error })=>{
                if(error){
                    showConnectionMessage("공용 데이터베이스에서 예약 삭제에 실패했습니다. 화면을 새로고침해 주세요.", true);
                }
                syncRemoteReservations();
            });

        return true;
    }

    function updateSharedReservation(reservationId, updateData){
        const localResult = localUpdateStoredReservation(reservationId, updateData);
        if(!localResult.success || !localResult.reservation){ return localResult; }

        const row = reservationToRow(localResult.reservation);
        client
            .from(config.table)
            .update(row)
            .eq("id", reservationId)
            .then(({ error })=>{
                if(error){
                    showConnectionMessage("예약 수정 내용을 공용 데이터베이스에 저장하지 못했습니다.", true);
                }
                syncRemoteReservations();
            });

        return localResult;
    }

    function deleteSharedReservationsByDateRange(startDate, endDate){
        const localResult = localDeleteByDateRange(startDate, endDate);
        if(!localResult.success){ return localResult; }

        client
            .from(config.table)
            .delete()
            .gte("reservation_date", normalizeDateKey(startDate))
            .lte("reservation_date", normalizeDateKey(endDate))
            .then(({ error })=>{
                if(error){
                    showConnectionMessage("마감 기간의 공용 예약 삭제에 실패했습니다.", true);
                }
                syncRemoteReservations();
            });

        return localResult;
    }

    /* 기존 동기식 화면 코드와 호환되는 전역 함수로 교체 */
    loadReservations = loadReservationsFromSharedCache;
    addStoredReservation = addSharedReservation;
    deleteStoredReservation = deleteSharedReservation;
    updateStoredReservation = updateSharedReservation;
    deleteStoredReservationsByDateRange = deleteSharedReservationsByDateRange;

    window.loadReservations = loadReservationsFromSharedCache;
    window.addStoredReservation = addSharedReservation;
    window.deleteStoredReservation = deleteSharedReservation;
    window.updateStoredReservation = updateSharedReservation;
    window.deleteStoredReservationsByDateRange = deleteSharedReservationsByDateRange;
    window.syncRemoteReservations = syncRemoteReservations;
    window.isSharedReservationReady = ()=>remoteReady;

    function startRealtime(){
        if(realtimeChannel){ return; }
        realtimeChannel = client
            .channel("electric-reservations-live")
            .on(
                "postgres_changes",
                { event:"*", schema:"public", table:config.table },
                ()=>syncRemoteReservations()
            )
            .subscribe();
    }

    /* 페이지가 뜨면 서버 데이터를 우선 불러오고 실시간 변경을 감시한다. */
    syncRemoteReservations({ showError:true }).finally(startRealtime);
    window.addEventListener("online", ()=>syncRemoteReservations());
    document.addEventListener("visibilitychange", ()=>{
        if(document.visibilityState === "visible"){
            syncRemoteReservations();
        }
    });
})();
