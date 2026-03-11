// ==========================================
// 0. BAZA DANYCH FIREBASE I LOGOWANIE (TRYB PREZESA)
// ==========================================

const firebaseConfig = {
  // TU WKLEJ SWOJE KLUCZE FIREBASE!
  apiKey: "AIzaSyCk3Iy6R8K-IAbWABfSkGrDUlP5-sIWtvk",
  authDomain: "fpl-optimizer-2026.firebaseapp.com",
  projectId: "fpl-optimizer-2026",
  storageBucket: "fpl-optimizer-2026.firebasestorage.app",
  messagingSenderId: "401734980476",
  appId: "1:401734980476:web:b2f90a500cac651ef90af9"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let globalArchive = [];
let globalUsername = "Menedżer"; 
let currentGW = 1; 

const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const btnAuth = document.getElementById('auth-action-btn');

// Przycisk Logowania
btnAuth.addEventListener('click', () => {
    const rawUsername = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;

    if (!rawUsername || !password) {
        alert("Wpisz swój Login i Hasło!");
        return;
    }

    btnAuth.innerText = "Ładowanie...";

    // Trik: Przerabiamy Login na format emaila
    const safeUsername = rawUsername.trim();
    const fakeEmail = safeUsername.toLowerCase().replace(/\s+/g, '_') + "@fpl.local"; 

    // Logowanie
    auth.signInWithEmailAndPassword(fakeEmail, password)
        .catch((error) => { 
            alert("Błędny Login lub Hasło. (Jeśli to Twoje pierwsze logowanie, upewnij się u Prezesa Ligi, czy założył Ci konto)."); 
            btnAuth.innerText = "Wejdź do gry"; 
        });
});

// Wylogowywanie
document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        mainApp.style.display = 'none';
        authScreen.style.display = 'flex';
        document.getElementById('auth-password').value = '';
        globalArchive = []; 
    });
});

// Nasłuchiwanie stanu zalogowania
auth.onAuthStateChanged((user) => {
    if (user) {
        btnAuth.innerText = "Pobieranie danych...";
        const inputName = document.getElementById('auth-username').value.trim();
        
        db.collection("users").doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                // Konto już istnieje w bazie
                globalArchive = doc.data().archive || [];
                globalUsername = doc.data().username || "Menedżer";
            } else {
                // PIERWSZE LOGOWANIE - Admin założył konto, więc tworzymy mu miejsce w bazie!
                globalArchive = [];
                globalUsername = inputName || user.email.split('@')[0];
                db.collection("users").doc(user.uid).set({
                    username: globalUsername,
                    archive: []
                });
            }
            
            // Uruchomienie aplikacji
            authScreen.style.display = 'none';
            mainApp.style.display = 'block';
            
            updatePlayerDatalist();
            renderWelcomeStats();
            
            if (globalArchive.length > 0) {
                globalArchive.sort((a, b) => b.gwNumber - a.gwNumber);
                currentGW = globalArchive[0].gwNumber + 1;
                if (currentGW > 38) currentGW = 38;
                document.getElementById('gw-display').innerText = currentGW;
            }
            btnAuth.innerText = "Wejdź do gry";
        }).catch((error) => {
            alert("Błąd pobierania danych z chmury!");
            btnAuth.innerText = "Wejdź do gry";
        });
        
    } else {
        mainApp.style.display = 'none';
        authScreen.style.display = 'flex';
    }
});


// ==========================================
// 1. INICJALIZACJA I NAWIGACJA
// ==========================================
const defaultPositions = ["GK", "GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD"];
const defaultStarters = [0, 2, 3, 4, 7, 8, 9, 10, 12, 13, 14]; 
const playersListDiv = document.getElementById('players-list');

const positionsList = ['GK', 'DEF', 'MID', 'FWD'];
positionsList.forEach(pos => {
    let dl = document.createElement('datalist');
    dl.id = `used-players-${pos}`;
    document.body.appendChild(dl);
});

defaultPositions.forEach((pos, i) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    const isCapChecked = i === 0 ? 'checked' : ''; 
    const isVCapChecked = i === 1 ? 'checked' : ''; 
    const isStarterChecked = defaultStarters.includes(i) ? 'checked' : '';
    
    row.innerHTML = `
        <span style="width: 25px; font-weight: bold; color: #333;">${i + 1}.</span>
        <span class="p-pos-label" data-pos="${pos}">${pos}</span>
        <input type="text" class="p-name" list="used-players-${pos}" placeholder="Nazwisko piłkarza" autocomplete="off">
        <input type="number" class="p-pts" placeholder="Pkt" value="0">
        <label class="starter-toggle" title="W składzie wyjściowym">
            <input type="checkbox" class="p-start" ${isStarterChecked}>
            <span class="start-icon" title="Wyjściowy Skład">👕</span>
        </label>
        <label class="captain-toggle" title="Kapitan">
            <input type="radio" name="captain" class="p-cap" ${isCapChecked}>
            <span class="cap-icon" title="Kapitan">©️</span>
        </label>
        <label class="vcap-toggle" title="Wicekapitan">
            <input type="radio" name="vcaptain" class="p-vcap" ${isVCapChecked}>
            <span class="vcap-icon" title="Wicekapitan">🥈</span>
        </label>
        <label class="injury-toggle" title="Kontuzja / Blank">
            <input type="checkbox" class="p-inj">
            <span class="inj-icon" title="Kontuzja">🚑</span>
        </label>
        <label class="dgw-toggle" title="Double Gameweek">
            <input type="checkbox" class="p-dgw">
            <span class="dgw-icon" title="DGW">🔄</span>
        </label>
    `;
    playersListDiv.appendChild(row);
});

document.querySelectorAll('.nav-btn').forEach(btn => {
    if(btn.id === 'logout-btn') return;
    btn.addEventListener('click', function(e) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        if (this.classList.contains('dropdown-item')) {
            document.querySelector('.dropbtn').classList.add('active');
        } else {
            document.querySelector('.dropbtn').classList.remove('active');
        }

        document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active-section'));
        const targetId = this.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active-section');
        
        if(targetId === 'section-history') renderGameweekTabs();
        if(targetId === 'section-transfers') renderTransfers();
        if(targetId === 'section-best-team') { renderHallOfFame(); renderDreamTeam(); }
        if(targetId === 'section-chart') renderGlobalStatsAndChart(); 
        if(targetId === 'section-table') renderSummaryTable(); 
        if(targetId === 'section-assistant') renderAssistantAlerts(); 
        if(targetId === 'section-welcome') renderWelcomeStats();
        if(targetId === 'section-league') renderLeagueTable();
    });
});

document.getElementById('start-app-btn').addEventListener('click', () => {
    document.querySelector('.nav-btn[data-target="section-input"]').click();
});


// ==========================================
// 2. ALGORYTM OPTYMALIZACJI
// ==========================================
function getCombinations(array, k) {
    let results = [];
    function helper(start, combo) {
        if (combo.length === k) { results.push([...combo]); return; }
        for (let i = start; i < array.length; i++) { combo.push(array[i]); helper(i + 1, combo); combo.pop(); }
    }
    helper(0, []);
    return results;
}

function calculateOptimalPoints(squad, chip) {
    let maxPoints = -10000, bestLineup = null, capMult = (chip === 'tc') ? 3 : 2;

    if (chip === 'bb') {
        let baseSum = 0, highestScorer = -1000, optCapId = -1;
        squad.forEach((p, index) => { 
            baseSum += p.basePts; 
            if (!p.injured && p.basePts > highestScorer) { highestScorer = p.basePts; optCapId = index; }
        });
        let displaySquad = squad.map((p, index) => {
            let isOptCap = (index === optCapId);
            return { ...p, isOptimalCaptain: isOptCap, displayPts: isOptCap ? (p.basePts * capMult) : p.basePts };
        });
        return { points: baseSum + (highestScorer * (capMult - 1)), lineup: displaySquad };
    }

    const allCombinations = getCombinations(squad, 11);
    allCombinations.forEach(lineup => {
        let counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
        lineup.forEach(p => counts[p.position]++);

        if (counts.GK === 1 && counts.DEF >= 3 && counts.MID >= 2 && counts.FWD >= 1) {
            let baseSum = 0, highestScorer = -1000, penalty = 0, optCapName = "";
            lineup.forEach(p => { 
                baseSum += p.basePts;
                if (p.injured) penalty -= 1000; 
                if (!p.injured && p.basePts > highestScorer) { highestScorer = p.basePts; optCapName = p.name; }
            });
            let virtualPoints = baseSum + (highestScorer * (capMult - 1)) + penalty;
            let realPoints = baseSum + (highestScorer * (capMult - 1));

            if (virtualPoints > maxPoints) { 
                maxPoints = virtualPoints; 
                let capAssigned = false;
                let displayLineup = lineup.map(p => {
                    let isOptCap = (!p.injured && p.name === optCapName && p.basePts === highestScorer && !capAssigned);
                    if (isOptCap) capAssigned = true; 
                    return { ...p, isOptimalCaptain: isOptCap, displayPts: isOptCap ? (p.basePts * capMult) : p.basePts };
                });
                bestLineup = { lineup: displayLineup, realPoints: realPoints }; 
            }
        }
    });
    return { points: bestLineup.realPoints, lineup: bestLineup.lineup };
}

function calculateUserPoints(squad, chip) {
    let sum = 0;
    if (chip === 'bb') { squad.forEach(p => sum += p.points); } 
    else { squad.forEach(p => { if (p.isStarter) sum += p.points; }); }
    return sum;
}


// ==========================================
// 3. ARCHIWUM I FUNKCJE RENDEROWANIA (FIREBASE)
// ==========================================
let gwSortAsc = true, summarySortCol = 'average', summarySortAsc = false;
let formChartInstance = null; 

function getArchive() { return globalArchive; }

function saveGameweek(gwNumber, squad, optimalData, userData, chip) {
    const user = auth.currentUser;
    if (!user) { alert("Błąd: Nie jesteś zalogowany!"); return; }

    const index = globalArchive.findIndex(gw => gw.gwNumber === gwNumber);
    const gwData = { gwNumber, squad, optimalData, userData, chip };
    if (index >= 0) globalArchive[index] = gwData; else globalArchive.push(gwData);
    
    // Zapisujemy, ale podajemy 'username' z pamięci!
    db.collection("users").doc(user.uid).set({
        username: globalUsername, 
        archive: globalArchive
    }).then(() => {
        updatePlayerDatalist(); 
        renderWelcomeStats(); 
        alert(`Zapisano wyniki dla GW ${currentGW} w Chmurze!`);
    }).catch((error) => { alert("Błąd zapisu do chmury: " + error.message); });
}

function updatePlayerDatalist() {
    const archive = getArchive();
    const posSets = { GK: new Set(), DEF: new Set(), MID: new Set(), FWD: new Set() };
    archive.forEach(gw => { gw.squad.forEach(p => { if (p.name.trim() && posSets[p.position]) posSets[p.position].add(p.name.trim()); }); });
    ['GK', 'DEF', 'MID', 'FWD'].forEach(pos => {
        const dataList = document.getElementById(`used-players-${pos}`);
        dataList.innerHTML = '';
        Array.from(posSets[pos]).sort().forEach(name => {
            const option = document.createElement('option'); option.value = name; dataList.appendChild(option);
        });
    });
}

function renderTransfers() {
    let archive = getArchive();
    const container = document.getElementById('transfers-container');
    container.innerHTML = '';
    if (archive.length < 2) { container.innerHTML = '<p>Brak danych o transferach (min. 2 kolejki).</p>'; return; }
    
    archive.sort((a, b) => a.gwNumber - b.gwNumber);
    for (let i = archive.length - 1; i > 0; i--) {
        const currGW = archive[i], prevGW = archive[i-1];
        const currNames = currGW.squad.map(p => p.name.trim().toLowerCase()).filter(n => n !== "");
        const prevNames = prevGW.squad.map(p => p.name.trim().toLowerCase()).filter(n => n !== "");
        const transfersIn = currGW.squad.filter(p => p.name.trim() !== "" && !prevNames.includes(p.name.trim().toLowerCase()));
        const transfersOut = prevGW.squad.filter(p => p.name.trim() !== "" && !currNames.includes(p.name.trim().toLowerCase()));

        if (transfersIn.length > 0 || transfersOut.length > 0) {
            let inHtml = transfersIn.map(p => `🟢 Przyszli: ${p.name} (${p.position})`).join('<br>');
            let outHtml = transfersOut.map(p => `🔴 Odeszli: ${p.name} (${p.position})`).join('<br>');
            container.innerHTML += `<div class="transfer-card" style="color: #333;"><h3 style="margin-top:0; color:var(--fpl-purple);">Przed GW ${currGW.gwNumber}</h3><p class="transfer-in">${inHtml}</p><p class="transfer-out">${outHtml}</p></div>`;
        }
    }
    if (container.innerHTML === '') container.innerHTML = '<p>Brak transferów pomiędzy kolejkami.</p>';
}

function renderGameweekTabs() {
    const archive = getArchive();
    const container = document.getElementById('gw-tabs-container');
    container.innerHTML = '';
    if (archive.length === 0) { document.getElementById('gw-details-panel').innerHTML = '<p style="color:#333;">Brak zapisanych kolejek.</p>'; return; }

    archive.sort((a, b) => gwSortAsc ? a.gwNumber - b.gwNumber : b.gwNumber - a.gwNumber);
    archive.forEach(gw => {
        const btn = document.createElement('button');
        btn.className = 'gw-tab';
        btn.innerText = `GW ${gw.gwNumber}`;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.gw-tab').forEach(b => b.classList.remove('active-tab'));
            btn.classList.add('active-tab');
            showGameweekDetails(gw);
        });
        container.appendChild(btn);
    });
}

function generateLineupHtml(squadList, isOptimalView = false) {
    const sortOrder = { "GK": 1, "DEF": 2, "MID": 3, "FWD": 4 };
    let html = '<ul style="list-style-type: none; padding-left: 0; color: #333;">';
    squadList.sort((a, b) => sortOrder[a.position] - sortOrder[b.position]).forEach(p => {
        let isCap = isOptimalView ? p.isOptimalCaptain : p.isCaptain;
        let isVCap = !isOptimalView && p.isVCaptain ? ' <span style="color:gray;">🥈</span>' : '';
        let extraIcon = isCap ? ' <strong style="color:var(--fpl-burgundy);">©️</strong>' : isVCap;
        let injText = p.injured ? ' <span style="color:red; font-size:12px;">(🚑)</span>' : '';
        let dgwText = p.isDGW ? ' <span style="color:blue; font-size:12px;">(🔄)</span>' : '';
        let displayPoints = isOptimalView ? p.displayPts : p.points;
        html += `<li><strong style="color:var(--fpl-purple);">${p.position}</strong> - ${p.name}: <strong>${displayPoints} pkt</strong>${extraIcon}${injText}${dgwText}</li>`;
    });
    html += '</ul>';
    return html;
}

function showGameweekDetails(gw) {
    const panel = document.getElementById('gw-details-panel');
    const capMultiplier = (gw.chip === 'tc') ? 3 : 2;
    const userStarters = gw.squad.filter(p => p.isStarter);
    const userBench = gw.squad.filter(p => !p.isStarter);
    const optimalLineup = gw.optimalData.lineup;

    let lineupDiff = gw.optimalData.points - gw.userData.points;
    let lineupDiffText = lineupDiff > 0 ? `<span style="color: red;">Zostawiłeś ${lineupDiff} pkt na ławce/wybrałeś złego kapitana!</span>` : `<span style="color: green;">Zagrałeś perfekcyjnie! Optymalny wynik!</span>`;

    let activeCap = gw.userData.userCap;
    let vcapNote = "";
    if (activeCap && activeCap.injured && gw.userData.userVCap) {
        activeCap = gw.userData.userVCap;
        vcapNote = `<br><span style="color:orange; font-size:12px;">(Kapitan 🚑. Punktuje Wicekapitan)</span>`;
    }

    let userCapPts = activeCap ? activeCap.points : 0; 
    let bestCapBase = gw.optimalData.bestCap ? (gw.optimalData.bestCap.basePts !== undefined ? gw.optimalData.bestCap.basePts : gw.optimalData.bestCap.points) : 0;
    let bestCapPts = bestCapBase * capMultiplier;

    panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; color: #333;">
            <div>
                <h3>Szczegóły Kolejki: GW ${gw.gwNumber}</h3>
                <p><strong>Użyty Chip:</strong> ${gw.chip.toUpperCase()}</p>
            </div>
            <button id="edit-gw-btn" class="btn-primary" style="background-color: #f39c12; color: #fff;">✏️ Edytuj tę kolejkę</button>
        </div>
        
        <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; margin-top: 15px;">
            <div style="flex: 1; background: #fff; color: #333; padding: 15px; border-radius: 8px; border: 2px solid var(--fpl-burgundy);">
                <h4 style="margin-top:0; color:var(--fpl-purple);">Twój Wynik</h4>
                <p class="big-score" style="color:var(--fpl-burgundy);">${gw.userData.points} pkt</p>
                <p><strong>Werdykt Składu:</strong><br>${lineupDiffText}</p>
            </div>
            <div style="flex: 1; background: #fff; color: #333; padding: 15px; border-radius: 8px; border: 2px solid var(--fpl-blue);">
                <h4 style="margin-top:0; color:var(--fpl-purple);">Optymalny Wynik</h4>
                <p class="big-score" style="color:var(--fpl-blue);">${gw.optimalData.points} pkt</p>
                <p><strong>Raport Kapitański:</strong><br>Twój (©️ ${activeCap ? activeCap.name : "Brak"}): ${userCapPts} pkt ${vcapNote}<br>Najlepszy (©️ ${gw.optimalData.bestCap ? gw.optimalData.bestCap.name : "Brak"}): ${bestCapPts} pkt</p>
            </div>
        </div>
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 250px; background: #f0f4f8; color: #333; padding: 15px; border-radius: 5px;">
                <h4>👕 Twój Wyjściowy Skład</h4>${generateLineupHtml(userStarters, false)}
                <h4 style="margin-top: 15px; border-top: 1px solid #ccc; padding-top: 10px;">🪑 Twoja Ławka</h4>${generateLineupHtml(userBench, false)}
            </div>
            <div style="flex: 1; min-width: 250px; background: #e6f7ff; color: #333; padding: 15px; border-radius: 5px; border: 1px solid #91d5ff;">
                <h4>✨ Optymalny Skład</h4>${generateLineupHtml(optimalLineup, true)}
            </div>
        </div>
    `;

    document.getElementById('edit-gw-btn').addEventListener('click', () => {
        if(confirm("Czy chcesz wczytać tę kolejkę do Kalkulatora? Po edycji i zapisaniu, poprzednie dane zostaną nadpisane.")) {
            currentGW = gw.gwNumber;
            document.getElementById('gw-display').innerText = currentGW;
            
            document.querySelectorAll('.chip-btn').forEach(b => {
                b.classList.remove('active');
                if(b.getAttribute('data-chip') === gw.chip) b.classList.add('active');
            });
            currentChip = gw.chip;

            const rows = document.querySelectorAll('.player-row');
            gw.squad.forEach((p, index) => {
                if (rows[index]) {
                    rows[index].querySelector('.p-name').value = p.name;
                    rows[index].querySelector('.p-pts').value = p.points; 
                    rows[index].querySelector('.p-start').checked = p.isStarter;
                    rows[index].querySelector('.p-cap').checked = p.isCaptain;
                    rows[index].querySelector('.p-vcap').checked = p.isVCaptain;
                    rows[index].querySelector('.p-inj').checked = p.injured;
                    rows[index].querySelector('.p-dgw').checked = p.isDGW || false;
                }
            });
            document.querySelector('.nav-btn[data-target="section-input"]').click();
        }
    });
}

function renderGlobalStatsAndChart() {
    const archive = getArchive();
    const painPanel = document.getElementById('global-pain-panel');
    if (archive.length === 0) { painPanel.innerHTML = '<p>Brak danych statystycznych.</p>'; return; }

    let totalUser = 0, totalOpt = 0, totalCapLost = 0;
    let gwLabels = [], userPtsData = [], optPtsData = [];

    archive.sort((a,b) => a.gwNumber - b.gwNumber); 
    
    archive.forEach(gw => {
        totalUser += gw.userData.points;
        totalOpt += gw.optimalData.points;
        
        let capMult = (gw.chip === 'tc') ? 3 : 2;
        let activeCap = gw.userData.userCap;
        if (activeCap && activeCap.injured && gw.userData.userVCap) activeCap = gw.userData.userVCap;
        
        let userCapBase = activeCap ? (activeCap.basePts !== undefined ? activeCap.basePts : (activeCap.points / capMult)) : 0;
        let bestCapBase = gw.optimalData.bestCap ? (gw.optimalData.bestCap.basePts !== undefined ? gw.optimalData.bestCap.basePts : gw.optimalData.bestCap.points) : 0;
        let trueCapDiff = (bestCapBase - userCapBase) * (capMult - 1);
        if (trueCapDiff > 0) totalCapLost += trueCapDiff;

        gwLabels.push(`GW ${gw.gwNumber}`);
        userPtsData.push(gw.userData.points);
        optPtsData.push(gw.optimalData.points);
    });

    let totalLost = totalOpt - totalUser;
    let benchLost = totalLost - totalCapLost;
    let benchLostText = benchLost > 0 ? `-${benchLost}` : `+${Math.abs(benchLost)}`;

    painPanel.innerHTML = `
        <div class="pain-box user">
            <h4>Zdobyte Punkty</h4><div class="pain-value">${totalUser}</div>
        </div>
        <div class="pain-box optimal">
            <h4>Gdybyś był jasnowidzem</h4><div class="pain-value">${totalOpt}</div>
        </div>
        <div class="pain-box pain">
            <h4>Zostawione na ławce</h4><div class="pain-value">${benchLostText}</div>
        </div>
        <div class="pain-box pain">
            <h4>Błędy Kapitana</h4><div class="pain-value">-${totalCapLost}</div>
        </div>
    `;

    const ctx = document.getElementById('form-chart').getContext('2d');
    if (formChartInstance) formChartInstance.destroy(); 
    
    formChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: gwLabels,
            datasets: [
                { label: 'Twój Wynik', data: userPtsData, borderColor: '#e90052', backgroundColor: 'rgba(233, 0, 82, 0.1)', borderWidth: 3, tension: 0.3, fill: true },
                { label: 'Optymalny Wynik', data: optPtsData, borderColor: '#00ffff', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], tension: 0.3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
    });
}

function renderHallOfFame() {
    const archive = getArchive();
    const container = document.getElementById('hall-of-fame-container');
    if (archive.length === 0) { container.innerHTML = '<p>Zapisz przynajmniej jedną kolejkę, by wygenerować Rekordy Sezonu.</p>'; return; }

    let maxGWScore = { gw: 0, pts: 0 };
    let bestBasePerf = { name: '-', pts: 0, gw: 0 }; 
    let bestCapPerf = { name: '-', pts: 0, gw: 0 };  
    let maxBenchPain = { gw: 0, pts: 0 };

    archive.forEach(gw => {
        if (gw.userData.points > maxGWScore.pts) maxGWScore = { gw: gw.gwNumber, pts: gw.userData.points };

        let capMult = (gw.chip === 'tc') ? 3 : 2;
        let activeCap = gw.userData.userCap;
        if (activeCap && activeCap.injured && gw.userData.userVCap) activeCap = gw.userData.userVCap;

        gw.squad.forEach(p => {
            if (!p.injured) {
                let basePts = p.basePts !== undefined ? p.basePts : p.points;
                
                if (basePts > bestBasePerf.pts) {
                    bestBasePerf = { name: p.name, pts: basePts, gw: gw.gwNumber };
                }

                let isEffCap = activeCap && activeCap.name === p.name;
                if (isEffCap) {
                    let capPts = basePts * capMult;
                    if (capPts > bestCapPerf.pts) {
                        bestCapPerf = { name: p.name, pts: capPts, gw: gw.gwNumber };
                    }
                }
            }
        });

        let userCapBase = activeCap ? (activeCap.basePts !== undefined ? activeCap.basePts : (activeCap.points / capMult)) : 0;
        let bestCapBase = gw.optimalData.bestCap ? (gw.optimalData.bestCap.basePts !== undefined ? gw.optimalData.bestCap.basePts : gw.optimalData.bestCap.points) : 0;
        let trueCapDiff = (bestCapBase - userCapBase) * (capMult - 1);
        
        let gwLost = gw.optimalData.points - gw.userData.points;
        let benchLost = gwLost - (trueCapDiff > 0 ? trueCapDiff : 0);
        
        if (benchLost > maxBenchPain.pts) maxBenchPain = { gw: gw.gwNumber, pts: benchLost };
    });

    container.innerHTML = `
        <div class="hof-card">
            <h4>Najwyższy wynik GW</h4>
            <div class="hof-value">${maxGWScore.pts} pkt</div>
            <div class="hof-desc">GW ${maxGWScore.gw}</div>
        </div>
        <div class="hof-card">
            <h4>Występ sezonu</h4>
            <div class="hof-value">${bestBasePerf.name}</div>
            <div class="hof-desc">${bestBasePerf.pts} pkt (GW ${bestBasePerf.gw})</div>
        </div>
        <div class="hof-card">
            <h4>Kapitan sezonu</h4>
            <div class="hof-value">${bestCapPerf.name}</div>
            <div class="hof-desc">${bestCapPerf.pts} pkt (GW ${bestCapPerf.gw})</div>
        </div>
        <div class="hof-card bad-record">
            <h4>Największy Ból na Ławce</h4>
            <div class="hof-value">-${maxBenchPain.pts} pkt</div>
            <div class="hof-desc">GW ${maxBenchPain.gw}</div>
        </div>
    `;
}

function renderAssistantAlerts() {
    const archive = getArchive();
    const container = document.getElementById('assistant-alerts-container');
    container.innerHTML = '';
    if (archive.length === 0) { container.innerHTML = '<p>Brak danych. Zapisz przynajmniej jedną kolejkę, by Asystent zaczął działać.</p>'; return; }

    const sortedArchive = [...archive].sort((a,b) => b.gwNumber - a.gwNumber);
    const last3GWs = sortedArchive.slice(0, 3);
    const playerTrends = {};

    last3GWs.forEach((gw, index) => {
        gw.squad.forEach(p => {
            const name = p.name.trim();
            if (!name) return;
            if (!playerTrends[name]) playerTrends[name] = { ptsArray: [], gamesPlayed: 0, isInjuredLast: false, isBenchedLast: false, ptsLast: 0 };
            if (index === 0) {
                playerTrends[name].isInjuredLast = p.injured;
                playerTrends[name].isBenchedLast = !p.isStarter;
                playerTrends[name].ptsLast = (p.basePts !== undefined ? p.basePts : p.points);
            }
            if (!p.injured) {
                playerTrends[name].ptsArray.push(p.basePts !== undefined ? p.basePts : p.points);
                playerTrends[name].gamesPlayed += 1;
            }
        });
    });

    let alertsHtml = '';
    Object.keys(playerTrends).forEach(name => {
        const stats = playerTrends[name];
        if (stats.isInjuredLast) {
            alertsHtml += `<div class="alert-card alert-injury" style="color:#333;"><h4>🚑 Raport Medyczny: ${name}</h4><p>Pauzował w ostatniej kolejce. Upewnij się, czy wraca do zdrowia.</p></div>`;
            return; 
        }
        if (stats.isBenchedLast && stats.ptsLast >= 5) {
            alertsHtml += `<div class="alert-card alert-bench" style="color:#333;"><h4>🪑 Złoty Rezerwowy: ${name}</h4><p>Zdobył solidne <strong>${stats.ptsLast} pkt</strong>, a Ty trzymałeś go na ławce!</p></div>`;
        }
        if (stats.gamesPlayed === last3GWs.length && stats.gamesPlayed > 0) {
            let sumPts = stats.ptsArray.reduce((a, b) => a + b, 0);
            let avg = sumPts / stats.gamesPlayed;
            if (avg < 2.5) { alertsHtml += `<div class="alert-card alert-cold" style="color:#333;"><h4>🧊 Zimna Krew: ${name}</h4><p>W ostatnich meczach punktuje słabo (śr. ${avg.toFixed(1)}). Czas na transfer?</p></div>`; }
            else if (avg >= 5.0 && avg < 8.0 && !stats.isBenchedLast) { alertsHtml += `<div class="alert-card alert-solid" style="color:#333;"><h4>📈 Solidny Fundament: ${name}</h4><p>Regularnie dowozi punkty (śr. ${avg.toFixed(1)}). To trzon Twojego zespołu.</p></div>`; }
            else if (avg >= 8.0) { alertsHtml += `<div class="alert-card alert-king" style="color:#333;"><h4>👑 Pan Piłkarz: ${name}</h4><p>W absolutnym gazie (śr. ${avg.toFixed(1)}). Idealny kandydat na Kapitana!</p></div>`; }
        }
    });

    if (alertsHtml === '') alertsHtml = '<p>Brak pilnych powiadomień. Rozegraj więcej kolejek.</p>';
    container.innerHTML = alertsHtml;
}

function renderDreamTeam() {
    const archive = getArchive();
    const pitch = document.getElementById('pitch-container');
    pitch.innerHTML = '';
    if (archive.length === 0) { pitch.innerHTML = '<p style="color:white; text-align:center;">Brak danych do wygenerowania składu.</p>'; return; }

    const playerStats = {};
    archive.forEach(gw => {
        gw.squad.forEach(player => {
            const name = player.name.trim();
            if (!name) return;
            if (!playerStats[name]) playerStats[name] = { name: name, position: player.position, totalPoints: 0, appearances: 0 };
            if (!player.injured) {
                playerStats[name].totalPoints += (player.basePts !== undefined ? player.basePts : player.points);
                playerStats[name].appearances += player.isDGW ? 2 : 1; 
            }
        });
    });

    const eligiblePlayers = Object.values(playerStats)
        .filter(p => p.appearances >= 3) 
        .map(p => { p.average = parseFloat((p.totalPoints / p.appearances).toFixed(2)); return p; })
        .sort((a,b) => b.average - a.average);

    if (eligiblePlayers.length === 0) { pitch.innerHTML = '<p style="color:white; text-align:center; padding: 20px;">Nikt nie rozegrał u Ciebie 3 spotkań!</p>'; return; }

    const pool = { GK: [], DEF: [], MID: [], FWD: [] };
    eligiblePlayers.forEach(p => { if(pool[p.position]) pool[p.position].push(p); });
    let best11 = { GK: [], DEF: [], MID: [], FWD: [] };

    if (pool.GK.length > 0) best11.GK.push(pool.GK.shift());
    for(let i=0; i<3; i++) if (pool.DEF.length > 0) best11.DEF.push(pool.DEF.shift());
    for(let i=0; i<2; i++) if (pool.MID.length > 0) best11.MID.push(pool.MID.shift());
    for(let i=0; i<1; i++) if (pool.FWD.length > 0) best11.FWD.push(pool.FWD.shift());

    let remainingSlots = 11 - (best11.GK.length + best11.DEF.length + best11.MID.length + best11.FWD.length);
    let combinedPool = [...pool.DEF, ...pool.MID, ...pool.FWD].sort((a,b) => b.average - a.average);

    for (let p of combinedPool) {
        if (remainingSlots <= 0) break;
        if (p.position === 'DEF' && best11.DEF.length < 5) { best11.DEF.push(p); remainingSlots--; }
        else if (p.position === 'MID' && best11.MID.length < 5) { best11.MID.push(p); remainingSlots--; }
        else if (p.position === 'FWD' && best11.FWD.length < 3) { best11.FWD.push(p); remainingSlots--; }
    }

    const createRow = (players) => {
        let rowHtml = '<div class="pitch-row">';
        players.forEach(p => {
            rowHtml += `<div class="pitch-player"><div class="shirt-wrapper pos-${p.position}">👕</div><div class="pitch-name">${p.name}</div><div class="pitch-pts"><div class="pitch-avg">${p.average} śr.</div><div class="pitch-sum">(${p.totalPoints} pkt)</div></div></div>`;
        });
        rowHtml += '</div>';
        return rowHtml;
    };

    pitch.innerHTML += createRow(best11.FWD);
    pitch.innerHTML += createRow(best11.MID);
    pitch.innerHTML += createRow(best11.DEF);
    pitch.innerHTML += createRow(best11.GK);
}

function renderSummaryTable() {
    const archive = getArchive();
    const tbody = document.getElementById('summary-table-body');
    tbody.innerHTML = '';
    if (archive.length === 0) return;

    const playerStats = {};
    archive.forEach(gw => {
        gw.squad.forEach(player => {
            const name = player.name.trim();
            if (!name) return;
            if (!playerStats[name]) playerStats[name] = { totalPoints: 0, appearances: 0, position: player.position };
            
            if (!player.injured) {
                let ptsToAdd = player.basePts !== undefined ? player.basePts : player.points;
                playerStats[name].totalPoints += ptsToAdd;
                playerStats[name].appearances += player.isDGW ? 2 : 1; 
            }
        });
    });

    let sortedPlayers = Object.entries(playerStats)
        .filter(([name, stats]) => stats.appearances > 0)
        .map(([name, stats]) => { return { name: name, position: stats.position, appearances: stats.appearances, totalPoints: stats.totalPoints, average: (stats.totalPoints / stats.appearances).toFixed(2) }; });

    sortedPlayers.sort((a, b) => {
        if (summarySortCol === 'position') {
            const posOrder = { "GK": 1, "DEF": 2, "MID": 3, "FWD": 4 };
            return summarySortAsc ? posOrder[a.position] - posOrder[b.position] : posOrder[b.position] - posOrder[a.position];
        } else if (summarySortCol === 'name') {
            return summarySortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        } else {
            return summarySortAsc ? parseFloat(a[summarySortCol]) - parseFloat(b[summarySortCol]) : parseFloat(b[summarySortCol]) - parseFloat(a[summarySortCol]);
        }
    });

    sortedPlayers.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="color:#333;">${p.position}</td><td style="color:#333;"><strong>${p.name}</strong></td><td style="color:#333;">${p.appearances}</td><td style="color:#333;">${p.totalPoints}</td><td style="color:#333;"><strong>${p.average}</strong></td>`;
        tbody.appendChild(tr);
    });
}

function renderWelcomeStats() {
    const archive = getArchive();
    const container = document.getElementById('welcome-stats');
    if (archive.length === 0) {
        container.innerHTML = '<p>Kalkulator jest gotowy! Zapisz swoją pierwszą kolejkę, by rozpocząć analizę.</p>';
        return;
    }
    let totalPoints = 0;
    archive.forEach(gw => totalPoints += gw.userData.points);
    container.innerHTML = `
        <div style="font-size: 1.5em; margin-bottom: 5px;">Rozegrane kolejki w systemie: <strong style="color: var(--fpl-green);">${archive.length}</strong></div>
        <div style="font-size: 1.5em;">Zdobyte punkty: <strong style="color: var(--fpl-green);">${totalPoints}</strong></div>
    `;
}

// ==========================================
// 4. NOWE FUNKCJE (ZDJĘCIA, AUTO-UZUPEŁNIANIE)
// ==========================================
document.getElementById('download-pitch-btn').addEventListener('click', function() {
    const pitch = document.getElementById('pitch-container');
    if (pitch.innerHTML.includes('Brak danych') || pitch.innerHTML.includes('Jeszcze nikt')) { alert("Nie ma jeszcze drużyny do pobrania!"); return; }
    html2canvas(pitch, { backgroundColor: null }).then(canvas => {
        const link = document.createElement('a'); link.download = 'fpl_dream_team_25_26.png';
        link.href = canvas.toDataURL('image/png'); link.click();
    });
});

document.getElementById('load-last-squad-btn').addEventListener('click', function() {
    const archive = getArchive();
    if (archive.length === 0) { alert("Brak zapisanych kolejek!"); return; }
    archive.sort((a,b) => b.gwNumber - a.gwNumber);
    const lastSquad = archive[0].squad;
    currentGW = archive[0].gwNumber + 1;
    if (currentGW > 38) currentGW = 38;
    document.getElementById('gw-display').innerText = currentGW;
    
    const rows = document.querySelectorAll('.player-row');
    lastSquad.forEach((p, index) => {
        if (rows[index]) {
            rows[index].querySelector('.p-name').value = p.name;
            rows[index].querySelector('.p-pts').value = 0; 
            rows[index].querySelector('.p-start').checked = p.isStarter;
            rows[index].querySelector('.p-cap').checked = p.isCaptain;
            rows[index].querySelector('.p-vcap').checked = p.isVCaptain;
            rows[index].querySelector('.p-inj').checked = false; 
            rows[index].querySelector('.p-dgw').checked = false; 
        }
    });
    alert(`Pomyślnie wczytano skład z GW ${archive[0].gwNumber}. Jesteś gotowy na GW ${currentGW}!`);
});

// ==========================================
// 5. EKSPORT, IMPORT (KOPIA ZAPASOWA)
// ==========================================
document.getElementById('export-btn').addEventListener('click', function() {
    const data = JSON.stringify(globalArchive);
    if (!data || data === '[]') { alert("Brak danych do wyeksportowania!"); return; }
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `fpl_backup_25_26.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
});

// Zaktualizowany import do Firebase (aby nie tracił nazwy)
document.getElementById('import-btn').addEventListener('click', function() { document.getElementById('import-file').click(); });
document.getElementById('import-file').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                const user = auth.currentUser;
                if(!user) return;
                
                globalArchive = importedData;
                db.collection("users").doc(user.uid).set({
                    username: globalUsername, // Pilnujemy, żeby nie nadpisało loginu
                    archive: globalArchive
                }).then(() => {
                    alert("Pomyślnie wczytano sezon z pliku do Chmury!");
                    renderSummaryTable(); renderTransfers(); updatePlayerDatalist(); renderWelcomeStats();
                });
            } else { alert("Błąd: Plik nie zawiera poprawnego formatu."); }
        } catch (err) { alert("Błąd: Nie udało się odczytać pliku JSON."); }
    };
    reader.readAsText(file);
});

// ==========================================
// 6. AKCJE INTERFEJSU I START APLIKACJI
// ==========================================
document.getElementById('gw-minus').addEventListener('click', () => { if (currentGW > 1) { currentGW--; document.getElementById('gw-display').innerText = currentGW; }});
document.getElementById('gw-plus').addEventListener('click', () => { if (currentGW < 38) { currentGW++; document.getElementById('gw-display').innerText = currentGW; }});

document.getElementById('sort-gw-btn').addEventListener('click', function() {
    gwSortAsc = !gwSortAsc; 
    this.innerText = gwSortAsc ? "Sortuj: Rosnąco ⬇️" : "Sortuj: Malejąco ⬆️";
    renderGameweekTabs();
});

document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', function() {
        const col = this.getAttribute('data-sort');
        if (summarySortCol === col) { summarySortAsc = !summarySortAsc; } 
        else { summarySortCol = col; summarySortAsc = (col === 'name' || col === 'position') ? true : false; }

        document.querySelectorAll('.sortable').forEach(header => {
            let text = header.innerText.replace(' ⬇️', '').replace(' ⬆️', '').replace(' ↕️', '');
            header.innerText = text + ' ↕️';
        });
        this.innerText = this.innerText.replace(' ↕️', '') + (summarySortAsc ? ' ⬆️' : ' ⬇️');
        renderSummaryTable();
    });
});

let currentChip = 'none';
document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentChip = this.getAttribute('data-chip');
    });
});

document.getElementById('calculate-btn').addEventListener('click', function() {
    let currentSquad = [];
    let userCaptain = null, userVCaptain = null, bestCaptain = { name: "Brak", basePts: -1000 };
    let capMult = (currentChip === 'tc') ? 3 : 2;
    let isMainCapInjured = false;
    
    document.querySelectorAll('.player-row').forEach((row) => {
        if (row.querySelector('.p-cap').checked && row.querySelector('.p-inj').checked) isMainCapInjured = true;
    });

    document.querySelectorAll('.player-row').forEach((row) => {
        const name = row.querySelector('.p-name').value || "Nieznany Gracz";
        const pos = row.querySelector('.p-pos-label').getAttribute('data-pos');
        const pts = parseInt(row.querySelector('.p-pts').value) || 0;
        const isInjured = row.querySelector('.p-inj').checked; 
        const isCaptain = row.querySelector('.p-cap').checked;
        const isVCaptain = row.querySelector('.p-vcap').checked;
        const isStarter = row.querySelector('.p-start').checked;
        const isDGW = row.querySelector('.p-dgw').checked;
        
        let isEffectiveCaptain = false;
        if (isCaptain && !isMainCapInjured) isEffectiveCaptain = true;
        else if (isVCaptain && isMainCapInjured) isEffectiveCaptain = true;

        let basePts = isEffectiveCaptain ? (pts / capMult) : pts;
        const playerObj = { name, position: pos, points: pts, basePts: basePts, injured: isInjured, isCaptain: isCaptain, isVCaptain: isVCaptain, isStarter: isStarter, isDGW: isDGW };
        currentSquad.push(playerObj);
        
        if (isCaptain) userCaptain = playerObj;
        if (isVCaptain) userVCaptain = playerObj;
        if (!isInjured && basePts > bestCaptain.basePts) bestCaptain = { name: name, basePts: basePts };
    });

    const userStarters = currentSquad.filter(p => p.isStarter);
    if (userStarters.length !== 11 && currentChip !== 'bb') { alert("BŁĄD! Musisz zaznaczyć dokładnie 11 zawodników!"); return; }
    
    let counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    userStarters.forEach(p => counts[p.position]++);
    if (currentChip !== 'bb' && (counts.GK !== 1 || counts.DEF < 3 || counts.MID < 2 || counts.FWD < 1)) {
        alert("BŁĄD! Twój wyjściowy skład łamie zasady FPL."); return;
    }

    const optimalResult = calculateOptimalPoints(currentSquad, currentChip);
    const optimalData = { points: optimalResult.points, lineup: optimalResult.lineup, bestCap: bestCaptain };
    const userPoints = calculateUserPoints(currentSquad, currentChip); 
    const userData = { points: userPoints, userCap: userCaptain, userVCap: userVCaptain };

    document.getElementById('results').style.display = 'block';
    document.getElementById('res-gw').innerText = currentGW;
    document.getElementById('optimal-points').innerText = `${userPoints} pkt (Optymalnie mogło być: ${optimalResult.points} pkt)`;
    
    saveGameweek(currentGW, currentSquad, optimalData, userData, currentChip);
});

// Zaktualizowane czyszczenie
document.getElementById('clear-btn').addEventListener('click', function() {
    if(confirm("Czy na pewno chcesz usunąć historię całego sezonu? Zostanie ona usunięta również z chmury!")) {
        const user = auth.currentUser;
        if(user) {
            globalArchive = [];
            db.collection("users").doc(user.uid).set({ username: globalUsername, archive: [] }).then(() => {
                renderSummaryTable(); renderTransfers(); updatePlayerDatalist(); renderWelcomeStats();
                document.getElementById('pitch-container').innerHTML = '';
                document.getElementById('global-pain-panel').innerHTML = '';
                document.getElementById('hall-of-fame-container').innerHTML = '';
                if(formChartInstance) formChartInstance.destroy();
                alert("Archiwum w Chmurze wyczyszczone.");
            });
        }
    }
});

// ==========================================
// 7. MINILIGA I SYSTEM SKAUTINGU
// ==========================================

function renderLeagueTable() {
    const tbody = document.getElementById('league-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #333;">Pobieranie tabeli... ⏳</td></tr>';

    db.collection("users").get().then((querySnapshot) => {
        let leaderboard = [];

        querySnapshot.forEach((doc) => {
            let data = doc.data();
            let totalUserPts = 0;
            let totalOptPts = 0;
            let gwsPlayed = 0;
            let archiveData = data.archive || [];

            if (archiveData.length > 0) {
                gwsPlayed = archiveData.length;
                archiveData.forEach(gw => {
                    totalUserPts += gw.userData.points;
                    totalOptPts += gw.optimalData.points;
                });
            }

            let displayName = data.username || 'Nieznany Menedżer';
            leaderboard.push({ name: displayName, gws: gwsPlayed, points: totalUserPts, optPoints: totalOptPts, archive: archiveData });
        });

        leaderboard.sort((a, b) => b.points - a.points);
        tbody.innerHTML = '';
        if (leaderboard.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #333;">Brak graczy.</td></tr>'; return; }

        leaderboard.forEach((player, index) => {
            let medal = index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : '';
            const tr = document.createElement('tr');
            tr.className = 'league-row'; // Dodana klasa dla efektu hover
            tr.title = "Kliknij, aby podejrzeć skład i transfery gracza!";
            
            // KLIKNIĘCIE W GRACZA -> OTWIERA MODAL
            tr.addEventListener('click', () => openSpyModal(player.name, player.archive));

            tr.innerHTML = `
                <td style="color: #333; font-weight: bold; text-align: center;">${index + 1}</td>
                <td style="color: var(--fpl-purple); font-weight: bold; font-size: 16px;">${medal}${player.name}</td>
                <td style="color: #333;">${player.gws}</td>
                <td style="color: var(--fpl-green); font-weight: bold; font-size: 18px; background: rgba(0,0,0,0.05);">${player.points}</td>
                <td style="color: var(--fpl-blue); font-weight: bold;">${player.optPoints}</td>
            `;
            tbody.appendChild(tr);
        });
    }).catch((error) => { tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Błąd: ${error.message}</td></tr>`; });
}

if(document.getElementById('refresh-league-btn')) {
    document.getElementById('refresh-league-btn').addEventListener('click', renderLeagueTable);
}

// --- LOGIKA MODALA (SKAUTING) ---
const spyModal = document.getElementById('spy-modal');
const spyCloseBtn = document.getElementById('spy-close-btn');

spyCloseBtn.onclick = () => spyModal.style.display = "none";
window.onclick = (e) => { if (e.target == spyModal) spyModal.style.display = "none"; }

document.querySelectorAll('.spy-tab').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.spy-tab').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.spy-section').forEach(sec => sec.classList.remove('active-spy'));
        document.getElementById(this.getAttribute('data-target')).classList.add('active-spy');
    });
});

let currentSpyArchive = [];

function openSpyModal(managerName, archive) {
    document.getElementById('spy-modal-title').innerText = `Profil Menedżera: ${managerName}`;
    currentSpyArchive = archive.sort((a, b) => b.gwNumber - a.gwNumber); // Sortuj malejąco (najnowsze na górze)
    
    // 1. Zbuduj Dropdown z kolejkami
    const gwSelect = document.getElementById('spy-gw-dropdown');
    gwSelect.innerHTML = '';
    if (currentSpyArchive.length === 0) {
        gwSelect.innerHTML = '<option value="">Brak rozegranych kolejek</option>';
        document.getElementById('spy-gw-render-area').innerHTML = '<p>Ten gracz nie zapisał jeszcze żadnej kolejki.</p>';
        document.getElementById('spy-transfers').innerHTML = '<p>Brak historii transferów.</p>';
        document.getElementById('spy-pitch-area').innerHTML = '<p style="text-align:center; color:white; padding-top: 20px;">Brak danych.</p>';
    } else {
        currentSpyArchive.forEach(gw => {
            const opt = document.createElement('option');
            opt.value = gw.gwNumber; opt.innerText = `Kolejka (GW) ${gw.gwNumber}`;
            gwSelect.appendChild(opt);
        });
        // Renderuj najnowszą kolejkę domyślnie
        renderSpySingleGW(currentSpyArchive[0]);
        
        // Zbuduj resztę
        renderSpyTransfers(currentSpyArchive);
        renderSpyDreamTeam(currentSpyArchive);
    }

    // Pokaż modal i zresetuj na pierwszą zakładkę
    document.querySelector('.spy-tab[data-target="spy-gws"]').click();
    spyModal.style.display = "block";
}

document.getElementById('spy-gw-dropdown').addEventListener('change', (e) => {
    const selectedGW = parseInt(e.target.value);
    const gwData = currentSpyArchive.find(gw => gw.gwNumber === selectedGW);
    if(gwData) renderSpySingleGW(gwData);
});

function renderSpySingleGW(gw) {
    const area = document.getElementById('spy-gw-render-area');
    const userStarters = gw.squad.filter(p => p.isStarter);
    const userBench = gw.squad.filter(p => !p.isStarter);
    
    let activeCap = gw.userData.userCap;
    if (activeCap && activeCap.injured && gw.userData.userVCap) activeCap = gw.userData.userVCap;

    area.innerHTML = `
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; border-left: 5px solid var(--fpl-green);">
            <div><h3 style="margin:0; color:var(--fpl-purple);">Wynik Kolejki</h3><span style="font-size: 24px; font-weight: bold; color: var(--fpl-green);">${gw.userData.points} pkt</span></div>
            <div style="text-align:right;"><h3 style="margin:0; color:#555;">Użyty Chip</h3><span style="font-size: 18px; font-weight: bold; color: #333;">${gw.chip.toUpperCase()}</span></div>
        </div>
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; background: #f0f4f8; padding: 15px; border-radius: 5px;">
                <h4 style="margin-top:0;">👕 Wyjściowy Skład</h4>
                ${generateLineupHtml(userStarters, false)}
            </div>
            <div style="flex: 1; background: #f9f9f9; padding: 15px; border-radius: 5px;">
                <h4 style="margin-top:0;">🪑 Ławka Rezerwowych</h4>
                ${generateLineupHtml(userBench, false)}
            </div>
        </div>
    `;
}

function renderSpyTransfers(archive) {
    const area = document.getElementById('spy-transfers');
    area.innerHTML = '';
    if (archive.length < 2) { area.innerHTML = '<p>Brak danych o transferach (min. 2 kolejki).</p>'; return; }
    
    let sortedAsc = [...archive].sort((a,b) => a.gwNumber - b.gwNumber);
    for (let i = sortedAsc.length - 1; i > 0; i--) {
        const currGW = sortedAsc[i], prevGW = sortedAsc[i-1];
        const currNames = currGW.squad.map(p => p.name.trim().toLowerCase());
        const prevNames = prevGW.squad.map(p => p.name.trim().toLowerCase());
        const transfersIn = currGW.squad.filter(p => !prevNames.includes(p.name.trim().toLowerCase()));
        const transfersOut = prevGW.squad.filter(p => !currNames.includes(p.name.trim().toLowerCase()));

        if (transfersIn.length > 0 || transfersOut.length > 0) {
            let inHtml = transfersIn.map(p => `🟢 Przyszli: ${p.name} (${p.position})`).join('<br>');
            let outHtml = transfersOut.map(p => `🔴 Odeszli: ${p.name} (${p.position})`).join('<br>');
            area.innerHTML += `<div style="background:white; padding:15px; border-radius:5px; margin-bottom:10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid var(--fpl-blue);"><h4 style="margin:0 0 10px 0;">Przed GW ${currGW.gwNumber}</h4><p style="color:#28a745; margin:0; font-weight:bold;">${inHtml}</p><p style="color:#dc3545; margin:5px 0 0 0; font-weight:bold;">${outHtml}</p></div>`;
        }
    }
    if (area.innerHTML === '') area.innerHTML = '<p>Brak zrobionych transferów.</p>';
}

function renderSpyDreamTeam(archive) {
    const pitch = document.getElementById('spy-pitch-area');
    pitch.innerHTML = '';
    const playerStats = {};
    archive.forEach(gw => {
        gw.squad.forEach(player => {
            const name = player.name.trim();
            if (!name) return;
            if (!playerStats[name]) playerStats[name] = { name: name, position: player.position, totalPoints: 0, appearances: 0 };
            if (!player.injured) {
                playerStats[name].totalPoints += (player.basePts !== undefined ? player.basePts : player.points);
                playerStats[name].appearances += player.isDGW ? 2 : 1; 
            }
        });
    });

    const eligiblePlayers = Object.values(playerStats).filter(p => p.appearances >= 3).map(p => { p.average = parseFloat((p.totalPoints / p.appearances).toFixed(2)); return p; }).sort((a,b) => b.average - a.average);
    if (eligiblePlayers.length === 0) { pitch.innerHTML = '<p style="color:white; text-align:center; padding-top: 20px;">Nikt nie rozegrał u tego gracza 3 spotkań!</p>'; return; }

    const pool = { GK: [], DEF: [], MID: [], FWD: [] };
    eligiblePlayers.forEach(p => { if(pool[p.position]) pool[p.position].push(p); });
    let best11 = { GK: [], DEF: [], MID: [], FWD: [] };

    if (pool.GK.length > 0) best11.GK.push(pool.GK.shift());
    for(let i=0; i<3; i++) if (pool.DEF.length > 0) best11.DEF.push(pool.DEF.shift());
    for(let i=0; i<2; i++) if (pool.MID.length > 0) best11.MID.push(pool.MID.shift());
    for(let i=0; i<1; i++) if (pool.FWD.length > 0) best11.FWD.push(pool.FWD.shift());

    let remainingSlots = 11 - (best11.GK.length + best11.DEF.length + best11.MID.length + best11.FWD.length);
    let combinedPool = [...pool.DEF, ...pool.MID, ...pool.FWD].sort((a,b) => b.average - a.average);

    for (let p of combinedPool) {
        if (remainingSlots <= 0) break;
        if (p.position === 'DEF' && best11.DEF.length < 5) { best11.DEF.push(p); remainingSlots--; }
        else if (p.position === 'MID' && best11.MID.length < 5) { best11.MID.push(p); remainingSlots--; }
        else if (p.position === 'FWD' && best11.FWD.length < 3) { best11.FWD.push(p); remainingSlots--; }
    }

    const createRow = (players) => {
        let rowHtml = '<div class="pitch-row">';
        players.forEach(p => { rowHtml += `<div class="pitch-player"><div class="shirt-wrapper pos-${p.position}">👕</div><div class="pitch-name">${p.name}</div><div class="pitch-pts"><div class="pitch-avg">${p.average}</div></div></div>`; });
        return rowHtml + '</div>';
    };

    pitch.innerHTML += createRow(best11.FWD) + createRow(best11.MID) + createRow(best11.DEF) + createRow(best11.GK);
}