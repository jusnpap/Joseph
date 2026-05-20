/* ==========================================================================
   AUTH SYSTEM: GOOGLE SIGN-IN & LOCAL ACCOUNTS (auth.js)
   Saves profile information and manages the active student session.
   ========================================================================== */

// Configuración de tu Google Client ID de Google Cloud Console
// Configuración de tu Google Client ID de Google Cloud Console
var GOOGLE_CLIENT_ID = "1040900213875-67mr6d8bkhifr251jrun6g7smmcbup8r.apps.googleusercontent.com";

// Estado global de la sesión
var currentUser = null;

// Inicialización de la Autenticación
function initAuth(onUserLoggedCallback) {
    setupAuthPanels();
    checkExistingSession(onUserLoggedCallback);
    initGoogleSignIn(onUserLoggedCallback);
    setupLocalAuth(onUserLoggedCallback);

    // Animación de entrada con GSAP para la pantalla de Auth
    const authScreen = document.getElementById("auth-screen");
    if (authScreen && authScreen.classList.contains("active") && typeof gsap !== "undefined") {
        gsap.fromTo(".auth-card", 
            { y: 40, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.5)", clearProps: "all" }
        );
        gsap.fromTo(".input-group, .btn-primary, .divider, .google-auth-wrapper, .auth-switch",
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out", delay: 0.2, clearProps: "all" }
        );
    }
}

// Alternar entre paneles de Login y Registro
function setupAuthPanels() {
    const switchToSignupBtn = document.getElementById("switch-to-signup");
    const switchToLoginBtn = document.getElementById("switch-to-login");
    const loginPanel = document.getElementById("login-form-panel");
    const signupPanel = document.getElementById("signup-form-panel");

    if (switchToSignupBtn && switchToLoginBtn && loginPanel && signupPanel) {
        switchToSignupBtn.addEventListener("click", () => {
            loginPanel.classList.remove("active");
            signupPanel.classList.add("active");
        });

        switchToLoginBtn.addEventListener("click", () => {
            signupPanel.classList.remove("active");
            loginPanel.classList.add("active");
        });
    }
}

// Comprobar si hay una sesión guardada en LocalStorage
function checkExistingSession(onUserLoggedCallback) {
    const savedSession = localStorage.getItem("sb_user_session");
    if (savedSession) {
        try {
            currentUser = JSON.parse(savedSession);
            onUserLoggedCallback(currentUser);
        } catch (e) {
            localStorage.removeItem("sb_user_session");
        }
    }
}

// Inicializar Google Identity Services (Google Sign-In)
function initGoogleSignIn(onUserLoggedCallback) {
    if (typeof window.google !== "undefined" && window.google.accounts) {
        // SDK ya cargado (script sincrono o cargado antes que DOMContentLoaded)
        _setupRealGoogleButton(onUserLoggedCallback);
    } else {
        // El script de Google se carga con async/defer: esperamos su callback oficial
        window.onGoogleLibraryLoad = function () {
            _setupRealGoogleButton(onUserLoggedCallback);
        };

        // Fallback adicional: si por alguna razon onGoogleLibraryLoad no se llama
        // (bloqueo de red, extension, etc.), mostrar boton propio tras 2.5s
        setTimeout(() => {
            const btnContainer = document.getElementById("google-signin-btn");
            if (btnContainer && btnContainer.children.length === 0) {
                console.warn("SDK de Google no cargó en tiempo. Mostrando botón de respaldo.");
                createMockGoogleButton(btnContainer, onUserLoggedCallback);
            }
        }, 2500);
    }
}

// Configura e inyecta el botón real de Google (solo cuando el SDK está listo)
function _setupRealGoogleButton(onUserLoggedCallback) {
    try {
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => handleGoogleSignInResponse(response, onUserLoggedCallback),
            auto_select: false
        });

        const btnContainer = document.getElementById("google-signin-btn");
        if (btnContainer) {
            window.google.accounts.id.renderButton(btnContainer, {
                theme: "outline",
                size: "large",
                text: "signin_with",
                shape: "rectangular",
                logo_alignment: "center",
                width: 320
            });
        }
    } catch (err) {
        console.error("Error al inicializar Google Sign-In:", err);
        // Si falla el renderizado, mostrar boton de respaldo
        const btnContainer = document.getElementById("google-signin-btn");
        if (btnContainer) createMockGoogleButton(btnContainer, onUserLoggedCallback);
    }
}

// Crear un botón simulado de Google premium si el Client ID no se ha configurado
function createMockGoogleButton(container, onUserLoggedCallback) {
    container.innerHTML = `
        <button id="btn-google-mock" class="btn-secondary" style="display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; max-width: 320px; padding: 12px; font-weight: 700; border: 1.5px solid #dadce0; border-radius: 8px; background: white; color: #3c4043; cursor: pointer; transition: all 0.3s ease;">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48" class="abcRioButtonSvg" style="display: block;">
                <g>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.5 24c0-1.61-.15-3.16-.45-4.66H24v9.03h12.75c-.55 2.68-2.07 4.96-4.34 6.48l7.98 6.19C45.02 36.46 46.5 30.82 46.5 24z"></path>
                    <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.98-6.19c-2.21 1.48-5.07 2.38-7.91 2.38-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </g>
            </svg>
            <span>Iniciar sesión con Google (Simulado)</span>
        </button>
    `;

    document.getElementById("btn-google-mock").addEventListener("click", () => {
        // Alerta educativa sobre cómo configurar Google Cloud
        showToast("¡Simulando Google Auth! Puedes agregar tu Client ID en auth.js.", "info");

        // Simular perfil del estudiante
        const mockGoogleUser = {
            id: "google_123456789",
            name: "Camila Ortiz",
            email: "camila.ortiz@universidad.edu.ec",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
            provider: "google"
        };

        saveSession(mockGoogleUser, onUserLoggedCallback);
    });
}

// Procesar la respuesta del SDK real de Google
function handleGoogleSignInResponse(response, onUserLoggedCallback) {
    try {
        const credential = response.credential;
        const payload = parseJwt(credential);

        const googleUser = {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            avatar: payload.picture,
            provider: "google"
        };

        saveSession(googleUser, onUserLoggedCallback);
        showToast(`¡Bienvenido de nuevo, ${googleUser.name}!`, "success");
    } catch (err) {
        console.error("Error procesando credenciales de Google:", err);
        showToast("Error al iniciar sesión con Google.", "error");
    }
}

// Guardar datos en el estado y en LocalStorage
function saveSession(user, onUserLoggedCallback) {
    currentUser = user;
    localStorage.setItem("sb_user_session", JSON.stringify(user));
    onUserLoggedCallback(user);
}

// Cerrar sesión
function logout(onLoggedOutCallback) {
    currentUser = null;
    localStorage.removeItem("sb_user_session");
    
    // Revocar tokens de Google si aplica
    if (typeof window.google !== "undefined") {
        window.google.accounts.id.disableAutoSelect();
    }
    
    onLoggedOutCallback();
    showToast("Sesión cerrada correctamente.", "info");
}

// ==========================================================================
// AUTENTICACIÓN LOCAL DE RESPALDO (LocalStorage)
// ==========================================================================
function setupLocalAuth(onUserLoggedCallback) {
    const btnLoginLocal = document.getElementById("btn-login-local");
    const btnSignupLocal = document.getElementById("btn-signup-local");

    // Registro de cuenta local
    if (btnSignupLocal) {
        btnSignupLocal.addEventListener("click", () => {
            const nameInput = document.getElementById("signup-name").value.trim();
            const emailInput = document.getElementById("signup-email").value.trim();
            const passwordInput = document.getElementById("signup-password").value.trim();

            if (!nameInput || !emailInput || !passwordInput) {
                showToast("Por favor, rellena todos los campos.", "error");
                return;
            }

            // Guardar usuario en una lista en LocalStorage
            let registeredUsers = JSON.parse(localStorage.getItem("sb_registered_users") || "[]");
            
            // Verificar si el correo ya existe
            if (registeredUsers.some(u => u.email === emailInput)) {
                showToast("El correo ya está registrado.", "error");
                return;
            }

            const newUser = {
                id: "local_" + Date.now(),
                name: nameInput,
                email: emailInput,
                password: passwordInput, // En producción real esto va encriptado en el servidor
                avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nameInput)}`,
                provider: "local"
            };

            registeredUsers.push(newUser);
            localStorage.setItem("sb_registered_users", JSON.stringify(registeredUsers));

            showToast("Cuenta creada con éxito. Iniciando sesión...", "success");
            
            // Iniciar sesión automáticamente
            const sessionUser = { ...newUser };
            delete sessionUser.password; // No guardar contraseña en la sesión
            saveSession(sessionUser, onUserLoggedCallback);
        });
    }

    // Iniciar Sesión local
    if (btnLoginLocal) {
        btnLoginLocal.addEventListener("click", () => {
            const emailInput = document.getElementById("login-email").value.trim();
            const passwordInput = document.getElementById("login-password").value.trim();

            if (!emailInput || !passwordInput) {
                showToast("Por favor, introduce correo y contraseña.", "error");
                return;
            }

            let registeredUsers = JSON.parse(localStorage.getItem("sb_registered_users") || "[]");
            const foundUser = registeredUsers.find(u => u.email === emailInput && u.password === passwordInput);

            if (!foundUser) {
                // Cuenta de prueba automática si el usuario no tiene ninguna y pone "test@uni.edu"
                if (emailInput === "test@uni.edu" && passwordInput === "123456") {
                    const testUser = {
                        id: "local_test",
                        name: "Camila",
                        email: "test@uni.edu",
                        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
                        provider: "local"
                    };
                    saveSession(testUser, onUserLoggedCallback);
                    showToast("Iniciando con cuenta de prueba...", "success");
                    return;
                }

                // Cuenta de prueba automática para Juan
                const normalizedEmail = emailInput.toLowerCase();
                if ((normalizedEmail === "juan123" || normalizedEmail === "juan123@uni.edu") && passwordInput === "123") {
                    const juanUser = {
                        id: "local_juan",
                        name: "Juan",
                        email: "juan123@uni.edu",
                        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=256&auto=format&fit=crop",
                        provider: "local"
                    };
                    saveSession(juanUser, onUserLoggedCallback);
                    showToast("¡Hola de nuevo, Juan!", "success");
                    return;
                }

                showToast("Correo o contraseña incorrectos.", "error");
                return;
            }

            const sessionUser = { ...foundUser };
            delete sessionUser.password;
            saveSession(sessionUser, onUserLoggedCallback);
            showToast(`¡Hola de nuevo, ${sessionUser.name}!`, "success");
        });
    }
}

// ==========================================================================
// UTILIDADES
// ==========================================================================

// Parsear JWT de Google
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Mostrar Toast emergente
function showToast(message, type = "success") {
    const toast = document.getElementById("toast-message");
    const toastText = document.getElementById("toast-text");
    
    if (toast && toastText) {
        toastText.textContent = message;
        
        // Configurar icono de Lucide dinámico si existe la función
        const icon = toast.querySelector(".toast-icon");
        if (icon && window.lucide) {
            icon.setAttribute("data-lucide", type === "success" ? "check-circle" : (type === "error" ? "x-circle" : "info"));
            window.lucide.createIcons();
        }

        toast.className = `toast-popup active ${type}`;
        
        setTimeout(() => {
            toast.classList.remove("active");
        }, 3000);
    }
}
