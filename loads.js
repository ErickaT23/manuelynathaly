// ===================== LOADS.JS =====================
// 1) Lista de invitados (ejemplo)
const guests = [
  { id: "1", name: "Familia Rodríguez", passes: 4 },
  { id: "2", name: "Familia Argueta", passes: 4 },
  { id: "3", name: "Carlos y Andrea", passes: 2 },
  { id: "4", name: "José Martínez", passes: 1 },
  { id: "5", name: "Familia López", passes: 3 },
]; 

// Helper: leer parámetros ?id=1
function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.RSVPDatabase) {
    window.RSVPDatabase.getInvitados().then(async (remoteGuests) => {
      if (remoteGuests.length > 0) return;
      await Promise.all(guests.map((guest) => window.RSVPDatabase.saveInvitado({
        id: guest.id,
        nombre: guest.name,
        pases: guest.passes,
        activo: true
      })));
    }).catch((error) => console.warn("No se pudieron inicializar los invitados en Firebase", error));
  }
  const guestId = getQueryParam("id");
  if (guestId && window.RSVPDatabase) {
    window.RSVPDatabase.getInvitadoById(guestId).then((guest) => {
      if (guest && guest.activo !== false) {
        window.currentGuest = { ...guest, name: guest.nombre, passes: guest.pases };
        window.dispatchEvent(new CustomEvent("guest:updated"));
      }
    }).catch((error) => console.warn("No se pudo cargar el invitado desde Firebase", error));
  }

  // Si no hay id, no marcamos error: solo no hay invitado
  if (!guestId) {
    window.currentGuest = null;
    return;
  }

  const guest = guests.find((g) => String(g.id) === String(guestId));

  if (guest) {
    window.currentGuest = guest;

    // Si tienes estos elementos en alguna parte, los llena (opcional)
    const guestNameEl = document.getElementById("guest-name");
    const passesEl = document.getElementById("passes");

    if (guestNameEl) guestNameEl.textContent = guest.name;
    if (passesEl) {
      const p = Number(guest.passes || 1);
      passesEl.textContent = `${p} ${p === 1 ? "pase" : "pases"}`;
    }
  } else {
    window.currentGuest = null;

    const guestNameEl = document.getElementById("guest-name");
    if (guestNameEl) guestNameEl.textContent = "Invitado no encontrado";
  }
});
