/**************** RSVP CONFIG ****************/
const RSVP_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwF49QYSMh9fCLeTUF9M-C5WL3qV7vc83DT4BYzBH91n1JdiN15HMkS95lX5GnuzLkn/exec";

const $ = (s) => document.querySelector(s);

/**************** HELPERS ****************/
function showMsg(el, text, type = "ok") {
  if (!el) return;
  el.textContent = text;
  el.className = `rsvp-msg ${type}`;
  el.style.display = "block";
}

function hideMsg(el) {
  if (!el) return;
  el.style.display = "none";
  el.textContent = "";
}

/**************** UI: CONFIRMADO ****************/
function markConfirmedUI() {
  const btn = $("#btnConfirmarRsvp");
  const msg = $("#msgRsvp"); // mensaje debajo del botón (en la sección)

  if (btn) {
    btn.textContent = "Confirmación enviada ✓";
    btn.disabled = true;
    btn.classList.add("rsvp-confirmed");
  }

  if (msg) {
    msg.style.display = "block";
    msg.className = "rsvp-msg ok";
    msg.textContent = "Gracias, ya has enviado tu confirmación.";
  }
}

function resetConfirmUI() {
  const btn = $("#btnConfirmarRsvp");
  const msg = $("#msgRsvp");

  if (btn) {
    btn.textContent = "Confirmar";
    btn.disabled = false;
    btn.classList.remove("rsvp-confirmed");
  }

  if (msg) {
    msg.style.display = "none";
    msg.textContent = "";
  }
}

/**************** MODAL ****************/
function openRsvpModal() {
  const b = $("#rsvpBackdrop");
  if (!b) return;

  b.style.display = "flex";
  b.setAttribute("aria-hidden", "false");
  setTimeout(() => b.classList.add("show"), 0);

  const firstFocusable = $("#btnRsvpSi") || $("#btnRsvpClose");
  if (firstFocusable) setTimeout(() => firstFocusable.focus(), 50);
}

function closeRsvpModal() {
  const b = $("#rsvpBackdrop");
  if (!b) return;

  b.classList.remove("show");
  setTimeout(() => {
    b.style.display = "none";
    b.setAttribute("aria-hidden", "true");

    const opener = $("#btnConfirmarRsvp");
    if (opener) opener.focus();
  }, 250);
}

/**************** API ****************/
async function apiCheck(id) {
  const url = `${RSVP_ENDPOINT}?guestId=${encodeURIComponent(id)}&t=${Date.now()}`;
  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();

  let j;
  try {
    j = JSON.parse(text);
  } catch {
    console.warn("apiCheck no devolvió JSON. Respuesta:", text.slice(0, 200));
    return false;
  }

  return j.alreadyConfirmed === true || j.alreadyConfirmed === "true" || j.alreadyConfirmed === 1;
}

async function apiSend(data) {
  const body = new URLSearchParams(data).toString();

  const r = await fetch(RSVP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });

  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    console.warn("apiSend no devolvió JSON. Respuesta:", text.slice(0, 200));
    return { ok: false, raw: text };
  }
}

/**************** LOCAL CONFIRM ****************/
function storageKey(id) {
  return `rsvp_confirmed_${id}`;
}

function setConfirmed(id, respuesta) {
  localStorage.setItem(storageKey(id), JSON.stringify({ at: Date.now(), respuesta }));
}

function isConfirmed(id) {
  return !!localStorage.getItem(storageKey(id));
}

function clearConfirmed(id) {
  localStorage.removeItem(storageKey(id));
}

function enableRsvpButtons(enabled = true) {
  const btnSi = document.getElementById("btnRsvpSi");
  const btnNo = document.getElementById("btnRsvpNo");
  if (btnSi) btnSi.disabled = !enabled;
  if (btnNo) btnNo.disabled = !enabled;
}

// cerrar con cualquier tap/click después de mostrar mensaje
function closeOnNextTap() {
  setTimeout(() => {
    const handler = () => {
      closeRsvpModal();
      document.removeEventListener("click", handler, true);
      document.removeEventListener("touchstart", handler, true);
    };
    document.addEventListener("click", handler, true);
    document.addEventListener("touchstart", handler, true);
  }, 50);
}

/**************** GUEST desde URL + DOM ****************/
function getGuestFromURL() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return null;

  // 1) Fuente de verdad: loads.js
  if (window.currentGuest && String(window.currentGuest.id) === String(id)) {
    return {
      id: String(window.currentGuest.id),
      nombre: window.currentGuest.name || "Invitado",
      pases: Number(window.currentGuest.passes || 1),
    };
  }

  // 2) Fallback DOM
  const nameEl = document.getElementById("guestCardName");
  const seatsEl = document.getElementById("guestSeats");

  const nombre = (nameEl?.textContent || "Invitado").trim() || "Invitado";
  const m = (seatsEl?.textContent || "").match(/\d+/);
  const pases = m ? parseInt(m[0], 10) : 1;

  return { id, nombre, pases };
}

/**************** INIT ****************/
document.addEventListener("DOMContentLoaded", () => {
  let invitado = getGuestFromURL();

  const btnOpen = $("#btnConfirmarRsvp");
  const btnClose = $("#btnRsvpClose");
  const btnSi = $("#btnRsvpSi");
  const btnNo = $("#btnRsvpNo");

  const inputNombre = $("#rsvpNombre");
  const inputPases = $("#rsvpPases");
  const msgModal = $("#rsvpMsgModal");

  if (!btnOpen || !btnSi || !btnNo || !inputNombre || !inputPases) return;

  hideMsg(msgModal);

  // pintar inputs si hay invitado
  if (invitado) {
    inputNombre.value = invitado.nombre;
    inputPases.value = invitado.pases;
  }

  btnSi.type = "button";
  btnNo.type = "button";

  // ✅ Estado inicial: manda el backend (no solo localStorage)
  (async () => {
    if (!invitado) return;
    try {
      const ya = await apiCheck(invitado.id);
      if (ya) {
        setConfirmed(invitado.id, "YA");
        markConfirmedUI();
        enableRsvpButtons(false);
      } else {
        clearConfirmed(invitado.id);
        resetConfirmUI();
        enableRsvpButtons(true);
      }
    } catch (e) {
      console.warn("apiCheck inicial falló:", e);
      // si falla backend, no bloqueamos por completo
      if (isConfirmed(invitado.id)) markConfirmedUI();
    }
  })();

  /******** Abrir modal ********/
  btnOpen.addEventListener("click", async () => {
    // refrescar invitado por si loads tardó
    invitado = getGuestFromURL();

    openRsvpModal();
    hideMsg(msgModal);

    if (!invitado) {
      showMsg(msgModal, "No se encontró invitado en la URL. Usa ?id=1", "error");
      return;
    }

    // actualizar inputs SIEMPRE
    inputNombre.value = invitado.nombre;
    inputPases.value = invitado.pases;

    // ✅ Re-check real: si borraron en Sheet, reactivar
    try {
      const ya = await apiCheck(invitado.id);

      if (!ya) {
        clearConfirmed(invitado.id);
        resetConfirmUI();
        enableRsvpButtons(true);
      } else {
        setConfirmed(invitado.id, "YA");
        markConfirmedUI();
        enableRsvpButtons(false);
        showMsg(msgModal, "Gracias, ya has enviado tu confirmación.", "ok");
        // NO cerramos automático, se cierra con tap cuando quieran
        closeOnNextTap();
      }
    } catch (e) {
      console.warn("apiCheck al abrir falló:", e);
    }
  });

  /******** Cerrar modal ********/
  if (btnClose) btnClose.addEventListener("click", closeRsvpModal);

  /******** Confirmar ********/
  async function confirmar(respuesta) {
    if (!invitado) return;

    enableRsvpButtons(false); // evita doble tap mientras guarda

    const msgSi = "Gracias por confirmar tu asistencia y hacer este día aún más especial.";
    const msgNo = "Lamentamos que no puedas acompañarnos en esta ocasión y agradecemos tu respuesta.";

    try {
      const res = await apiSend({
        guestId: invitado.id,
        nombre: invitado.nombre,
        pases: String(invitado.pases),
        respuesta,
      });

      if (res && (res.ok === true || res.success === true)) {
        setConfirmed(invitado.id, respuesta);
        markConfirmedUI();
        showMsg(msgModal, respuesta === "SI" ? msgSi : msgNo, "ok");

        // ✅ se cierra al tocar en cualquier lugar, cuando la persona quiera
        closeOnNextTap();
      } else {
        console.warn("Respuesta del endpoint:", res);
        enableRsvpButtons(true);
        showMsg(msgModal, "No se pudo guardar tu respuesta. Intenta de nuevo.", "error");
      }
    } catch (e) {
      console.error("❌ apiSend:", e);
      enableRsvpButtons(true);
      showMsg(msgModal, "Error de conexión al enviar tu respuesta.", "error");
    }
  }

  btnSi.addEventListener("click", () => confirmar("SI"));
  btnNo.addEventListener("click", () => confirmar("NO"));
});

