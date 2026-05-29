/* ==========================================================================
   APPLICATION CONTROLLER: STUDENT BALANCE PLANNER ("JOSEPH")
   Main Controller (main.js)
   Saves application data, manages tasks, habits, Pomodoro, and PDF export.
   ========================================================================== */

// ==========================================================================
// STATE MANAGEMENT & DEFAULT DATA
// ==========================================================================

let appState = {
    tasks: [],
    habits: [],
    events: [],
    wellness: {
        currentMood: "feliz",
        studyHoursThisWeek: 0,
        moodHistory: [50, 50, 50, 50, 50, 50, 50] // Lun a Dom neutral
    },
    notifications: [],
    activePhoneFilter: null,
    notificationPermission: "default",
    soundEnabledUntil: Date.now() + 30 * 60 * 1000,
    tutorialCompleted: false,
    appTheme: "theme-cosmico"
};
const notificationAudio = new Audio('assets/notification.mp3');
notificationAudio.volume = 0.6;
// Variable para el control del mes/semana actual a mostrar en el calendario
// Se inicializa con la fecha actual del sistema para mostrar la semana real.
let currentCalendarDate = new Date();

// Interval IDs for scheduled notifications
let notificationCheckInterval = null;
let eventAlertSoundInterval = null;
let tomorrowReminderShown = false;

// Track which tasks have already triggered notifications (prevents duplicates)
let notifiedTasks = new Set(); // Format: "taskId_30min", "taskId_1hr", "taskId_tomorrow"



// ==========================================================================
// CORE INITIALIZATION
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Inicializar el sistema de autenticación
    initAuth(onUserSuccess, onUserLoggedOut);

    // Configurar Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

// Callback: Usuario autenticado correctamente
async function onUserSuccess(user) {
    const authScreen = document.getElementById("auth-screen");
    const appScreen = document.getElementById("app-screen");
    const mobileNav = document.getElementById("mobile-bottom-nav");

    // Si GSAP está disponible, animar la salida del login y la entrada del dashboard
    if (typeof gsap !== "undefined" && authScreen.classList.contains("active")) {
        gsap.to(".auth-card", {
            y: -50, opacity: 0, scale: 0.9, duration: 0.5, ease: "power2.in", onComplete: async () => {
                authScreen.classList.remove("active");
                // Limpiar estilos inline que GSAP pudo haber dejado del logout anterior
                gsap.set(appScreen, { clearProps: "all" });
                appScreen.classList.add("active");
                appScreen.style.display = "grid";
                // Mostrar nav móvil solo en pantallas pequeñas
                if (mobileNav && window.innerWidth <= 768) mobileNav.style.display = "flex";

                // Ejecutar inicialización de dashboard
                await setupDashboard(user);
                animateDashboardEntry();
            }
        });
    } else {
        // Fallback normal
        authScreen.classList.remove("active");
        if (typeof gsap !== "undefined") gsap.set(appScreen, { clearProps: "all" });
        appScreen.classList.add("active");
        appScreen.style.display = "grid";
        // Mostrar nav móvil solo en pantallas pequeñas
        if (mobileNav && window.innerWidth <= 768) mobileNav.style.display = "flex";
        await setupDashboard(user);
        if (typeof gsap !== "undefined") animateDashboardEntry();
    }
}

async function setupDashboard(user) {
    updateUserInterfaceDetails(user);
    showToast(`Cargando datos de ${user.name}...`, "info");
    await loadUserDataFromStorage(user.id);
    initDashboardControllers();
    renderAll();
    
    // Aplicar el tema global
    document.body.className = appState.appTheme || "theme-cosmico";

    // Inicializar Mascot Manager
    initMascotManager();

    // Check for tutorial
    if (!appState.tutorialCompleted) {
        showTutorialSetupModal();
    } else {
        showToast(`¡Sesión iniciada correctamente!`, "success");
    }
}

// ==========================================================================
// TUTORIAL ONBOARDING (DRIVER.JS)
// ==========================================================================

function showTutorialSetupModal() {
    const modal = document.getElementById("tutorial-setup-modal");
    const overlay = document.getElementById("tutorial-setup-overlay");
    const mascot = document.getElementById("tutorial-setup-mascot");
    const btnStart = document.getElementById("btn-start-tutorial");
    const btnSkip = document.getElementById("btn-skip-tutorial");
    const colorBtns = document.querySelectorAll(".color-option-btn");

    if(!modal || !overlay) return;

    let selectedTheme = "theme-cosmico";

    modal.classList.add("active");
    overlay.classList.add("active");

    colorBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            colorBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedTheme = btn.getAttribute("data-theme");
            // Preview real-time
            document.body.className = selectedTheme;
        });
    });

    const closeSetup = () => {
        modal.classList.remove("active");
        overlay.classList.remove("active");
    };

    btnStart.onclick = () => {
        closeSetup();
        appState.appTheme = selectedTheme;
        saveStateToStorage();
        startInteractiveTutorial(selectedTheme);
    };

    btnSkip.onclick = () => {
        closeSetup();
        appState.appTheme = selectedTheme;
        appState.tutorialCompleted = true;
        saveStateToStorage();
        document.body.className = selectedTheme;
        showToast("Tema aplicado. ¡Puedes empezar a usar tu agenda!");
    };
}

function startInteractiveTutorial(themeClass) {
    // Forzar ir a la pestaña inicio para que los widgets sean visibles
    const inicioTab = document.querySelector('.nav-link[data-tab="inicio"]');
    if (inicioTab) inicioTab.click();

    if (typeof window.driver === 'undefined') {
        console.error("Driver.js no está cargado.");
        return;
    }

    const driver = window.driver.js.driver;

    const tour = driver({
        showProgress: true,
        animate: true,
        allowClose: false,
        doneBtnText: '¡Terminar!',
        nextBtnText: 'Siguiente &rarr;',
        prevBtnText: '&larr; Anterior',
        popoverClass: themeClass,
        onHighlightStarted: (element, step, options) => {
            // Añadir la mascota anime flotante al popover
            setTimeout(() => {
                const popovers = document.querySelectorAll('.driver-popover');
                popovers.forEach(pop => {
                    if (!pop.querySelector('.tutorial-mascot-overlay')) {
                        const mascotDiv = document.createElement('div');
                        mascotDiv.className = 'tutorial-mascot-overlay';
                        const mascotImg = document.createElement('img');
                        mascotImg.src = './assets/kawaii_mascot.png';
                        mascotDiv.appendChild(mascotImg);
                        pop.appendChild(mascotDiv);
                    }
                });
            }, 50);
        },
        onDestroyed: () => {
            appState.tutorialCompleted = true;
            saveStateToStorage();
            showToast("¡Tutorial completado! Disfruta tu agenda.", "success");
        },
        steps: [
            {
                element: '.sidebar-brand',
                popover: {
                    title: '¡Hola! Soy tu asistente.',
                    description: 'Te guiaré por las funciones principales de tu nueva agenda estudiantil. ¡Vamos allá!',
                    side: "right", align: 'start'
                }
            },
            {
                element: '.widget-semana',
                popover: {
                    title: 'Vista de tu Semana',
                    description: 'Aquí puedes ver rápidamente los días de tu semana actual. Los días marcados tienen eventos importantes como exámenes o clases.',
                    side: "left", align: 'start'
                }
            },
            {
                element: '.widget-progreso',
                popover: {
                    title: 'Mide tu Progreso',
                    description: 'Este anillo te muestra tu nivel de bienestar general, calculado en base a tus tareas completadas, horas de estudio y hábitos.',
                    side: "bottom", align: 'start'
                }
            },
            {
                element: '.widget-bienestar',
                popover: {
                    title: 'Autocuidado Diario',
                    description: '¡No olvides registrar cómo te sientes! Además te mostramos una frase motivacional diaria y cuenta regresiva a exámenes.',
                    side: "left", align: 'start'
                }
            },
            {
                element: '.sidebar-nav',
                popover: {
                    title: 'Navegación Principal',
                    description: 'Desde aquí puedes acceder al Calendario completo, organizar Tareas, registrar Hábitos y ver tus Estadísticas de productividad.',
                    side: "right", align: 'center'
                }
            },
            {
                element: '.theme-toggle',
                popover: {
                    title: 'Modo Oscuro',
                    description: '¿Prefieres estudiar de noche? Usa este botón para activar el Modo Oscuro y proteger tus ojos.',
                    side: "bottom", align: 'end'
                }
            }
        ]
    });

    tour.drive();
}

// ==========================================================================
// MASCOT MANAGER (PERSISTENT ANIME MASCOT)
// ==========================================================================
function initMascotManager() {
    const bubble = document.getElementById("mascot-speech-bubble");
    const container = document.getElementById("persistent-mascot-container");
    
    if (!bubble || !container) return;

    const motivationalQuotes = [
        "¡Tú puedes con todo! ✨",
        "Un pequeño paso cada día te lleva lejos. 🌱",
        "¡Haz tu mejor esfuerzo hoy! 💖",
        "No olvides tomar agua y descansar. 💧",
        "¡Confío en ti! 🌸",
        "La disciplina de hoy es el éxito de mañana. 🌟"
    ];

    const getContextualQuote = () => {
        const pendingTasks = appState.tasks.filter(t => t.status === "pending").length;
        const upcomingEvents = appState.events.length;

        if (pendingTasks > 0) {
            return `¡Tienes ${pendingTasks} tarea(s) pendiente(s)! ¡Vamos a ello! 📝`;
        } else if (upcomingEvents > 0) {
            return `¡Recuerda que tienes ${upcomingEvents} evento(s) programado(s)! 📅`;
        } else if (appState.wellness && appState.wellness.currentMood === "triste") {
            return "Parece que hoy ha sido duro. ¡Tómate un respiro! Te lo mereces. 🍵";
        }
        
        return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    };

    let typeTimeout;
    
    const typeWriterEffect = (text, element, speed = 40) => {
        element.textContent = "";
        let i = 0;
        if (typeTimeout) clearTimeout(typeTimeout);

        const type = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                typeTimeout = setTimeout(type, speed);
            }
        };
        type();
    };

    const updateBubble = () => {
        // Fade out
        bubble.classList.remove("show");
        
        setTimeout(() => {
            const newQuote = getContextualQuote();
            bubble.classList.add("show");
            typeWriterEffect(newQuote, bubble);
            
            // Auto hide based on text length
            setTimeout(() => {
                bubble.classList.remove("show");
            }, 8000 + (newQuote.length * 40));
        }, 500); // Wait for fade out
    };

    // Show initial quote
    setTimeout(updateBubble, 2000);

    // Rotate quotes every 30 seconds
    setInterval(updateBubble, 30000);

    // Click on mascot forces a new quote and jump animation
    const mascotImg = container.querySelector(".mascot-image");
    const mascotJumpWrapper = document.getElementById("mascot-jump-wrapper") || mascotImg;
    if(mascotImg) {
        mascotImg.addEventListener("click", () => {
            updateBubble();
            mascotJumpWrapper.classList.add("mascot-jump");
            setTimeout(() => mascotJumpWrapper.classList.remove("mascot-jump"), 500);
        });
    }
}

function animateDashboardEntry() {
    // Timeline para la entrada progresiva del Dashboard (Staggering premium)
    const tl = gsap.timeline();

    // Animar Sidebar
    tl.fromTo(".sidebar",
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, ease: "power3.out", clearProps: "all" }
    );

    // Animar Header
    tl.fromTo(".app-header",
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.2)", clearProps: "all" },
        "-=0.4"
    );

    // Animar Widgets del Dashboard Activo
    tl.fromTo(".tab-panel.active .widget-card, .tab-panel.active .well-box, .tab-panel.active .ajustes-card",
        { y: 30, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.1)", clearProps: "all" },
        "-=0.3"
    );
}

// Callback: Cerrar Sesión
function onUserLoggedOut() {
    const appScreen = document.getElementById("app-screen");
    const authScreen = document.getElementById("auth-screen");
    const mobileNav = document.getElementById("mobile-bottom-nav");

    // Ocultar nav móvil
    if (mobileNav) mobileNav.style.display = "none";

    if (appScreen && authScreen) {
        if (typeof gsap !== "undefined") {
            gsap.to(appScreen, {
                opacity: 0, y: 20, duration: 0.4, onComplete: () => {
                    appScreen.classList.remove("active");
                    appScreen.style.display = "none";
                    // Limpiar los estilos inline de GSAP para no contaminar el siguiente login
                    gsap.set(appScreen, { clearProps: "all" });
                    appScreen.style.display = "none";

                    authScreen.classList.add("active");
                    // Limpiar propiedades y forzar visibilidad para evitar pantalla blanca
                    gsap.fromTo(".auth-card",
                        { scale: 0.9, opacity: 0, y: 0 },
                        { scale: 1, opacity: 1, duration: 0.5, clearProps: "all" }
                    );
                    gsap.fromTo(".input-group, .btn-primary, .divider, .google-auth-wrapper, .auth-switch",
                        { y: 20, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out", delay: 0.2, clearProps: "all" }
                    );
                }
            });
        } else {
            appScreen.classList.remove("active");
            appScreen.style.display = "none";
            authScreen.classList.add("active");
        }
    }
}

// Cargar datos desde Cloudflare KV Backend
async function loadUserDataFromStorage(userId) {
    try {
        const response = await fetch(`/api/state?user=${userId}`);
        if (response.ok) {
            const savedState = await response.json();
            if (savedState) {
                appState = savedState;
            }
        } else if (response.status === 404) {
            console.log("Usuario nuevo, utilizando estado base.");
        }
    } catch (e) {
        console.error("Error cargando estado de la nube. Usando localStorage como fallback:", e);
        const savedState = localStorage.getItem(`sb_state_${userId}`);
        if (savedState) appState = JSON.parse(savedState);
    }
}

// Guardar datos en Cloudflare KV Backend
async function saveStateToStorage() {
    if (!currentUser) return;

    // Fallback local por si acaso
    localStorage.setItem(`sb_state_${currentUser.id}`, JSON.stringify(appState));

    try {
        await fetch(`/api/state?user=${currentUser.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appState)
        });
    } catch (e) {
        console.error("Error guardando en la nube:", e);
    }
}

// Actualizar textos e imágenes del usuario en la UI
function updateUserInterfaceDetails(user) {
    const userFullName = document.getElementById("user-fullname");
    const userEmail = document.getElementById("user-email");
    const userAvatar = document.getElementById("user-avatar");
    const headerWelcome = document.getElementById("header-welcome-message");
    const phoneWelcome = document.getElementById("phone-welcome-name");

    const firstName = user.name.split(" ")[0];

    if (userFullName) userFullName.textContent = user.name;
    if (userEmail) userEmail.textContent = user.email;
    if (userAvatar && user.avatar) userAvatar.src = user.avatar;
    if (headerWelcome) headerWelcome.textContent = `¡Vamos por un gran día, ${firstName}!`;
    if (phoneWelcome) phoneWelcome.textContent = `${firstName}!`;
}

// ==========================================================================
// VIEW CONTROLLERS (TABS SWITCHING)
// ==========================================================================

function initDashboardControllers() {
    setupTabSwitching();
    setupTaskManager();
    setupEventManager();
    setupCalendarControllers();
    setupHabitManager();
    setupWellbeingTools();
    setupSyncGoogle();
    setupPDFPlannerSync();
    setupNotificationCenter();
    setupNotificationScheduler();
    setupMobileMockupInteractivity();
    setupAjustesActions();
}

// Cambiar de Pestaña (Desktop Sidebar)
function setupTabSwitching() {
    const navLinks = document.querySelectorAll(".nav-link");
    const tabPanels = document.querySelectorAll(".tab-panel");
    const mobileNavItems = document.querySelectorAll(".mobile-nav-item");

    // Función central: activa un tab por ID y sincroniza ambas navs
    function activateTab(tabId) {
        // Actualizar nav desktop
        navLinks.forEach(l => l.classList.remove("active"));
        const desktopLink = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
        if (desktopLink) desktopLink.classList.add("active");

        // Actualizar nav móvil
        mobileNavItems.forEach(i => i.classList.remove("active"));
        const mobileItem = document.querySelector(`.mobile-nav-item[data-tab="${tabId}"]`);
        if (mobileItem) mobileItem.classList.add("active");

        // Mostrar panel correspondiente
        tabPanels.forEach(panel => {
            panel.classList.remove("active");
            if (panel.id === `tab-${tabId}`) {
                panel.classList.add("active");
                
                // Efecto WOW: Animar hijos en cascada (stagger)
                if (typeof gsap !== 'undefined') {
                    const children = Array.from(panel.children);
                    if(children.length > 0) {
                        gsap.fromTo(children, 
                            { y: 30, opacity: 0 }, 
                            { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.2)", clearProps: "all" }
                        );
                    }
                }
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            activateTab(link.getAttribute("data-tab"));
        });
    });

    // Nav móvil
    mobileNavItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            activateTab(item.getAttribute("data-tab"));
        });
    });
}

// ==========================================================================
// RENDER ALL COMPONENTS
// ==========================================================================

function renderAll() {
    renderWeekCalendar();
    renderProgresoSemanal();
    renderTasksKanban();
    renderHabitsList();
    renderPhoneMockupTasks();
    renderEstadisticas();

    // Re-render Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// ==========================================================================
// WIDGET: TU SEMANA Y CALENDARIO COMPLETO (DINÁMICO)
// ==========================================================================

function setupCalendarControllers() {
    const btnPrevWeek = document.getElementById("btn-prev-week");
    const btnNextWeek = document.getElementById("btn-next-week");
    const btnViewMonth = document.getElementById("btn-view-month");
    const btnViewWeek = document.getElementById("btn-view-week");

    if (btnPrevWeek) {
        btnPrevWeek.addEventListener("click", () => {
            currentCalendarDate.setDate(currentCalendarDate.getDate() - 7);
            renderWeekCalendar();
        });
    }

    if (btnNextWeek) {
        btnNextWeek.addEventListener("click", () => {
            currentCalendarDate.setDate(currentCalendarDate.getDate() + 7);
            renderWeekCalendar();
        });
    }
}

function renderWeekCalendar() {
    const datesContainer = document.getElementById("dates-container");
    const calendarMonthYear = document.getElementById("calendar-month-year");
    if (!datesContainer) return;

    datesContainer.innerHTML = "";

    // Configurar mes y año en el título
    const options = { month: 'long', year: 'numeric' };
    if (calendarMonthYear) {
        calendarMonthYear.textContent = currentCalendarDate.toLocaleDateString('es-ES', options);
    }

    // Obtener el lunes de la semana actual
    const currentDayOfWeek = currentCalendarDate.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const startOfWeek = new Date(currentCalendarDate);
    startOfWeek.setDate(currentCalendarDate.getDate() - distanceToMonday);

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startOfWeek);
        currentDate.setDate(startOfWeek.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayNum = currentDate.getDate();

        // Check if there are events today
        const eventsToday = appState.events.filter(e => e.date === dateStr);
        const hasEvents = eventsToday.length > 0;
        const isToday = dateStr === todayStr;

        const span = document.createElement("span");
        span.className = `date-num ${isToday ? 'today' : ''} ${hasEvents ? 'highlighted yellow' : ''}`;
        span.textContent = dayNum;

        span.addEventListener("click", () => {
            showToast(`Día ${dayNum} seleccionado. ${hasEvents ? eventsToday.map(e => e.title).join(', ') : 'Sin eventos'}.`, "info");
        });

        datesContainer.appendChild(span);
    }

    // Actualizar leyenda de eventos en "Tu Semana" (solo mostrar los de esta semana)
    renderWeekEventsLegend(startOfWeek);

    // Render del Calendario Completo (Vista Mes)
    renderFullCalendarBoard();
}

function renderWeekEventsLegend(startOfWeek) {
    const legendContainer = document.querySelector(".events-legend");
    if (!legendContainer) return;
    legendContainer.innerHTML = "";

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const weekEvents = appState.events.filter(e => {
        const evDate = new Date(e.date);
        return evDate >= startOfWeek && evDate <= endOfWeek;
    });

    weekEvents.forEach(e => {
        const tag = document.createElement("div");
        const colorClass = e.category === "clases" ? "orange" : (e.category === "examenes" ? "red" : "green");
        tag.className = `event-tag ${colorClass}`;
        tag.innerHTML = `
            <span class="tag-color"></span>
            <div class="tag-info">
                <h4>${e.title}</h4>
                <p>${e.category.charAt(0).toUpperCase() + e.category.slice(1)} • ${e.time}</p>
            </div>
        `;
        legendContainer.appendChild(tag);
    });
}

function renderFullCalendarBoard() {
    const board = document.getElementById("calendar-board-container");
    const fullCalendarTitle = document.getElementById("full-calendar-title");
    if (!board) return;

    board.innerHTML = "";

    if (fullCalendarTitle) {
        fullCalendarTitle.textContent = currentCalendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }

    // Días de cabecera L M M J V S D
    const dayHeaders = ["L", "M", "M", "J", "V", "S", "D"];
    dayHeaders.forEach(day => {
        const header = document.createElement("div");
        header.className = "cal-grid-day-header";
        header.textContent = day;
        board.appendChild(header);
    });

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
    const totalDays = lastDayOfMonth.getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < startOffset; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "cal-cell other-month";
        board.appendChild(emptyCell);
    }

    for (let day = 1; day <= totalDays; day++) {
        const currentDate = new Date(year, month, day);
        // Ajustar la fecha considerando la zona horaria para ISO string
        currentDate.setMinutes(currentDate.getMinutes() - currentDate.getTimezoneOffset());
        const dateStr = currentDate.toISOString().split('T')[0];

        const isToday = dateStr === todayStr;
        const cell = document.createElement("div");
        cell.className = `cal-cell ${isToday ? 'today' : ''}`;

        const dayNumSpan = document.createElement("span");
        dayNumSpan.className = "cell-num";
        dayNumSpan.textContent = day;
        cell.appendChild(dayNumSpan);

        // Contenedor de eventos
        const eventContainer = document.createElement("div");
        eventContainer.className = "cell-events";

        const eventsToday = appState.events.filter(e => e.date === dateStr);
        eventsToday.forEach(ev => {
            const evEl = document.createElement("div");
            evEl.className = `cell-event-item ${ev.category}`;
            evEl.textContent = ev.title;
            eventContainer.appendChild(evEl);
        });

        cell.appendChild(eventContainer);
        cell.addEventListener("click", () => {
            // Pre-seleccionar la fecha al abrir el modal de evento
            document.getElementById("event-date").value = dateStr;
            toggleEventModal(true);
        });

        board.appendChild(cell);
    }
}

// ==========================================================================
// WIDGET: PROGRESO SEMANAL (RADIAL DE 78%)
// ==========================================================================

function renderProgresoSemanal() {
    const progressCircle = document.getElementById("weekly-progress-circle");
    const percentageText = document.getElementById("weekly-progress-percentage");

    if (!progressCircle || !percentageText) return;

    // Calcular progreso
    const totalTasks = appState.tasks.length;
    const completedTasks = appState.tasks.filter(t => t.status === "completed").length;
    const taskRatio = totalTasks > 0 ? (completedTasks / totalTasks) : 0;

    const completedHabits = appState.habits.filter(h => h.completedToday).length;
    const habitsRatio = appState.habits.length > 0 ? (completedHabits / appState.habits.length) : 0;

    const studyHoursRatio = appState.wellness.studyHoursThisWeek / 15; // Suponiendo meta de 15 horas

    // Promedio de las 3 variables de bienestar
    const finalPercentage = Math.round(((taskRatio + habitsRatio + studyHoursRatio) / 3) * 100);

    // Ajustar barra radial SVG
    // Dasharray original es 251.2 (2 * PI * radio 40)
    const circumference = 251.2;
    const offset = circumference - (finalPercentage / 100) * circumference;

    progressCircle.style.strokeDashoffset = offset;
    percentageText.textContent = `${finalPercentage}%`;

    // Actualizar barras individuales
    const fillTareas = document.getElementById("progreso-tareas-fill");
    const valTareas = document.getElementById("progreso-tareas-val");
    if (fillTareas && valTareas) {
        const pct = Math.round(taskRatio * 100);
        fillTareas.style.width = `${pct}%`;
        valTareas.textContent = `${pct}%`;
    }

    const fillHabitos = document.getElementById("progreso-habitos-fill");
    const valHabitos = document.getElementById("progreso-habitos-val");
    if (fillHabitos && valHabitos) {
        const pct = Math.round(habitsRatio * 100);
        fillHabitos.style.width = `${pct}%`;
        valHabitos.textContent = `${pct}%`;
    }

    const fillHoras = document.getElementById("progreso-horas-fill");
    const valHoras = document.getElementById("progreso-horas-val");
    if (fillHoras && valHoras) {
        const pct = Math.min(Math.round(studyHoursRatio * 100), 100);
        fillHoras.style.width = `${pct}%`;
        valHoras.textContent = `${pct}%`;
    }
}

// ==========================================================================
// TAREAS: KANBAN MANAGER (COMPLETO)
// ==========================================================================

function setupTaskManager() {
    const btnAddTaskDesktop = document.getElementById("btn-add-task-desktop");
    const btnAddTaskMobile = document.getElementById("btn-add-task-mobile");
    const btnCloseTaskModal = document.getElementById("btn-close-task-modal");
    const btnSaveTask = document.getElementById("btn-save-task");
    const taskModal = document.getElementById("task-modal");
    const taskModalOverlay = document.getElementById("task-modal-overlay");

    const toggleModal = (show) => {
        if (show) {
            taskModal.classList.add("active");
            taskModalOverlay.classList.add("active");
        } else {
            taskModal.classList.remove("active");
            taskModalOverlay.classList.remove("active");
        }
    };

    if (btnAddTaskDesktop) btnAddTaskDesktop.addEventListener("click", () => toggleModal(true));
    if (btnAddTaskMobile) btnAddTaskMobile.addEventListener("click", () => toggleModal(true));
    if (btnCloseTaskModal) btnCloseTaskModal.addEventListener("click", () => toggleModal(false));
    if (taskModalOverlay) taskModalOverlay.addEventListener("click", () => toggleModal(false));

    // Agregar nueva tarea
    if (btnSaveTask) {
        btnSaveTask.addEventListener("click", () => {
            const title = document.getElementById("task-title").value.trim();
            const desc = document.getElementById("task-desc").value.trim();
            const category = document.getElementById("task-category").value;
            const priority = document.getElementById("task-priority").value;
            const date = document.getElementById("task-date").value;
            const time = document.getElementById("task-time").value;

            if (!title || !date) {
                showToast("Por favor, rellena el título y la fecha.", "error");
                return;
            }

            const newTask = {
                id: "task_" + Date.now(),
                title,
                desc,
                category,
                priority,
                status: "pending",
                dueDate: date,
                time: time || "09:00"
            };

            appState.tasks.push(newTask);
            saveStateToStorage();
            toggleModal(false);

            // Limpiar inputs
            document.getElementById("task-title").value = "";
            document.getElementById("task-desc").value = "";
            document.getElementById("task-date").value = "";
            document.getElementById("task-time").value = "09:00";

            renderAll();
            showToast("Nueva tarea añadida correctamente.");
        });
    }

    // Buscador
    const searchTaskInput = document.getElementById("search-task");
    if (searchTaskInput) {
        searchTaskInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            renderTasksKanban(query);
        });
    }
}

// ==========================================================================
// EVENTOS: CALENDARIO MANAGER
// ==========================================================================

function toggleEventModal(show) {
    const eventModal = document.getElementById("event-modal");
    const eventModalOverlay = document.getElementById("event-modal-overlay");
    if (!eventModal || !eventModalOverlay) return;

    if (show) {
        eventModal.classList.add("active");
        eventModalOverlay.classList.add("active");
    } else {
        eventModal.classList.remove("active");
        eventModalOverlay.classList.remove("active");
    }
}

function setupEventManager() {
    const btnAddEvent = document.getElementById("btn-add-event");
    const btnCloseEventModal = document.getElementById("btn-close-event-modal");
    const eventModalOverlay = document.getElementById("event-modal-overlay");
    const btnSaveEvent = document.getElementById("btn-save-event");

    if (btnAddEvent) {
        btnAddEvent.addEventListener("click", () => {
            document.getElementById("event-title").value = "";
            document.getElementById("event-date").value = new Date().toISOString().split('T')[0];
            toggleEventModal(true);
        });
    }

    if (btnCloseEventModal) btnCloseEventModal.addEventListener("click", () => toggleEventModal(false));
    if (eventModalOverlay) eventModalOverlay.addEventListener("click", () => toggleEventModal(false));

    if (btnSaveEvent) {
        btnSaveEvent.addEventListener("click", () => {
            const title = document.getElementById("event-title").value.trim();
            const category = document.getElementById("event-category").value;
            const time = document.getElementById("event-time").value;
            const date = document.getElementById("event-date").value;

            if (!title || !date) {
                showToast("El título y fecha son obligatorios.", "error");
                return;
            }

            const newEvent = {
                id: `evt_${Date.now()}`,
                title,
                category,
                time,
                date
            };

            appState.events.push(newEvent);
            saveStateToStorage();
            toggleEventModal(false);

            // Re-render calendarios para reflejar el nuevo evento
            renderWeekCalendar();

            showToast("Evento agregado al calendario.", "success");
        });
    }
}

// Render Kanban Column lists
function renderTasksKanban(query = "") {
    const listPending = document.getElementById("list-pending");
    const listProgress = document.getElementById("list-progress");
    const listCompleted = document.getElementById("list-completed");

    if (!listPending || !listProgress || !listCompleted) return;

    listPending.innerHTML = "";
    listProgress.innerHTML = "";
    listCompleted.innerHTML = "";

    const counts = { pending: 0, progress: 0, completed: 0 };

    appState.tasks.forEach(t => {
        // Filtrar por query de búsqueda
        if (query && !t.title.toLowerCase().includes(query) && !t.category.toLowerCase().includes(query)) {
            return;
        }

        counts[t.status]++;

        const card = document.createElement("div");
        card.className = "task-card";
        card.draggable = true;

        card.innerHTML = `
            <div class="task-card-header">
                <span class="task-cat">${t.category}</span>
                <span class="task-prio">${t.priority === 'Alta' ? '🔥' : (t.priority === 'Media' ? '⚡' : '💤')}</span>
            </div>
            <h4>${t.title}</h4>
            <p>${t.desc || 'Sin descripción'}</p>
            <div class="task-card-footer">
                <span class="task-due"><i data-lucide="calendar"></i> ${t.dueDate} • <i data-lucide="clock"></i> ${t.time || '09:00'}</span>
                <div class="task-actions-row">
                    ${t.status !== 'completed' ? `<button class="task-action-btn check-btn" data-action="complete" data-id="${t.id}" title="Completar"><i data-lucide="check"></i></button>` : ''}
                    ${t.status === 'pending' ? `<button class="task-action-btn" style="color:var(--primary-orange)" data-action="progress" data-id="${t.id}" title="Comenzar"><i data-lucide="play"></i></button>` : ''}
                    <button class="task-action-btn delete-btn" data-action="delete" data-id="${t.id}" title="Eliminar"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `;

        // Event listeners para drag & drop
        card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", t.id);
            card.classList.add("dragging");
        });

        card.addEventListener("dragend", () => {
            card.classList.remove("dragging");
        });

        // Event listeners para los botones de acción interna
        card.querySelectorAll(".task-action-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-id");
                const action = btn.getAttribute("data-action");
                handleTaskAction(id, action);
            });
        });

        if (t.status === "pending") listPending.appendChild(card);
        if (t.status === "progress") listProgress.appendChild(card);
        if (t.status === "completed") listCompleted.appendChild(card);
    });

    // Configurar columnas como zonas de drop
    setupKanbanDropZones([listPending, listProgress, listCompleted]);

    // Actualizar badges
    document.getElementById("count-pending").textContent = counts.pending;
    document.getElementById("count-progress").textContent = counts.progress;
    document.getElementById("count-completed").textContent = counts.completed;
}

function handleTaskAction(id, action) {
    const taskIndex = appState.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    if (action === "complete") {
        appState.tasks[taskIndex].status = "completed";
        showToast("¡Tarea completada! Tu progreso semanal aumentó.");
        if (typeof confetti !== 'undefined') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 10000 });
        }
    } else if (action === "progress") {
        appState.tasks[taskIndex].status = "progress";
        showToast("Tarea en proceso.");
    } else if (action === "delete") {
        appState.tasks.splice(taskIndex, 1);
        showToast("Tarea eliminada correctamente.", "error");
    }

    saveStateToStorage();
    renderAll();
}

function setupKanbanDropZones(columns) {
    columns.forEach(col => {
        col.addEventListener("dragover", (e) => {
            e.preventDefault();
            col.classList.add("drag-over");
        });

        col.addEventListener("dragleave", () => {
            col.classList.remove("drag-over");
        });

        col.addEventListener("drop", (e) => {
            e.preventDefault();
            col.classList.remove("drag-over");

            const taskId = e.dataTransfer.getData("text/plain");
            const newStatus = col.id === "list-pending" ? "pending" : (col.id === "list-progress" ? "progress" : "completed");

            const taskIndex = appState.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1 && appState.tasks[taskIndex].status !== newStatus) {
                appState.tasks[taskIndex].status = newStatus;
                if (newStatus === "completed" && typeof confetti !== 'undefined') {
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 10000 });
                }
                saveStateToStorage();
                renderAll();
                showToast(`Tarea movida a ${newStatus === 'pending' ? 'Pendientes' : (newStatus === 'progress' ? 'En Proceso' : 'Completadas')}`, "info");
            }
        });
    });
}

// ==========================================================================
// HÁBITOS: TRACKER & RACHAS
// ==========================================================================

function setupHabitManager() {
    const btnAddHabit = document.getElementById("btn-add-habit");
    if (btnAddHabit) {
        btnAddHabit.addEventListener("click", () => {
            const title = prompt("Introduce el nombre del nuevo hábito:");
            if (!title) return;

            const newHabit = {
                id: "habit_" + Date.now(),
                title,
                streak: 0,
                completedToday: false,
                history: [false, false, false, false, false]
            };

            appState.habits.push(newHabit);
            saveStateToStorage();
            renderAll();
            showToast("Hábito creado con éxito.");
        });
    }
}

function renderHabitsList() {
    const container = document.getElementById("habits-container-list");
    if (!container) return;

    container.innerHTML = "";

    appState.habits.forEach(h => {
        const card = document.createElement("div");
        card.className = "habit-card";

        // Generar burbujas de historial de la semana
        let historyBubbles = "";
        const daysLabel = ["L", "M", "M", "J", "V"];
        for (let i = 0; i < 5; i++) {
            const completed = h.history[i] || false;
            historyBubbles += `<div class="habit-day-bubble ${completed ? 'done' : ''}">${daysLabel[i]}</div>`;
        }

        card.innerHTML = `
            <div class="habit-meta">
                <span class="habit-title">${h.title}</span>
                <span class="habit-streak"><i data-lucide="flame" style="width:12px;height:12px;display:inline;"></i> ${h.streak} días</span>
            </div>
            <div class="habit-week-history">
                ${historyBubbles}
            </div>
            <button class="habit-check-btn ${h.completedToday ? 'completed' : ''}" data-id="${h.id}">
                <i data-lucide="${h.completedToday ? 'check-circle-2' : 'circle'}"></i>
                <span>${h.completedToday ? 'Completado hoy' : 'Marcar realizado'}</span>
            </button>
        `;

        card.querySelector(".habit-check-btn").addEventListener("click", () => {
            toggleHabitStatus(h.id);
        });

        container.appendChild(card);
    });
}

function toggleHabitStatus(id) {
    const index = appState.habits.findIndex(h => h.id === id);
    if (index === -1) return;

    const habit = appState.habits[index];
    habit.completedToday = !habit.completedToday;

    if (habit.completedToday) {
        habit.streak += 1;
        habit.history[4] = true; // El día de hoy (viernes teórico) se marca
        showToast("¡Hábito completado! ¡No rompas tu racha!");
        if (typeof confetti !== 'undefined') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 10000 });
        }
    } else {
        habit.streak = Math.max(0, habit.streak - 1);
        habit.history[4] = false;
        showToast("Hábito desmarcado.");
    }

    saveStateToStorage();
    renderAll();
}

// ==========================================================================
// BIENESTAR: HERRAMIENTAS INTERACTIVAS
// ==========================================================================

function setupWellbeingTools() {
    // Emojis Selector de Bienestar
    const moodBtns = document.querySelectorAll(".mood-btn");
    moodBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            moodBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const mood = btn.getAttribute("data-mood");
            appState.wellness.currentMood = mood;

            // Actualizar frase de motivación dinámicamente según estado
            updateQuoteAccordingToMood(mood);
            saveStateToStorage();
            showToast("Estado emocional registrado. ¡Cuida de ti mismo!");
        });
    });

    // 1. Temporizador de Respiración
    const btnStartBreath = document.getElementById("btn-start-breath");
    const breathNode = document.getElementById("breath-node");
    const breathLabel = document.getElementById("breath-label");

    let breathingInterval = null;

    if (btnStartBreath && breathNode && breathLabel) {
        btnStartBreath.addEventListener("click", () => {
            if (breathingInterval) {
                // Parar sesión
                clearInterval(breathingInterval);
                breathingInterval = null;
                breathNode.className = "breath-circle";
                breathLabel.textContent = "Presiona Iniciar";
                btnStartBreath.textContent = "Iniciar Sesión";
                showToast("Sesión de respiración finalizada.", "info");
                return;
            }

            // Iniciar sesión interactiva de respiración 4-4-4-4
            btnStartBreath.textContent = "Detener Guía";
            let step = 0; // 0: Inhale, 1: Retener, 2: Exhale

            const runBreathingCycle = () => {
                if (step === 0) {
                    breathNode.className = "breath-circle inhale";
                    breathLabel.textContent = "Inhala aire (4s)...";
                    step = 1;
                } else if (step === 1) {
                    breathNode.className = "breath-circle hold";
                    breathLabel.textContent = "Mantén el aire (4s)...";
                    step = 2;
                } else if (step === 2) {
                    breathNode.className = "breath-circle";
                    breathLabel.textContent = "Exhala suavemente (4s)...";
                    step = 0;
                }
            };

            runBreathingCycle();
            breathingInterval = setInterval(runBreathingCycle, 4000);
            showToast("Sesión de respiración guiada iniciada.", "info");
        });
    }

    // 2. Temporizador de Enfoque Pomodoro con Pantalla de Bloqueo
    const btnPomodoroStart = document.getElementById("btn-pomodoro-start");
    const btnPomodoroReset = document.getElementById("btn-pomodoro-reset");
    const pomodoroDisplay = document.getElementById("pomodoro-display");
    const pomodoroDurationSelect = document.getElementById("pomodoro-duration");

    let pomodoroInterval = null;
    let pomodoroTimeLeft = 25 * 60; // 25 min por defecto
    let pomodoroTotalTime = 25 * 60;
    let lockScreenActive = false;

    // Elementos de la pantalla de bloqueo
    const lockScreen = document.getElementById("distraction-lock-screen");
    const lockTimer = document.getElementById("lock-timer");
    const lockProgress = document.getElementById("lock-progress");
    const lockMessage = document.getElementById("lock-message");
    const btnEmergencyExit = document.getElementById("btn-emergency-exit");

    // Actualizar timer cuando se cambia la duración
    if (pomodoroDurationSelect) {
        pomodoroDurationSelect.addEventListener("change", () => {
            if (!pomodoroInterval && !lockScreenActive) {
                const minutes = parseInt(pomodoroDurationSelect.value);
                pomodoroTimeLeft = minutes * 60;
                pomodoroTotalTime = minutes * 60;
                pomodoroDisplay.textContent = `${String(Math.floor(pomodoroTimeLeft / 60)).padStart(2, '0')}:${String(pomodoroTimeLeft % 60).padStart(2, '0')}`;
            }
        });
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(pomodoroTimeLeft / 60);
        const seconds = pomodoroTimeLeft % 60;
        const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        if (pomodoroDisplay) pomodoroDisplay.textContent = timeStr;
        if (lockTimer) lockTimer.textContent = timeStr;
    }

    function updateLockProgress() {
        if (!lockProgress) return;
        const elapsed = pomodoroTotalTime - pomodoroTimeLeft;
        const percentage = (elapsed / pomodoroTotalTime) * 100;
        lockProgress.style.width = `${percentage}%`;
    }

    function showLockScreen() {
        if (!lockScreen) return;
        lockScreen.style.display = "flex";
        lockScreenActive = true;

        // Request fullscreen for better immersion
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        }

        // Mensajes aleatorios de motivación
        const messages = [
            "¡Tú puedes! Mantén el enfoque.",
            "Cada minuto cuenta. ¡Sigue así!",
            "La disciplina de hoy es tu éxito de mañana.",
            "Respira y continúa. Estás haciendo un gran trabajo.",
            "¡Enfocado! Tu yo futuro te lo agradecerá."
        ];
        if (lockMessage) {
            lockMessage.textContent = messages[Math.floor(Math.random() * messages.length)];
        }
    }

    function hideLockScreen() {
        if (!lockScreen) return;
        lockScreen.style.display = "none";
        lockScreenActive = false;

        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
    }

    function startPomodoro() {
        // Obtener duración seleccionada
        const selectedMinutes = pomodoroDurationSelect ? parseInt(pomodoroDurationSelect.value) : 25;
        pomodoroTotalTime = selectedMinutes * 60;
        pomodoroTimeLeft = pomodoroTotalTime;

        pomodoroInterval = setInterval(() => {
            pomodoroTimeLeft--;
            updateTimerDisplay();
            updateLockProgress();

            if (pomodoroTimeLeft <= 0) {
                clearInterval(pomodoroInterval);
                pomodoroInterval = null;

                // Reproducir sonido de finalización
                playNotificationSound();

                hideLockScreen();

                // Resetear a la duración seleccionada
                pomodoroTimeLeft = pomodoroTotalTime;
                updateTimerDisplay();
                if (lockProgress) lockProgress.style.width = "0%";

                btnPomodoroStart.innerHTML = `<i data-lucide="play"></i> Concentrar`;
                if (window.lucide) window.lucide.createIcons();

                // Registrar hora de estudio
                const hours = selectedMinutes / 60;
                appState.wellness.studyHoursThisWeek += hours;
                saveStateToStorage();
                renderAll();

                sendNotification(
                    "¡Sesión completada!",
                    `Excelente trabajo. Completaste ${selectedMinutes} minutos de concentración.`,
                    "success"
                );
                showToast(`¡Excelente sesión de concentración! ${selectedMinutes} min añadidos al estudio.`, "success");
            }
        }, 1000);

        // Mostrar pantalla de bloqueo inmediatamente
        showLockScreen();
        updateTimerDisplay();

        btnPomodoroStart.innerHTML = `<i data-lucide="pause"></i> Pausar`;
        if (window.lucide) window.lucide.createIcons();

        showToast("Pantalla de concentración activada. ¡Enfócate!", "info");
    }

    if (btnPomodoroStart && btnPomodoroReset && pomodoroDisplay) {
        btnPomodoroStart.addEventListener("click", () => {
            if (pomodoroInterval) {
                // Pausar - pero mantener lock screen si está activo
                clearInterval(pomodoroInterval);
                pomodoroInterval = null;
                btnPomodoroStart.innerHTML = `<i data-lucide="play"></i> Reanudar`;
                if (window.lucide) window.lucide.createIcons();
                showToast("Temporizador pausado.", "info");
                return;
            }

            // Iniciar o reanudar
            if (pomodoroTimeLeft === pomodoroTotalTime || pomodoroTimeLeft === 25 * 60) {
                // Inicio nuevo
                startPomodoro();
            } else {
                // Reanudar
                pomodoroInterval = setInterval(() => {
                    pomodoroTimeLeft--;
                    updateTimerDisplay();
                    updateLockProgress();

                    if (pomodoroTimeLeft <= 0) {
                        clearInterval(pomodoroInterval);
                        pomodoroInterval = null;
                        playNotificationSound();
                        hideLockScreen();
                        pomodoroTimeLeft = pomodoroTotalTime;
                        updateTimerDisplay();
                        if (lockProgress) lockProgress.style.width = "0%";
                        btnPomodoroStart.innerHTML = `<i data-lucide="play"></i> Concentrar`;
                        if (window.lucide) window.lucide.createIcons();
                        const hours = (pomodoroTotalTime / 60) / 60;
                        appState.wellness.studyHoursThisWeek += hours;
                        saveStateToStorage();
                        renderAll();
                        sendNotification("¡Sesión completada!", "Excelente trabajo. Completaste tu sesión de concentración.", "success");
                        showToast("¡Excelente sesión de concentración!", "success");
                    }
                }, 1000);

                btnPomodoroStart.innerHTML = `<i data-lucide="pause"></i> Pausar`;
                if (window.lucide) window.lucide.createIcons();
                showLockScreen();
            }
        });

        btnPomodoroReset.addEventListener("click", () => {
            clearInterval(pomodoroInterval);
            pomodoroInterval = null;
            const selectedMinutes = pomodoroDurationSelect ? parseInt(pomodoroDurationSelect.value) : 25;
            pomodoroTimeLeft = selectedMinutes * 60;
            pomodoroTotalTime = pomodoroTimeLeft;
            pomodoroDisplay.textContent = `${String(Math.floor(pomodoroTimeLeft / 60)).padStart(2, '0')}:${String(pomodoroTimeLeft % 60).padStart(2, '0')}`;
            btnPomodoroStart.innerHTML = `<i data-lucide="play"></i> Concentrar`;
            if (window.lucide) window.lucide.createIcons();
            hideLockScreen();
            if (lockProgress) lockProgress.style.width = "0%";
            showToast("Pomodoro restablecido.", "info");
        });
    }

    // Botón de emergencia para salir
    if (btnEmergencyExit) {
        btnEmergencyExit.addEventListener("click", () => {
            if (confirm("¿Estás seguro de que quieres terminar la sesión de concentración? Perderás el progreso de esta sesión.")) {
                clearInterval(pomodoroInterval);
                pomodoroInterval = null;
                hideLockScreen();
                btnPomodoroStart.innerHTML = `<i data-lucide="play"></i> Concentrar`;
                if (window.lucide) window.lucide.createIcons();
                showToast("Sesión de concentración terminada.", "info");
            }
        });
    }
}

function updateQuoteAccordingToMood(mood) {
    const quoteText = document.querySelector(".quote-text");
    if (!quoteText) return;

    const quotes = {
        "muy-feliz": "“El entusiasmo es el motor del éxito. ¡Sigue brillando hoy! 🎉”",
        "feliz": "“La disciplina de hoy es el éxito de mañana. ¡Gran trabajo! ⚡”",
        "neutral": "“Paso a paso, día a día. La consistencia silenciosa crea imperios. 🧘”",
        "triste": "“Está bien no tener un día perfecto. Respira hondo y prioriza tu paz mental. 🌸”",
        "muy-triste": "“El agotamiento es real. Tu salud vale más que cualquier nota. Tómate un descanso hoy. ❤️”"
    };

    quoteText.textContent = quotes[mood] || quotes["feliz"];
}

// ==========================================================================
// GOOGLE CALENDAR SYNC (SIMULATED & ANIMATED)
// ==========================================================================

function setupSyncGoogle() {
    const btnSyncGoogle = document.getElementById("btn-sync-google");
    if (btnSyncGoogle) {
        btnSyncGoogle.addEventListener("click", () => {
            const syncIcon = btnSyncGoogle.parentElement.querySelector(".sync-icon");
            const lastSync = btnSyncGoogle.parentElement.querySelector(".last-sync");

            if (syncIcon) syncIcon.classList.add("rotating");
            btnSyncGoogle.disabled = true;
            btnSyncGoogle.textContent = "Sincronizando...";

            setTimeout(() => {
                if (syncIcon) syncIcon.classList.remove("rotating");
                btnSyncGoogle.disabled = false;
                btnSyncGoogle.textContent = "Sincronizar ahora";
                if (lastSync) lastSync.textContent = "Última sinc: Ahora mismo";

                showToast("¡Google Calendar sincronizado correctamente! Se importaron 2 clases.", "success");
            }, 2500);
        });
    }
}

// ==========================================================================
// PHYSICAL PLANNER SYNC: GENERATE PRINTABLE PLANNING PDF LAYOUT
// ==========================================================================

function setupPDFPlannerSync() {
    const btnExportPdfPlanner = document.getElementById("btn-export-pdf-planner");
    if (btnExportPdfPlanner) {
        btnExportPdfPlanner.addEventListener("click", () => {
            generatePhysicalPlannerPDF();
        });
    }
}

function generatePhysicalPlannerPDF() {
    // Abrir una ventana nueva optimizada y formateada con CSS de impresión A5/Carta
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        showToast("Error al abrir el planificador. Permite las ventanas emergentes en tu navegador.", "error");
        return;
    }

    const todayStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const pendingTasksListHtml = appState.tasks
        .filter(t => t.status !== "completed")
        .map(t => `<li>[  ] <strong>${t.category}</strong>: ${t.title}</li>`)
        .join("");

    const habitsListHtml = appState.habits
        .map(h => `<li>[  ] <strong>${h.title}</strong> (Racha: ${h.streak}d)</li>`)
        .join("");

    const quoteText = document.querySelector(".quote-text").textContent;

    // Escribir estructura HTML limpia y ultra-estética para imprimir
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Planificador Físico - Student Balance Planner</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');
                
                @page {
                    size: letter;
                    margin: 1.5cm;
                }
                
                body {
                    font-family: 'Outfit', sans-serif;
                    color: #1e293b;
                    background-color: #ffffff;
                    margin: 0;
                    padding: 0;
                }

                .planner-container {
                    border: 2px solid #5d2a8e;
                    border-radius: 20px;
                    padding: 30px;
                    height: 94vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-sizing: border-box;
                }

                header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 15px;
                }

                .brand h1 {
                    font-size: 24px;
                    font-weight: 800;
                    color: #5d2a8e;
                    margin: 0;
                }

                .brand p {
                    font-size: 10px;
                    font-weight: 600;
                    color: #64748b;
                    letter-spacing: 1px;
                    margin: 2px 0 0 0;
                }

                .date-tag {
                    font-size: 12px;
                    font-weight: 600;
                    background: #f1f5f9;
                    padding: 6px 14px;
                    border-radius: 20px;
                }

                .grid-sections {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 25px;
                    flex: 1;
                    margin: 25px 0;
                }

                .section-box {
                    border: 1.5px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                }

                .section-box h3 {
                    font-size: 14px;
                    font-weight: 800;
                    color: #5d2a8e;
                    margin-top: 0;
                    margin-bottom: 15px;
                    border-bottom: 1.5px dashed #e2e8f0;
                    padding-bottom: 8px;
                }

                ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                li {
                    font-size: 12px;
                    margin-bottom: 12px;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 8px;
                }

                .habit-boxes {
                    display: flex;
                    gap: 5px;
                    margin-top: 5px;
                }

                .habit-dot {
                    width: 14px;
                    height: 14px;
                    border: 1px solid #cbd5e1;
                    border-radius: 3px;
                }

                .notes-lines {
                    flex: 1;
                    background-image: linear-gradient(#e2e8f0 1px, transparent 1px);
                    background-size: 100% 24px;
                    line-height: 24px;
                    margin-top: 10px;
                }

                footer {
                    border-top: 1.5px solid #e2e8f0;
                    padding-top: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .quote {
                    font-size: 11px;
                    font-style: italic;
                    color: #64748b;
                    max-width: 60%;
                }

                .logo-footer {
                    font-size: 12px;
                    font-weight: 800;
                }

                @media print {
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="planner-container">
                <header>
                    <div class="brand">
                        <h1>Student Balance</h1>
                        <p>STUDENT BALANCE PLANNER</p>
                    </div>
                    <div class="date-tag">${todayStr}</div>
                </header>

                <div class="grid-sections">
                    <div class="section-box">
                        <h3>Tareas y Prioridades de la Semana</h3>
                        <ul>
                            ${pendingTasksListHtml || '<li>[  ] Añadir tareas digitales primero para autocompletar...</li>'}
                        </ul>
                    </div>

                    <div class="section-box">
                        <h3>Control de Hábitos</h3>
                        <ul>
                            ${habitsListHtml || '<li>[  ] Sin hábitos programados hoy...</li>'}
                        </ul>
                    </div>

                    <div class="section-box" style="grid-column: span 2; height: 180px;">
                        <h3>Notas y Autocuidado</h3>
                        <div class="notes-lines"></div>
                    </div>
                </div>

                <footer>
                    <div class="quote">${quoteText}</div>
                    <div class="logo-footer">Student Balance Planner ©</div>
                </footer>
            </div>
            
            <script>
                // Auto imprimir al cargar
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
    showToast("¡Formato de agenda física listo para imprimir!", "success");
}

// ==========================================================================
// NOTIFICATIONS DROPDOWN CENTER
// ==========================================================================

function setupNotificationCenter() {
    const bell = document.querySelector(".notif-bell");
    const dropdown = document.getElementById("notif-dropdown");

    if (bell && dropdown) {
        bell.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.classList.toggle("active");

            // Limpiar badge
            const badge = document.getElementById("notif-badge");
            if (badge) {
                badge.style.display = "none";
            }
        });

        // Prevenir cierre al hacer clic dentro del menú
        dropdown.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        document.addEventListener("click", () => {
            dropdown.classList.remove("active");
        });
    }
}

// ==========================================================================
// NOTIFICATION SYSTEM WITH SOUND - TASK REMINDERS
// ==========================================================================

// Audio context that gets initialized on first user interaction
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Request notification permission
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("Este navegador no soporta notificaciones de escritorio");
        return;
    }

    if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
            appState.notificationPermission = permission;
            saveStateToStorage();
            if (permission === "granted") {
                showToast("Notificaciones activadas. ¡Recibirás recordatorios de tus tareas!", "success");
            }
        });
    } else if (Notification.permission === "granted") {
        appState.notificationPermission = "granted";
    }
}

// Send notification with sound
function sendNotification(title, body, icon = "info") {
    // Always show toast as fallback/confirmation
    showToast(`${title} - ${body}`, "info");

    if (Notification.permission !== "granted") {
        return;
    }

    const icons = {
        info: "🔔",
        warning: "⚠️",
        success: "✅",
        task: "📚",
        exam: "📝"
    };

    const notification = new Notification(`${icons[icon] || "🔔"} ${title}`, {
        body: body,
        requireInteraction: true,
        tag: `${title}_${Date.now()}`
    });

    // Sound immediately
    playNotificationSound();

    // Vibrate on mobile if supported
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }

    // Auto cerrar después de 8 segundos
    setTimeout(() => notification.close(), 8000);
}

// Play notification sound - LOUDER and more noticeable
function playNotificationSound() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Create a 3-beep alarm pattern (more noticeable)
        const beepTimes = [0, 0.2, 0.4]; // Three beeps
        const beepFreqs = [880, 880, 1100]; // A5, A5, C6 - ascending

        beepTimes.forEach((time, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.value = beepFreqs[i];
            osc.type = "square"; // Square wave is louder

            // Sharp attack, quick decay
            gain.gain.setValueAtTime(0, now + time);
            gain.gain.linearRampToValueAtTime(0.4, now + time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.18);

            osc.start(now + time);
            osc.stop(now + time + 0.2);
        });

        // Second set of beeps after a short pause
        setTimeout(() => {
            try {
                const ctx2 = getAudioContext();
                const now2 = ctx2.currentTime;

                const beepTimes2 = [0, 0.15, 0.3];
                const beepFreqs2 = [1100, 1100, 1320]; // Higher pitch second round

                beepTimes2.forEach((time, i) => {
                    const osc = ctx2.createOscillator();
                    const gain = ctx2.createGain();
                    osc.connect(gain);
                    gain.connect(ctx2.destination);
                    osc.frequency.value = beepFreqs2[i];
                    osc.type = "square";
                    gain.gain.setValueAtTime(0, now2 + time);
                    gain.gain.linearRampToValueAtTime(0.35, now2 + time + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.01, now2 + time + 0.13);
                    osc.start(now2 + time);
                    osc.stop(now2 + time + 0.15);
                });
            } catch (e) {
                console.error("Error second beep:", e);
            }
        }, 600);

    } catch (e) {
        console.error("Error al reproducir sonido:", e);
    }
}

// Check for tomorrow's tasks
function checkTomorrowsTasks() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const tasksTomorrow = appState.tasks.filter(t => {
        return t.dueDate === tomorrowStr && t.status !== "completed";
    });

    if (tasksTomorrow.length > 0 && !tomorrowReminderShown) {
        const taskNames = tasksTomorrow.map(t => t.title).join(", ");
        sendNotification(
            "Tareas para mañana",
            `Hola, tienes ${tasksTomorrow.length} tarea(s) para mañana: ${taskNames}. ¡Prepárate!`,
            "task"
        );
        tomorrowReminderShown = true;
        notifiedTasks.add("tomorrow_done");
    }
}

// Check for upcoming tasks (30 minutes before)
function checkUpcomingTasks() {
    const now = new Date();
    const currentStr = now.toISOString().split('T')[0];
    const currentTime = now.getHours() * 60 + now.getMinutes();

    appState.tasks.forEach(t => {
        if (t.dueDate === currentStr && t.status !== "completed" && t.time) {
            const [hours, minutes] = t.time.split(":").map(Number);
            const taskTime = hours * 60 + minutes;
            const timeDiff = taskTime - currentTime;

            // Notificar 30 minutos antes (entre 29 y 30 minutos antes)
            if (timeDiff >= 29 && timeDiff <= 30) {
                sendNotification(
                    `Próxima tarea: ${t.title}`,
                    `Tu tarea "${t.title}" es en 30 minutos (${t.time}). ¡Prepárate!`,
                    "warning"
                );
            }

            // Notificar 1 hora antes (entre 59 y 60 minutos antes)
            if (timeDiff >= 59 && timeDiff <= 60) {
                sendNotification(
                    `Recordatorio: ${t.title}`,
                    `Tu tarea "${t.title}" es en 1 hora (${t.time}).`,
                    "info"
                );
            }
        }
    });
}

// Check for upcoming events (30 y 40 minutes before)
function checkUpcomingEvents() {
    const now = new Date();
    const currentStr = now.toISOString().split('T')[0];
    const currentTime = now.getHours() * 60 + now.getMinutes();

    appState.events.forEach(e => {
        if (e.date === currentStr && e.time) {
            const [hours, minutes] = e.time.split(":").map(Number);
            const eventTime = hours * 60 + minutes;
            const timeDiff = eventTime - currentTime;

            // Notificar 30 minutos antes (entre 29 y 30 minutos antes)
            if (timeDiff >= 29 && timeDiff <= 30) {
                showEventFullscreenAlert(e, 30);
            }
            
            // Notificar 40 minutos antes (entre 39 y 40 minutos antes)
            if (timeDiff >= 39 && timeDiff <= 40) {
                showEventFullscreenAlert(e, 40);
            }
        }
    });
}

function showEventFullscreenAlert(event, minLeft) {
    const alertScreen = document.getElementById("event-alert-screen");
    const timerDisplay = document.getElementById("event-alert-timer");
    const messageDisplay = document.getElementById("event-alert-message");
    
    if (alertScreen && timerDisplay && messageDisplay) {
        timerDisplay.textContent = `${minLeft} MIN`;
        messageDisplay.textContent = `Faltan ${minLeft} minutos para tu evento: ${event.title}.`;
        alertScreen.style.display = "flex";
        
        if (eventAlertSoundInterval) clearInterval(eventAlertSoundInterval);
        playTinTinTinSound();
        eventAlertSoundInterval = setInterval(playTinTinTinSound, 1500);
    }
}

function playTinTinTinSound() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const beepTimes = [0, 0.2, 0.4];
        const beepFreqs = [1200, 1200, 1200]; // Tono "tin" constante

        beepTimes.forEach((time, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = beepFreqs[i];
            osc.type = "sine"; // Onda senoidal suena más como campana/tin

            gain.gain.setValueAtTime(0, now + time);
            gain.gain.linearRampToValueAtTime(0.5, now + time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.15);

            osc.start(now + time);
            osc.stop(now + time + 0.2);
        });
    } catch (e) {
        console.error("Error al reproducir sonido tin tin tin:", e);
    }
}

// Setup notification scheduler
function setupNotificationScheduler() {
    // Request permission on app load
    requestNotificationPermission();

    // Check for tomorrow's tasks immediately
    setTimeout(() => checkTomorrowsTasks(), 2000);

    // Check every minute for upcoming tasks and events
    notificationCheckInterval = setInterval(() => {
        checkUpcomingTasks();
        checkUpcomingEvents();
    }, 60000);

    // Event listener para cerrar la alerta de eventos en pantalla completa
    const btnCloseEventAlert = document.getElementById("btn-close-event-alert");
    if (btnCloseEventAlert) {
        btnCloseEventAlert.addEventListener("click", () => {
            const alertScreen = document.getElementById("event-alert-screen");
            if (alertScreen) alertScreen.style.display = "none";
            if (eventAlertSoundInterval) {
                clearInterval(eventAlertSoundInterval);
                eventAlertSoundInterval = null;
            }
        });
    }

    // Also check when tasks are added/updated
    showToast("Sistema de notificaciones activado", "info");
}

// ==========================================================================
// MOBILE MOCKUP INTERACTIVOS & ACTIONS (SINCRO INTEGRADA)
// ==========================================================================

function setupMobileMockupInteractivity() {
    const container = document.getElementById("phone-tasks-container");
    if (!container) return;

    // Filtros rápidos del móvil
    const filterExams = document.getElementById("card-filter-exams");
    const filterClasses = document.getElementById("card-filter-classes");
    const filterTasks = document.getElementById("card-filter-tasks");
    const clearFilter = document.getElementById("btn-clear-phone-filter");

    const setFilter = (type, elem) => {
        document.querySelectorAll(".summary-card").forEach(c => c.classList.remove("active-filter"));

        if (appState.activePhoneFilter === type) {
            appState.activePhoneFilter = null;
            if (clearFilter) clearFilter.style.display = "none";
        } else {
            appState.activePhoneFilter = type;
            elem.classList.add("active-filter");
            if (clearFilter) clearFilter.style.display = "inline";
        }
        renderPhoneMockupTasks();
    };

    if (filterExams) filterExams.addEventListener("click", () => setFilter("exams", filterExams));
    if (filterClasses) filterClasses.addEventListener("click", () => setFilter("classes", filterClasses));
    if (filterTasks) filterTasks.addEventListener("click", () => setFilter("tasks", filterTasks));

    if (clearFilter) {
        clearFilter.addEventListener("click", () => {
            appState.activePhoneFilter = null;
            document.querySelectorAll(".summary-card").forEach(c => c.classList.remove("active-filter"));
            clearFilter.style.display = "none";
            renderPhoneMockupTasks();
        });
    }
}

function renderPhoneMockupTasks() {
    const container = document.getElementById("phone-tasks-container");
    const listTitle = document.getElementById("phone-list-title");
    const phoneCountText = document.getElementById("phone-pending-tasks-count");

    if (!container) return;

    container.innerHTML = "";

    // Filtrar tareas que se renderizarán
    let tasksToRender = appState.tasks.filter(t => t.status !== "completed");

    // Sincronizar número de tareas pendientes
    if (phoneCountText) {
        phoneCountText.textContent = tasksToRender.length;
    }

    if (appState.activePhoneFilter === "exams") {
        if (listTitle) listTitle.textContent = "Próximos Exámenes";
        // Mostrar exámenes simulados
        container.innerHTML = `
            <div class="phone-task-item exam-highlight">
                <i data-lucide="alert-circle" style="width:14px;color:var(--primary-red)"></i>
                <span>Álgebra Lineal (6 días)</span>
            </div>
            <div class="phone-task-item exam-highlight">
                <i data-lucide="alert-circle" style="width:14px;color:var(--primary-red)"></i>
                <span>Física II (12 días)</span>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    if (appState.activePhoneFilter === "classes") {
        if (listTitle) listTitle.textContent = "Clases de Hoy";
        // Clases simuladas
        container.innerHTML = `
            <div class="phone-task-item class-highlight">
                <i data-lucide="book-open" style="width:14px;color:var(--primary-blue)"></i>
                <span>Física II (09:00 AM)</span>
            </div>
            <div class="phone-task-item class-highlight">
                <i data-lucide="code" style="width:14px;color:var(--primary-blue)"></i>
                <span>Programación (11:00 AM)</span>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    // Default: Mostrar tareas pendientes reales
    if (listTitle) listTitle.textContent = "Próximas tareas";

    if (tasksToRender.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;font-size:10px;color:var(--text-light);padding:15px;">
                ¡Todo al día! Disfruta de tu descanso.
            </div>
        `;
        return;
    }

    tasksToRender.forEach(t => {
        const item = document.createElement("div");
        item.className = "phone-task-item";

        item.innerHTML = `
            <div class="phone-check" data-id="${t.id}"></div>
            <span>${t.title}</span>
        `;

        item.querySelector(".phone-check").addEventListener("click", () => {
            handleTaskAction(t.id, "complete");
        });

        container.appendChild(item);
    });

    if (window.lucide) window.lucide.createIcons();
}

// ==========================================================================
// AJUSTES ACTIONS (MODO OSCURO / CLARO / REINICIO)
// ==========================================================================

function setupAjustesActions() {
    const btnToggleTheme = document.getElementById("btn-toggle-theme");
    const btnResetData = document.getElementById("btn-reset-data");
    const btnUnlinkGoogle = document.getElementById("btn-unlink-google-auth");
    const btnLogout = document.getElementById("btn-logout");
    const btnRestartTutorial = document.getElementById("btn-restart-tutorial");

    // Reiniciar Tutorial / Cambiar Tema
    if (btnRestartTutorial) {
        btnRestartTutorial.addEventListener("click", () => {
            showTutorialSetupModal();
        });
    }

    // Toggle de Tema (Claro / Oscuro)
    if (btnToggleTheme) {
        btnToggleTheme.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute("data-theme");
            const newTheme = currentTheme === "dark" ? "light" : "dark";

            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("sb_theme", newTheme);

            const sunIcon = btnToggleTheme.querySelector(".sun-icon");
            const moonIcon = btnToggleTheme.querySelector(".moon-icon");

            if (newTheme === "dark") {
                sunIcon.style.display = "none";
                moonIcon.style.display = "block";
                showToast("Modo oscuro activado.", "info");
            } else {
                sunIcon.style.display = "block";
                moonIcon.style.display = "none";
                showToast("Modo claro activado.", "info");
            }
        });

        // Cargar tema guardado
        const savedTheme = localStorage.getItem("sb_theme");
        if (savedTheme === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
            btnToggleTheme.querySelector(".sun-icon").style.display = "none";
            btnToggleTheme.querySelector(".moon-icon").style.display = "block";
        }
    }

    // Resetear datos
    if (btnResetData) {
        btnResetData.addEventListener("click", () => {
            if (confirm("¿Estás seguro de que quieres borrar todos tus datos locales de tareas, hábitos y bienestar? Esta acción no se puede deshacer.")) {
                localStorage.removeItem(`sb_state_${currentUser.id}`);
                showToast("Todos los datos locales han sido borrados. Recargando...", "error");
                setTimeout(() => location.reload(), 1500);
            }
        });
    }

    // Desvincular Google
    if (btnUnlinkGoogle) {
        btnUnlinkGoogle.addEventListener("click", () => {
            showToast("Acceso de Google Calendar revocado.", "info");
        });
    }

    // Cerrar sesión
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            logout(onUserLoggedOut);
        });
    }
}

// Cargar estadísticas
function renderEstadisticas() {
    const totalTasksText = document.getElementById("stat-total-tasks");
    const habitsStreakText = document.getElementById("stat-streak-habits");
    const studyHoursText = document.getElementById("stat-study-hours");

    if (totalTasksText) {
        const completedCount = appState.tasks.filter(t => t.status === "completed").length;
        totalTasksText.textContent = completedCount;
    }

    if (habitsStreakText) {
        const maxStreak = appState.habits.reduce((max, h) => h.streak > max ? h.streak : max, 0);
        habitsStreakText.textContent = `${maxStreak} días`;
    }

    if (studyHoursText) {
        studyHoursText.textContent = `${appState.wellness.studyHoursThisWeek} hrs`;
    }
}
