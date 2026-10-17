import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref, get, set, push, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
const db = getDatabase(initializeApp(window.firebaseConfig), window.firebaseConfig.databaseURL);
const eventId = window.config.event.defaultEventId;
const path = (name) => `eventos/${eventId}/${name}`;
const clean = (value) => String(value ?? "").trim();
const RSVPDatabase = {
  eventId,
  async getInvitados() { const s = await get(ref(db, path("invitados"))); return Object.values(s.val() || {}); },
  async getInvitadoById(id) { const s = await get(ref(db, `${path("invitados")}/${clean(id)}`)); return s.exists() ? s.val() : null; },
  async saveInvitado(g) { const id = clean(g.id) || `guest-${Date.now()}`; const v = { id, nombre: clean(g.nombre), pases: Number(g.pases) || 1, activo: g.activo !== false }; await set(ref(db, `${path("invitados")}/${id}`), v); return v; },
  async deleteInvitado(id) { const g = await this.getInvitadoById(id); if (g) await this.saveInvitado({ ...g, activo: false }); },
  async getConfirmationByGuestId(id) { const s = await get(ref(db, `${path("rsvp")}/${clean(id)}`)); return s.exists() ? s.val() : null; },
  async saveConfirmation(data) { const r = await runTransaction(ref(db, `${path("rsvp")}/${clean(data.id)}`), (old) => old?.confirmado ? old : { ...data, confirmado: true, fechaConfirmacion: Date.now() }); if (!r.committed) throw new Error("RSVP_ALREADY_CONFIRMED"); return r.snapshot.val(); },
  async saveWish(data) { const v = { nombre: clean(data.nombre), mensaje: clean(data.mensaje), timestamp: Date.now() }; await push(ref(db, path("deseos")), v); return v; },
  subscribeToWishes(cb) { return onValue(ref(db, path("deseos")), s => cb(Object.values(s.val() || {}).reverse())); },
  subscribeToConfirmations(cb) { return onValue(ref(db, path("rsvp")), s => cb(Object.values(s.val() || {}))); },
  subscribeToInvitados(cb) { return onValue(ref(db, path("invitados")), s => cb(Object.values(s.val() || {}))); }
};
window.RSVPDatabase = RSVPDatabase;
