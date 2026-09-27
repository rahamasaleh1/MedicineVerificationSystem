// MedVerify: checks a medicine ID against the register in medicines.csv
// and keeps a local history of every check (including IDs that are not found).

const HISTORY_KEY = "medverify-history";
const MAX_HISTORY = 100;
const EXPIRY_WARNING_DAYS = 30;

let medicines = [];
let scanner = null;

const form = document.getElementById("check-form");
const idInput = document.getElementById("medicine-id");
const resultBox = document.getElementById("result");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const scanBtn = document.getElementById("scan-btn");
const stopScanBtn = document.getElementById("stop-scan-btn");
const scannerWrap = document.getElementById("scanner-wrap");


// ---------- Loading the data ----------

// The register is a simple CSV with no quoted commas, so a basic split is enough
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(",");
    const row = {};
    headers.forEach((h, i) => row[h] = (values[i] || "").trim());
    return row;
  });
}

async function loadMedicines() {
  try {
    const res = await fetch("medicines.csv");
    if (!res.ok) throw new Error(res.status);
    medicines = parseCSV(await res.text());
  } catch (err) {
    console.error("Could not load medicines.csv", err);
    showError("The medicine register could not be loaded. Refresh the page to try again.");
  }
}


// ---------- Checking a medicine ----------

function findMedicine(id) {
  return medicines.find(m => m.medicine_id.toLowerCase() === id.toLowerCase());
}

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateString + "T00:00:00");
  return Math.round((expiry - today) / 86400000);
}

function getStatus(medicine) {
  if (!medicine) return "unknown";
  if (medicine.is_counterfeit.toLowerCase() === "yes") return "counterfeit";
  if (daysUntil(medicine.expiry_date) < 0) return "expired";
  return "genuine";
}

// QR codes might hold just the ID or a full link like ...?id=MED001
function extractId(text) {
  try {
    const url = new URL(text);
    return url.searchParams.get("id") || text;
  } catch {
    return text;
  }
}

function checkMedicine(rawInput) {
  const id = extractId(rawInput.trim()).toUpperCase();
  if (!id) return;

  // Without the register every ID would look unknown, so stop rather than give a false result
  if (medicines.length === 0) {
    showError("The medicine register has not loaded, so this ID cannot be checked. Refresh the page and try again.");
    return;
  }

  const medicine = findMedicine(id);
  const status = getStatus(medicine);

  showResult(id, medicine, status);
  addToHistory({
    time: new Date().toISOString(),
    id: id,
    name: medicine ? medicine.medicine_name : "Not recognised",
    status: status
  });
}


// ---------- Showing the result ----------

const messages = {
  genuine: {
    title: "Genuine",
    text: "This medicine is on the register and in date."
  },
  counterfeit: {
    title: "Counterfeit",
    text: "Do not dispense. Quarantine the stock and report it to the MHRA."
  },
  expired: {
    title: "Expired",
    text: "This medicine is past its expiry date. Do not dispense."
  },
  unknown: {
    title: "Not recognised",
    text: "This ID is not on the register. Treat the pack as suspicious until it is verified."
  }
};

function formatDate(dateString) {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function showResult(id, medicine, status) {
  const msg = messages[status];
  let extraNote = "";

  if (medicine) {
    const days = daysUntil(medicine.expiry_date);
    if (status === "counterfeit" && days < 0) {
      extraNote = "<p>It is also past its expiry date.</p>";
    } else if (status === "genuine" && days <= EXPIRY_WARNING_DAYS) {
      extraNote = `<p>Expires in ${days} day${days === 1 ? "" : "s"}.</p>`;
    }
  }

  let details = `<div><dt>Medicine ID</dt><dd>${escapeHTML(id)}</dd></div>`;
  if (medicine) {
    details += `
      <div><dt>Name</dt><dd>${escapeHTML(medicine.medicine_name)}</dd></div>
      <div><dt>Manufacturer</dt><dd>${escapeHTML(medicine.manufacturer)}</dd></div>
      <div><dt>Expiry date</dt><dd>${formatDate(medicine.expiry_date)}</dd></div>`;
  }

  resultBox.innerHTML = `
    <article class="label ${status}">
      <div class="verdict">
        <h2>${msg.title}</h2>
        <p>${msg.text}</p>
        ${extraNote}
      </div>
      <dl class="details">${details}</dl>
    </article>`;
}

function showError(text) {
  resultBox.innerHTML = `
    <article class="label unknown">
      <div class="verdict"><h2>Something went wrong</h2><p>${text}</p></div>
    </article>`;
}

// IDs come from user input or a scanned code, so never trust them as HTML
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}


// ---------- History ----------

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.warn("History could not be saved", err);
  }
}

function addToHistory(entry) {
  const history = getHistory();
  history.unshift(entry);
  saveHistory(history.slice(0, MAX_HISTORY));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  historyList.innerHTML = "";
  historyEmpty.hidden = history.length > 0;

  history.forEach(item => {
    const li = document.createElement("li");
    const time = new Date(item.time).toLocaleString("en-GB", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
    li.innerHTML = `
      <span class="h-name">${escapeHTML(item.name)} (${escapeHTML(item.id)})</span>
      <span class="status ${item.status}">${messages[item.status].title}</span>
      <span class="h-time">${time}</span>`;
    historyList.appendChild(li);
  });
}

function exportHistory() {
  const history = getHistory();
  if (history.length === 0) return;

  const rows = [["timestamp", "medicine_id", "medicine_name", "result"]];
  history.forEach(h => rows.push([h.time, h.id, h.name, messages[h.status].title]));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "scan_history.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}


// ---------- Camera scanning ----------

async function startScanner() {
  if (typeof Html5Qrcode === "undefined") {
    showError("The scanner could not load. Type the medicine ID instead.");
    return;
  }

  scannerWrap.hidden = false;
  scanBtn.hidden = true;
  scanner = new Html5Qrcode("scanner");

  try {
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      decoded => {
        stopScanner();
        idInput.value = extractId(decoded);
        checkMedicine(decoded);
      }
    );
  } catch (err) {
    console.error(err);
    stopScanner();
    showError("Camera access was blocked or no camera was found. Allow camera access in your browser settings, or type the ID instead.");
  }
}

async function stopScanner() {
  if (scanner && scanner.isScanning) {
    await scanner.stop();
  }
  scannerWrap.hidden = true;
  scanBtn.hidden = false;
}


// ---------- Start up ----------

form.addEventListener("submit", e => {
  e.preventDefault();
  checkMedicine(idInput.value);
});

scanBtn.addEventListener("click", startScanner);
stopScanBtn.addEventListener("click", stopScanner);
document.getElementById("export-btn").addEventListener("click", exportHistory);
document.getElementById("clear-btn").addEventListener("click", () => {
  if (confirm("Clear all recent checks from this device?")) {
    saveHistory([]);
    renderHistory();
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service worker failed", err));
}

(async function init() {
  renderHistory();
  await loadMedicines();

  // Opening the app from a QR code link, e.g. index.html?id=MED003
  const idFromLink = new URLSearchParams(location.search).get("id");
  if (idFromLink && medicines.length) {
    idInput.value = idFromLink;
    checkMedicine(idFromLink);
    history.replaceState(null, "", location.pathname);
  }
})();
