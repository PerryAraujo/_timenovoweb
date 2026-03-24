const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

// Initialize Firebase admin SDK
admin.initializeApp();

// Read SendGrid API key and admin emails from Firebase Functions config
// Set these with: `firebase functions:config:set sendgrid.key="API_KEY" sendgrid.admins="admin1@example.com,admin2@example.com" sendgrid.from="no-reply@example.com"`
const SENDGRID_API_KEY = functions.config().sendgrid && functions.config().sendgrid.key;
const ADMIN_EMAILS =
  functions.config().sendgrid && functions.config().sendgrid.admins
    ? functions
        .config()
        .sendgrid.admins.split(",")
        .map((s) => s.trim())
    : [];
const FROM_EMAIL =
  (functions.config().sendgrid && functions.config().sendgrid.from) || "no-reply@example.com";

if (!SENDGRID_API_KEY) {
  console.warn(
    "SendGrid API key not set in functions config (sendgrid.key). Emails will fail until configured."
  );
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Cloud Function: sendAppointmentEmail
 * Trigger: Firestore onCreate for documents in `appointments/{id}`
 * Behavior:
 *  - Is idempotent: if `emailSent` is truthy in the document, it will not resend
 *  - Sends a formatted email with appointment details to configured admin emails
 *  - Updates the appointment doc with `emailSent`, `emailSentAt`, and `emailStatus`
 *  - On error, logs and updates the document with `emailStatus: 'error'` and error details
 * Notes:
 *  - API key and admin email(s) must be provided via `firebase functions:config:set`
 */
exports.sendAppointmentEmail = functions.firestore
  .document("appointments/{id}")
  .onCreate(async (snap, context) => {
    const data = snap.data() || {};
    const docRef = snap.ref;
    const appointmentId = context.params.id;

    try {
      // Idempotency: if emailSent is already true, don't send again
      if (data.emailSent) {
        console.log(`Email already sent for appointment ${appointmentId}`);
        return null;
      }

      // Prepare recipients
      if (!ADMIN_EMAILS.length) {
        console.error("No admin emails configured in functions config (sendgrid.admins)");
        await docRef.update({
          emailStatus: "no_recipients",
          emailAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return null;
      }

      if (!SENDGRID_API_KEY) {
        console.error("SendGrid API key missing; cannot send email.");
        await docRef.update({
          emailStatus: "no_api_key",
          emailAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return null;
      }

      // Compose email
      const subject = `Novo agendamento: ${data.clientName || "Cliente sem nome"} — ${
        data.date || ""
      } ${data.time || ""}`;
      const html = buildEmailHtml(data, appointmentId);

      const msg = {
        to: ADMIN_EMAILS,
        from: FROM_EMAIL,
        subject,
        html,
      };

      // Send email
      await sgMail.send(msg);
      console.log(`Email sent for appointment ${appointmentId} to ${ADMIN_EMAILS.join(",")}`);

      // Mark document as emailSent
      await docRef.update({
        emailSent: true,
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        emailStatus: "sent",
      });
      return null;
    } catch (err) {
      console.error(`Failed to send email for appointment ${appointmentId}:`, err);
      try {
        await docRef.update({
          emailStatus: "error",
          emailError: err && err.toString ? err.toString() : JSON.stringify(err),
          emailAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (uerr) {
        console.error("Also failed to update appointment doc with email error:", uerr);
      }
      return null;
    }
  });

function buildEmailHtml(data, appointmentId) {
  const name = data.fullName || "";
  const phone = data.phone || "";
  const email = data.email || "";

  const date = data.date && data.date.toDate
    ? data.date.toDate().toLocaleDateString("pt-BR")
    : "";

  const time = data.time || "";
  const reason = data.reason || "";

  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2>Novo agendamento</h2>
      <p><strong>ID:</strong> ${appointmentId}</p>
      <p><strong>Cliente:</strong> ${escapeHtml(name)}</p>
      <p><strong>Telefone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
      <p><strong>Data:</strong> ${escapeHtml(date)} ${escapeHtml(time)}</p>
      <p><strong>Motivo:</strong><br/>${escapeHtml(reason)}</p>
      <hr/>
      <p style="font-size:0.9em;color:#666;">
        Este é um e-mail automático enviado pelo sistema NovoWeb.
      </p>
    </div>
  `;
}




       const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJECT.firebaseapp.com",
    projectId: "SEU_PROJECT",
    storageBucket: "SEU_PROJECT.appspot.com",
    messagingSenderId: "SEU_ID",
    appId: "SEU_APP_ID",
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

      // ========== STATE ==========
      let currentDate = new Date();
      let selectedDate = null;
      let selectedHour = null;
      let viewMode = "month";
      let appointments = [];
      const bookedHours = {};

      // Admin mode state (client-side): altere a senha abaixo para proteger o modo admin.
      // OBS: Isso é apenas proteção no cliente; para segurança real use um backend.
      let isAdmin = false;
      const ADMIN_PASSWORD = "NovoWeb_0202"; // <--- altere esta senha para uma de sua preferência

      // Available hours configuration
      const availableHours = [
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:30",
        "17:00",
      ];

      // ========== APPOINTMENT FACTORY & HELPERS ==========
      /**
       * Cria um objeto de agendamento padronizado.
       * @param {Object} data - Dados do agendamento (fullName, email, phone, reason, date, time, resolved)
       * @returns {Object} appointment
       */
      function createAppointment(data) {
        const {
          fullName = "",
          email = "",
          phone = "",
          reason = "",
          date,
          time = "",
          resolved = false,
        } = data || {};

        const dateObj = date instanceof Date ? date : new Date(date);

        return {
          id: Date.now() + Math.floor(Math.random() * 1000),
          fullName,
          email,
          phone,
          reason,
          date: dateObj,
          time,
          createdAt: new Date(),
          resolved,
        };
      }

      function getDateKey(dateObj) {
        return `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
      }

      function isSlotBooked(dateObj, time) {
        const key = getDateKey(dateObj);
        return bookedHours[key] && bookedHours[key].includes(time);
      }

      /**
       * Tenta adicionar um agendamento verificando duplicatas.
       * Retorna true se adicionado com sucesso, false se o horário já estiver ocupado.
       */
      function addAppointment(appointment) {
        if (!appointment || !appointment.date || !appointment.time) return false;

        if (isSlotBooked(appointment.date, appointment.time)) {
          console.warn("Horário já reservado:", appointment);
          return false;
        }

        appointments.push(appointment);

        const key = getDateKey(appointment.date);
        if (!bookedHours[key]) bookedHours[key] = [];
        if (!bookedHours[key].includes(appointment.time)) {
          bookedHours[key].push(appointment.time);
        }

        saveAppointments();
        return true;
      }

      // Initialize
      document.addEventListener("DOMContentLoaded", () => {
        initializeTheme();

        // Carrega estado admin (se presente)
        isAdmin = localStorage.getItem("nw_isAdmin") === "1";
        updateAdminUI();

        loadAppointments();
        // Garantir que o agendamento específico do Fabio exista (evita duplicatas)
        ensureFabioAppointment();
        // Remover eventuais agendamentos de demonstração (ex.: João Silva / example.com)
        removeSampleAppointments();
        renderCalendar();
        setupEventListeners();
      });

      // Insere agendamentos fixos (Fabio) no carregamento se ainda não existirem
      function ensureFabioAppointment() {
        try {
          // Dias solicitados: 02/12, 03/12, 09/12, 11/12 (ano 2025)
          const targetDates = [
            new Date(2025, 11, 2),
            new Date(2025, 11, 3),
            new Date(2025, 11, 9),
            new Date(2025, 11, 11),
            new Date(2025, 11, 16), // adicionado 16/12/2025 às 11:00
          ];
          const targetTime = "11:00";
          const targetPhone = "37999212421";

          let anyAdded = false;

          targetDates.forEach((targetDate) => {
            const exists = appointments.some((a) => {
              const aDate = a.date ? new Date(a.date) : null;
              const sameDay = aDate && aDate.toDateString() === targetDate.toDateString();
              const sameTime = a.time === targetTime;
              const cleanPhone = (a.phone || "").replace(/\D/g, "");
              return sameDay && sameTime && cleanPhone === targetPhone.replace(/\D/g, "");
            });

            if (exists) return; // continua para o próximo date

            const apt = createAppointment({
              fullName: "Fabio",
              email: "fabiofideliscamposcosta@gmail.com",
              phone: targetPhone,
              reason: "Evolução do app nmp",
              date: targetDate,
              time: targetTime,
            });

            const added = addAppointment(apt);
            if (added) anyAdded = true;
          });

          if (anyAdded) {
            renderCalendar();
            updateAppointmentsList();
          }

          // Garantir que nenhuma data fique marcada/select por padrão
          resetSelection();
        } catch (e) {
          console.error("Erro ao inserir agendamento do Fabio:", e);
        }
      }

      // ========== PERSISTENCE ==========
      function saveAppointments() {
        try {
          localStorage.setItem("nw_appointments_v1", JSON.stringify(appointments));
        } catch (e) {
          console.error("Erro salvando agendamentos:", e);
        }
      }

      // Remove agendamentos de demonstração conhecidos (e-mails example.com ou "João Silva")
      function removeSampleAppointments() {
        try {
          const before = appointments.length;
          appointments = appointments.filter((a) => {
            const name = (a.fullName || "").toLowerCase();
            const email = (a.email || "").toLowerCase();

            // padrão para "joão silva" ou variações sem acento
            if (/jo[oã]o\s*silva/.test(name)) return false;

            // remover e-mails de exemplo comuns
            if (email.includes("example.com")) return false;

            return true;
          });

          if (appointments.length !== before) {
            rebuildBookedHours();
            saveAppointments();
            updateAppointmentsList();
            renderCalendar();
            console.log("Removed sample appointments");
          }
        } catch (e) {
          console.error("Erro ao remover agendamentos de amostra:", e);
        }
      }

      function loadAppointments() {
        try {
          const raw = localStorage.getItem("nw_appointments_v1");
          if (raw) {
            appointments = JSON.parse(raw);
            // Convert date strings back to Date objects
            appointments = appointments.map((a) => ({
              ...a,
              date: new Date(a.date),
              createdAt: new Date(a.createdAt),
            }));
            rebuildBookedHours();
            updateAppointmentsList();
          }
        } catch (e) {
          console.error("Erro carregando agendamentos:", e);
        }
      }

      function rebuildBookedHours() {
        // reset
        for (const k in bookedHours) delete bookedHours[k];
        appointments.forEach((a) => {
          const key = `${a.date.getFullYear()}-${a.date.getMonth()}-${a.date.getDate()}`;
          if (!bookedHours[key]) bookedHours[key] = [];
          if (!bookedHours[key].includes(a.time)) bookedHours[key].push(a.time);
        });
      }

      // ========== THEME ==========
      function initializeTheme() {
        // Forçar modo claro sempre — não ativar dark-mode automático
        document.documentElement.classList.remove("dark-mode");

        // Limpa possíveis preferências de tema salvas no localStorage
        try {
          localStorage.removeItem("nw_theme");
          localStorage.removeItem("theme");
          localStorage.removeItem("darkMode");
        } catch (e) {
          // ignore
        }

        // Ajusta ícone para indicar modo claro (lua - visual apenas)
        const icon = document.getElementById("themeIcon");
        if (icon) icon.className = "fa-solid fa-moon";
      }

      function updateThemeIcon() {
        const isDark = document.documentElement.classList.contains("dark-mode");
        const icon = document.getElementById("themeIcon");
        icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
      }

      function toggleTheme() {
        document.documentElement.classList.toggle("dark-mode");
        updateThemeIcon();
      }

      // ========== ADMIN MODE (cliente NÃO vê elementos .admin-only) ==========
      function updateAdminUI() {
        const adminIcon = document.getElementById("adminIcon");
        const adminBtn = document.getElementById("adminBtn");
        if (!adminIcon || !adminBtn) return;

        if (isAdmin) {
          document.documentElement.classList.add("admin-mode");
          adminIcon.className = "fa-solid fa-right-from-bracket"; // ícone de logout
          adminBtn.title = "Sair do modo admin";
        } else {
          document.documentElement.classList.remove("admin-mode");
          adminIcon.className = "fa-solid fa-user-shield";
          adminBtn.title = "Entrar como administrador";
        }
      }

      function openAdminModal() {
        document.getElementById("adminModalOverlay").classList.add("active");
        document.body.style.overflow = "hidden";
        const input = document.getElementById("adminPasswordInput");
        if (input) input.focus();
      }

      function closeAdminModal() {
        document.getElementById("adminModalOverlay").classList.remove("active");
        document.body.style.overflow = "";
        const input = document.getElementById("adminPasswordInput");
        if (input) input.value = "";
      }

      function handleAdminLogin() {
        const val = (document.getElementById("adminPasswordInput") || {}).value || "";
        if (val === ADMIN_PASSWORD) {
          isAdmin = true;
          localStorage.setItem("nw_isAdmin", "1");
          updateAdminUI();
          closeAdminModal();
          updateAppointmentsList();
        } else {
          alert("Senha incorreta.");
        }
      }

      function adminLogout() {
        isAdmin = false;
        localStorage.removeItem("nw_isAdmin");
        updateAdminUI();
        updateAppointmentsList();
      }

      // ========== CALENDAR ==========
      function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthNames = [
          "Janeiro",
          "Fevereiro",
          "Março",
          "Abril",
          "Maio",
          "Junho",
          "Julho",
          "Agosto",
          "Setembro",
          "Outubro",
          "Novembro",
          "Dezembro",
        ];
        document.getElementById("monthYear").textContent = `${monthNames[month]} ${year}`;

        const daysGrid = document.getElementById("daysGrid");
        daysGrid.innerHTML = "";

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
          const day = daysInPrevMonth - i;
          const cell = createDayCell(day, month - 1, year, true);
          daysGrid.appendChild(cell);
        }

        // Current month days
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
          const isToday =
            day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isPast =
            new Date(year, month, day) <
            new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const cell = createDayCell(day, month, year, false, isToday, isPast);
          daysGrid.appendChild(cell);
        }

        // Next month days
        const totalCells = daysGrid.children.length;
        const remainingCells = 42 - totalCells;
        for (let day = 1; day <= remainingCells; day++) {
          const cell = createDayCell(day, month + 1, year, true);
          daysGrid.appendChild(cell);
        }
      }

      function createDayCell(day, month, year, isOtherMonth, isToday = false, isPast = false) {
        const cell = document.createElement("div");
        cell.className = "day-cell";
        cell.textContent = day;

        const dateKey = `${year}-${month}-${day}`;
        const hasBooking = bookedHours[dateKey] && bookedHours[dateKey].length > 0;

        if (isOtherMonth) {
          cell.classList.add("other-month");
        } else if (isPast) {
          cell.classList.add("disabled");
        }

        if (isToday) {
          cell.classList.add("today");
        }

        if (hasBooking) {
          cell.classList.add("has-events");
        }

        if (!isOtherMonth && !isPast) {
          cell.addEventListener("click", () => selectDate(day, month, year, cell));
        }

        return cell;
      }

      function selectDate(day, month, year, element) {
        document.querySelectorAll(".day-cell").forEach((cell) => {
          cell.classList.remove("selected");
        });

        selectedDate = new Date(year, month, day);
        selectedHour = null;
        element.classList.add("selected");

        displayAvailableHours();
        updateSidebar();
      }

      function displayAvailableHours() {
        const container = document.getElementById("availableHoursContainer");
        const grid = document.getElementById("hoursGrid");
        const label = document.getElementById("hoursLabel");

        const dateStr = selectedDate.toLocaleDateString("pt-BR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        label.innerHTML = `<i class="fa-solid fa-calendar" aria-hidden></i> Horários disponíveis para ${dateStr}:`;
        grid.innerHTML = "";

        const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
        const bookedThisDay = bookedHours[dateKey] || [];

        availableHours.forEach((hour) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "hour-option";
          btn.textContent = hour;

          if (bookedThisDay.includes(hour)) {
            btn.classList.add("unavailable");
            btn.disabled = true;
          } else {
            btn.addEventListener("click", (e) => {
              e.preventDefault();
              selectHour(hour, btn);
            });
          }

          grid.appendChild(btn);
        });

        container.classList.remove("hidden");
      }

      function selectHour(hour, element) {
        document.querySelectorAll(".hour-option").forEach((btn) => {
          btn.classList.remove("selected");
        });

        selectedHour = hour;
        element.classList.add("selected");
        updateSidebar();
      }

      // ========== SIDEBAR UPDATE ==========
      function updateSidebar() {
        const dateCard = document.getElementById("selectedDateCard");
        const hourCard = document.getElementById("selectedHourCard");
        const previewCard = document.getElementById("availableHoursPreview");
        const summaryCard = document.getElementById("bookingSummary");
        const confirmBtn = document.getElementById("confirmBookingBtn");

        if (selectedDate) {
          const dateStr = selectedDate.toLocaleDateString("pt-BR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          dateCard.innerHTML = `<div class="sidebar-card-label">Data</div><div class="sidebar-card-value">${dateStr}</div>`;
          dateCard.classList.remove("empty");

          const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
          const bookedThisDay = bookedHours[dateKey] || [];
          const availableCount = availableHours.length - bookedThisDay.length;

          previewCard.innerHTML = `<div class="sidebar-card-label">Horários disponíveis para ${dateStr}</div><div class="sidebar-card-value" style="font-size: 13px; margin-top: 8px;">${availableCount} horários <br><span style="font-size: 11px; opacity: 0.6;">disponíveis neste dia</span></div>`;

          if (selectedHour) {
            hourCard.innerHTML = `<div class="sidebar-card-label">Horário</div><div class="sidebar-card-value">${selectedHour}</div>`;
            hourCard.classList.remove("empty");

            summaryCard.innerHTML = `<div class="sidebar-card-label">Data & Hora</div><div class="sidebar-card-value">${dateStr} às ${selectedHour}</div>`;
            summaryCard.classList.remove("empty");

            confirmBtn.disabled = false;
          } else {
            hourCard.innerHTML = "Selecione um horário";
            hourCard.classList.add("empty");
            confirmBtn.disabled = true;
          }
        } else {
          dateCard.innerHTML = "Selecione uma data";
          dateCard.classList.add("empty");
          hourCard.innerHTML = "Selecione um horário";
          hourCard.classList.add("empty");
          summaryCard.innerHTML = "Nada selecionado";
          summaryCard.classList.add("empty");
          confirmBtn.disabled = true;
        }
      }

      // ========== MODAL ==========
      function openModal() {
        if (!selectedDate || !selectedHour) {
          alert("Selecione uma data e horário");
          return;
        }

        const dateStr = selectedDate.toLocaleDateString("pt-BR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        document.getElementById(
          "selectedDateDisplay"
        ).innerHTML = `<i class="fa-solid fa-calendar" aria-hidden></i> ${dateStr} às ${selectedHour}`;
        document.getElementById("modalOverlay").classList.add("active");
        document.body.style.overflow = "hidden";
      }

      function closeModal() {
        document.getElementById("modalOverlay").classList.remove("active");
        document.body.style.overflow = "";
        document.getElementById("appointmentForm").reset();
      }

      // ========== FORM SUBMISSION ==========
      function handleFormSubmit(e) {
        e.preventDefault();

        const data = {
          fullName: document.getElementById("fullName").value,
          email: document.getElementById("email").value,
          phone: document.getElementById("phone").value,
          reason: document.getElementById("reason").value,
          date: selectedDate,
          time: selectedHour,
        };

        const appointment = createAppointment(data);

        const added = addAppointment(appointment);
        if (!added) {
          alert("O horário selecionado já está reservado. Por favor escolha outro horário.");
          return;
        }

        // Send notifications (abre mail e WhatsApp)
        notifyAdmin(appointment);

        closeModal();
        showSuccessMessage();
        renderCalendar();
        updateAppointmentsList();
        resetSelection();
      }

      function normalizePhone(phone) {
        if (!phone) return "";
        const clean = ("" + phone).replace(/\D/g, "");
        return clean.startsWith("55") ? clean : "55" + clean;
      }

      function sendWhatsAppNotification(appointment) {
        const adminPhoneRaw = "5537991382659"; // +55 37 99138-2659
        const adminPhone = normalizePhone(adminPhoneRaw);
        const formattedDate = appointment.date.toLocaleDateString("pt-BR");
        // Build message exactly as requested by user
        const messageLines = [
          "Novo Agendamento NovoWeb",
          `Cliente: ${appointment.fullName}`,
          `Telefone: ${appointment.phone}`,
          `Email: ${appointment.email}`,
          `Data: ${formattedDate}`,
          `Horário: ${appointment.time}`,
          `Motivo: ${appointment.reason}`,
        ];

        const encodedMessage = encodeURIComponent(messageLines.join("\n"));
        const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodedMessage}`;
        console.log("WhatsApp notification ready:", { adminPhoneRaw, adminPhone, whatsappUrl });
        return whatsappUrl;
      }
      function notifyAdmin(appointment) {
        try {
          // 1) Save appointment to Firestore so backend Cloud Function can send the email automatically.
          saveAppointmentToFirestore(appointment);

          // 2) Show the client-side modal so the user chooses WhatsApp or Email.
          // Email is still sent automatically by the backend Cloud Function; choosing Email
          // in the modal simply closes the modal and informs the user. Choosing WhatsApp
          // will open WhatsApp Web/App with a pre-filled message.
          const apptForModal = {
            clientName: appointment.fullName,
            clientPhone: appointment.phone,
            clientEmail: appointment.email,
            date: appointment.date ? appointment.date.toLocaleDateString("pt-BR") : "",
            time: appointment.time,
            reason: appointment.reason,
          };

          if (window && typeof window.showNotificationModal === "function") {
            window.showNotificationModal(apptForModal);
          } else {
            // Fallback: open WhatsApp directly (should be triggered by user click so popup allowed)
            const wa = sendWhatsAppNotification(appointment);
            try {
              window.open(wa, "_blank");
            } catch (e) {
              console.warn(e);
            }
          }
        } catch (e) {
          console.error("Erro ao notificar admin:", e);
        }
      }

      function generateClientWhatsAppLink(clientPhone, clientName) {
        const message = `Olá ${clientName}! Confirmamos seu agendamento na NovoWeb. Aguardamos sua chegada! 🎉`;
        const encodedMessage = encodeURIComponent(message);
        // Remove any non-numeric characters and ensure it has country code
        const cleanPhone = (clientPhone || "").replace(/\D/g, "");
        const finalPhone = cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone;
        console.log("Client WhatsApp link:", { clientPhone, cleanPhone, finalPhone });
        return `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodedMessage}`;
      }

      /*
        Firestore persistence helper. This writes an appointment document into the
        `appointments` collection so the Cloud Function (onCreate) can detect and
        send the automated email.

        Configuration:
        - Provide Firebase web config by setting `window.FIREBASE_CONFIG` before this script runs.
          Example (place in a script tag above):
            window.FIREBASE_CONFIG = {
              apiKey: "...",
              authDomain: "...",
              projectId: "...",
              // other keys...
            };

        - If Firebase is not configured, this function will silently skip the write.
      */
      function saveAppointmentToFirestore(appointment) {
        try {
          if (typeof firebase === "undefined" || !window.FIREBASE_CONFIG) {
            console.log("Firebase not configured; skipping Firestore save.");
            return;
          }

          if (!window._firebaseInitialized) {
            firebase.initializeApp(window.FIREBASE_CONFIG);
            window._firebaseInitialized = true;
          }

          const db = firebase.firestore();
          const doc = {
            clientName: appointment.fullName || "",
            clientPhone: appointment.phone || "",
            clientEmail: appointment.email || "",
            date: appointment.date ? appointment.date.toISOString() : "",
            time: appointment.time || "",
            reason: appointment.reason || "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailSent: false,
          };

          db.collection("appointments")
            .add(doc)
            .then((ref) => {
              console.log("Appointment saved to Firestore (id):", ref.id);
              // Optionally you can update local object with remote id
              appointment.remoteId = ref.id;
            })
            .catch((err) => {
              console.error("Error saving appointment to Firestore:", err);
            });
        } catch (e) {
          console.error("saveAppointmentToFirestore error:", e);
        }
      }
      function showSuccessMessage() {
        const message = document.getElementById("successMessage");
        message.innerHTML =
          '<i class="fa-solid fa-circle-check" aria-hidden></i> Agendamento confirmado com sucesso!';
        message.classList.add("active");
        setTimeout(() => {
          message.classList.remove("active");
        }, 4000);
      }

      // ========== APPOINTMENT ACTIONS (RESOLVE / NOTIFY) ==========
      function markResolved(id) {
        const idx = appointments.findIndex((a) => a.id === id);
        if (idx === -1) return;
        appointments[idx].resolved = true;
        saveAppointments();
        updateAppointmentsList();
      }

      function sendEmailForAppointment(id) {
        const apt = appointments.find((a) => a.id === id);
        if (!apt) return;
        const adminEmails = ["novow3b@gmail.com", "perryvictor33@gmail.com"];
        const formattedDate = apt.date.toLocaleDateString("pt-BR");
        const body = `Cliente: ${apt.fullName}%0ATelefone: ${apt.phone}%0AEmail: ${
          apt.email
        }%0AData: ${formattedDate}%0AHorário: ${apt.time}%0AMotivo: ${encodeURIComponent(
          apt.reason
        )}`;
        const mailto = `mailto:${adminEmails.join(",")}?subject=${encodeURIComponent(
          "Novo agendamento NovoWeb"
        )}&body=${encodeURIComponent(body)}`;
        window.open(mailto, "_blank");
      }

      function sendWhatsAppForAppointment(id) {
        const apt = appointments.find((a) => a.id === id);
        if (!apt) return;
        const adminPhone = normalizePhone("5537991382659");
        const formattedDate = apt.date.toLocaleDateString("pt-BR");
        const waMessage = encodeURIComponent(
          `Novo Agendamento NovoWeb\nCliente: ${apt.fullName}\nTelefone: ${apt.phone}\nEmail: ${apt.email}\nData: ${formattedDate}\nHorário: ${apt.time}\nMotivo: ${apt.reason}`
        );
        const waUrl = `https://wa.me/${adminPhone}?text=${waMessage}`;
        console.log("sendWhatsAppForAppointment url:", waUrl);
        window.open(waUrl, "_blank");
      }

      // Apaga um agendamento (apenas via UI admin)
      function deleteAppointment(id) {
        if (!confirm("Confirma exclusão deste agendamento?")) return;
        const idx = appointments.findIndex((a) => a.id === id);
        if (idx === -1) return;
        const apt = appointments[idx];

        // Remove do array
        appointments.splice(idx, 1);

        // Atualiza bookedHours
        const key = `${apt.date.getFullYear()}-${apt.date.getMonth()}-${apt.date.getDate()}`;
        if (bookedHours[key]) {
          const i = bookedHours[key].indexOf(apt.time);
          if (i !== -1) bookedHours[key].splice(i, 1);
          if (bookedHours[key].length === 0) delete bookedHours[key];
        }

        saveAppointments();
        updateAppointmentsList();
        renderCalendar();
      }

      function resetSelection() {
        selectedDate = null;
        selectedHour = null;
        document.getElementById("availableHoursContainer").classList.add("hidden");
        document.querySelectorAll(".day-cell").forEach((cell) => {
          cell.classList.remove("selected");
        });
        updateSidebar();
      }

      // ========== APPOINTMENTS LIST ==========
      function updateAppointmentsList() {
        const container = document.getElementById("appointmentsContainer");
        const count = document.getElementById("appointmentCount");
        const statBadge = document.getElementById("statBadge");

        count.textContent = `${appointments.length} agendamento${
          appointments.length !== 1 ? "s" : ""
        }`;

        if (appointments.length > 0) {
          statBadge.classList.remove("hidden");
        }

        if (appointments.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-inbox" aria-hidden></i></div>
              <div class="empty-state-text">Nenhum agendamento confirmado</div>
            </div>
          `;
          return;
        }

        const sorted = [...appointments].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        container.innerHTML = sorted
          .map(
            (apt) => `
          <div class="appointment-item ${apt.resolved ? "resolved" : ""}">
            <div class="appointment-name"><i class="fa-solid fa-user" aria-hidden></i> ${
              apt.fullName
            }</div>
            <div class="appointment-meta">
              <span><i class="fa-solid fa-calendar-days" aria-hidden></i> ${apt.date.toLocaleDateString(
                "pt-BR"
              )}</span>
              <span><i class="fa-solid fa-clock" aria-hidden></i> ${apt.time}</span>
              <span><i class="fa-solid fa-phone" aria-hidden></i> ${apt.phone}</span>
              <span><i class="fa-solid fa-envelope" aria-hidden></i> ${apt.email}</span>
            </div>
            <div class="appointment-actions">
              <a href="${generateClientWhatsAppLink(
                apt.phone,
                apt.fullName
              )}" target="_blank" class="btn-contact-client admin-only"><i class="fa-brands fa-whatsapp" aria-hidden></i> Contatar</a>
              <button class="btn btn-outline admin-only" type="button" onclick="sendEmailForAppointment(${
                apt.id
              })"><i class="fa-solid fa-envelope" aria-hidden></i> Enviar Email</button>
              <button class="btn btn-outline admin-only" type="button" onclick="sendWhatsAppForAppointment(${
                apt.id
              })"><i class="fa-brands fa-whatsapp" aria-hidden></i> Enviar WhatsApp</button>
              ${
                apt.resolved
                  ? '<button class="btn btn-primary admin-only" disabled><i class="fa-solid fa-check" aria-hidden></i> Resolvido</button>'
                  : `<button class="btn btn-primary admin-only" type="button" onclick="markResolved(${apt.id})"><i class="fa-solid fa-check" aria-hidden></i> Marcar Resolvido</button>`
              }
              <button class="btn btn-outline admin-only" type="button" onclick="deleteAppointment(${
                apt.id
              })"><i class="fa-solid fa-trash" aria-hidden></i> Apagar</button>
            </div>
          </div>
        `
          )
          .join("");
      }

      // loadSampleAppointments removed per user request

      // ========== EVENT LISTENERS ==========
      function setupEventListeners() {
        const themeToggleBtn = document.getElementById("themeToggle");
        if (themeToggleBtn) {
          themeToggleBtn.addEventListener("click", toggleTheme);
        }

        // Admin button & modal handlers
        const adminBtn = document.getElementById("adminBtn");
        if (adminBtn) {
          adminBtn.addEventListener("click", () => {
            if (isAdmin) {
              adminLogout();
            } else {
              openAdminModal();
            }
          });
        }

        const adminModalClose = document.getElementById("adminModalClose");
        if (adminModalClose) adminModalClose.addEventListener("click", closeAdminModal);
        const adminCancelBtn = document.getElementById("adminCancelBtn");
        if (adminCancelBtn) adminCancelBtn.addEventListener("click", closeAdminModal);
        const adminLoginBtn = document.getElementById("adminLoginBtn");
        if (adminLoginBtn) adminLoginBtn.addEventListener("click", handleAdminLogin);

        document.getElementById("prevMonth").addEventListener("click", () => {
          currentDate.setMonth(currentDate.getMonth() - 1);
          renderCalendar();
        });

        document.getElementById("nextMonth").addEventListener("click", () => {
          currentDate.setMonth(currentDate.getMonth() + 1);
          renderCalendar();
        });

        document.querySelectorAll(".view-mode-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            document
              .querySelectorAll(".view-mode-btn")
              .forEach((b) => b.classList.remove("active"));
            e.target.classList.add("active");
            viewMode = e.target.dataset.mode;
          });
        });

        document.getElementById("modalClose").addEventListener("click", closeModal);
        document.getElementById("cancelBtn").addEventListener("click", closeModal);
        document.getElementById("appointmentForm").addEventListener("submit", handleFormSubmit);

        document.getElementById("confirmBookingBtn").addEventListener("click", openModal);
        document.getElementById("resetBtn").addEventListener("click", resetSelection);

        document.getElementById("modalOverlay").addEventListener("click", (e) => {
          if (e.target.id === "modalOverlay") {
            closeModal();
          }
        });
      }