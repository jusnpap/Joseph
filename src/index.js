/**
 * Backend de Student Balance Planner (Cloudflare Worker)
 * Maneja la persistencia en Cloudflare KV y la API de Calendario
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // API Endpoint para guardar y cargar estado de usuarios
        if (url.pathname === '/api/state') {
            const userId = url.searchParams.get('user');
            
            if (!userId) {
                return new Response("Missing user ID", { status: 400 });
            }

            // Manejo de CORS
            const headers = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json"
            };

            if (request.method === "OPTIONS") {
                return new Response(null, { headers });
            }

            if (request.method === "GET") {
                // Cargar datos desde Cloudflare KV
                const data = await env.JOSEPH_DB.get(`user_state_${userId}`);
                if (data) {
                    return new Response(data, { headers });
                } else {
                    return new Response(JSON.stringify({ error: "No data" }), { status: 404, headers });
                }
            }

            if (request.method === "POST") {
                // Guardar datos en Cloudflare KV
                try {
                    const body = await request.text();
                    await env.JOSEPH_DB.put(`user_state_${userId}`, body);
                    return new Response(JSON.stringify({ success: true }), { headers });
                } catch (e) {
                    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
                }
            }
        }

        // Endpoint de prueba de Google Calendar
        if (url.pathname === '/api/google-calendar') {
            // El secreto configurado para Google Calendar
            const GOOGLE_CLIENT_SECRET = "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";
            return new Response(JSON.stringify({ message: "Google Calendar Sync Ready (Secret Registered)" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Para cualquier otra ruta, servir los archivos estáticos HTML/CSS/JS
        return env.ASSETS.fetch(request);
    }
};
