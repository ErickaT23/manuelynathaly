import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";

const app = initializeApp(window.firebaseConfig, "manuel-nathaly-dashboard");
const db = getDatabase(app, window.firebaseConfig.databaseURL);
const base = `eventos/${window.config.event.defaultEventId}`;
const table = document.getElementById("confirmations-table-body");
const wishes = document.getElementById("wishes");

function setMetric(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
}

function renderDashboard(guests, rsvps) {
  const activeGuests = Object.values(guests).filter((guest) => guest.activo !== false);
  const confirmed = activeGuests.filter((guest) => rsvps[guest.id]?.respuesta === "si");
  const declined = activeGuests.filter((guest) => rsvps[guest.id]?.respuesta === "no");

  setMetric("summary-total-guests", activeGuests.length);
  setMetric("summary-yes", confirmed.length);
  setMetric("summary-no", declined.length);
  setMetric("summary-pending", activeGuests.length - confirmed.length - declined.length);
  setMetric("summary-confirmed-people", confirmed.reduce((total, guest) => total + Number(guest.pases || 0), 0));

  table.replaceChildren();
  activeGuests.forEach((guest) => {
    const response = rsvps[guest.id];
    const row = document.createElement("tr");
    const values = [
      guest.id,
      guest.nombre,
      guest.pases,
      response?.respuesta || "Pendiente",
      response?.fechaConfirmacion
        ? new Date(response.fechaConfirmacion).toLocaleString("es-GT")
        : "--"
    ];
    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    });
    table.appendChild(row);
  });
}

let currentGuests = {};
let currentRsvps = {};
onValue(ref(db, `${base}/invitados`), (snapshot) => {
  currentGuests = snapshot.val() || {};
  renderDashboard(currentGuests, currentRsvps);
});
onValue(ref(db, `${base}/rsvp`), (snapshot) => {
  currentRsvps = snapshot.val() || {};
  renderDashboard(currentGuests, currentRsvps);
});
onValue(ref(db, `${base}/deseos`), (snapshot) => {
  wishes.replaceChildren();
  Object.values(snapshot.val() || {}).reverse().forEach((wish) => {
    const article = document.createElement("article");
    const name = document.createElement("strong");
    const message = document.createElement("p");
    name.textContent = wish.nombre || "Invitado";
    message.textContent = wish.mensaje || "";
    article.append(name, message);
    wishes.appendChild(article);
  });
});
