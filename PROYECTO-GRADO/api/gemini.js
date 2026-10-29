import { Readable } from "node:stream";

const MAX_REQUESTS_PER_MINUTE = 30;
const RATE_WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 256_000;
const UPSTREAM_TIMEOUT_MS = 26_000;
const requestsByIp = new Map();

function sendJson(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return String(
    req.headers["x-real-ip"] ||
      (typeof forwarded === "string" ? forwarded.split(",")[0] : "") ||
      req.socket?.remoteAddress ||
      "unknown"
  ).trim();
}

function excedioLimite(ip) {
  const ahora = Date.now();
  const registro = requestsByIp.get(ip);
  if (!registro || ahora - registro.inicio >= RATE_WINDOW_MS) {
    requestsByIp.set(ip, { inicio: ahora, cantidad: 1 });
    if (requestsByIp.size > 2_000) {
      for (const [clave, valor] of requestsByIp) {
        if (ahora - valor.inicio >= RATE_WINDOW_MS) requestsByIp.delete(clave);
      }
    }
    return false;
  }
  registro.cantidad += 1;
  return registro.cantidad > MAX_REQUESTS_PER_MINUTE;
}

async function leerCuerpo(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    if (Buffer.byteLength(JSON.stringify(req.body)) > MAX_BODY_BYTES) {
      throw new Error("REQUEST_TOO_LARGE");
    }
    return req.body;
  }
  const partes = [];
  let bytes = 0;
  for await (const parte of req) {
    bytes += parte.length;
    if (bytes > MAX_BODY_BYTES) throw new Error("REQUEST_TOO_LARGE");
    partes.push(parte);
  }
  const cuerpo = Buffer.concat(partes).toString("utf8");
  return cuerpo ? JSON.parse(cuerpo) : {};
}

function mensajeSeguro(texto, apiKey) {
  return apiKey ? texto.replaceAll(apiKey, "[REDACTED]") : texto;
}

function validarSolicitud(data) {
  if (data?.action === "listModels") return { action: "listModels" };
  if (
    !["generateContent", "streamGenerateContent"].includes(data?.action) ||
    typeof data.model !== "string" ||
    !/^gemini-[A-Za-z0-9._-]{1,80}$/.test(data.model) ||
    !data.request ||
    !Array.isArray(data.request.contents)
  ) {
    return null;
  }
  return data;
}

async function ejecutarHandler(req, res, apiKey, mensajeClaveAusente) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Método no permitido." });
  }
  if (!apiKey) {
    return sendJson(res, 503, {
      error: mensajeClaveAusente,
      code: "MISSING_API_KEY",
    });
  }

  const ip = clientIp(req);
  if (excedioLimite(ip)) {
    return sendJson(
      res,
      429,
      { error: "Hay mucha gente usando el asistente. Inténtalo de nuevo en unos segundos." },
      { "Retry-After": "10" }
    );
  }

  let data;
  try {
    data = validarSolicitud(await leerCuerpo(req));
  } catch (error) {
    const demasiadoGrande = error?.message === "REQUEST_TOO_LARGE";
    return sendJson(res, demasiadoGrande ? 413 : 400, {
      error: demasiadoGrande ? "La solicitud es demasiado grande." : "El cuerpo JSON no es válido.",
    });
  }
  if (!data) return sendJson(res, 400, { error: "Solicitud de Gemini no válida." });

  const esLista = data.action === "listModels";
  const url = esLista
    ? "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100"
    : `https://generativelanguage.googleapis.com/v1beta/models/${data.model}:${data.action}${data.action === "streamGenerateContent" ? "?alt=sse" : ""}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const cancelarSiSeCierra = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.on("close", cancelarSiSeCierra);

  try {
    const upstream = await fetch(url, {
      method: esLista ? "GET" : "POST",
      headers: {
        "x-goog-api-key": apiKey,
        ...(esLista ? {} : { "Content-Type": "application/json" }),
      },
      ...(esLista ? {} : { body: JSON.stringify(data.request) }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const body = mensajeSeguro(await upstream.text(), apiKey).slice(0, 8_000);
      return sendJson(res, upstream.status, {
        error: body || upstream.statusText,
        status: upstream.status,
      });
    }

    if (!upstream.body) {
      return sendJson(res, 502, { error: "Gemini respondió sin contenido." });
    }

    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type":
        upstream.headers.get("content-type") ||
        (esLista ? "application/json; charset=utf-8" : "text/event-stream"),
      "X-Accel-Buffering": "no",
    });
    await new Promise((resolve, reject) => {
      const stream = Readable.fromWeb(upstream.body);
      stream.on("error", reject);
      res.on("error", reject);
      res.on("finish", resolve);
      stream.pipe(res);
    });
  } catch (error) {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    const agotado = error?.name === "AbortError";
    return sendJson(res, agotado ? 504 : 502, {
      error: agotado
        ? "Gemini no respondió dentro del límite de 26 segundos."
        : mensajeSeguro(error?.message || "No se pudo conectar con Gemini.", apiKey),
      code: agotado ? "TIMEOUT" : "UPSTREAM_ERROR",
    });
  } finally {
    clearTimeout(timeoutId);
    res.off("close", cancelarSiSeCierra);
  }
}

export function createGeminiHandler(
  apiKey,
  mensajeClaveAusente = "El asistente no está configurado. Añade GEMINI_API_KEY en Vercel."
) {
  return (req, res) => ejecutarHandler(req, res, apiKey, mensajeClaveAusente);
}

export default createGeminiHandler(process.env.GEMINI_API_KEY);
