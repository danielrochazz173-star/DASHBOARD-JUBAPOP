const SHEET_ID = "1kduUrKUo0bPbi8EJRtSrlef5m1ES8xB9y7CnasCQ2KU";
const API_KEY = "AIzaSyDtqlBiVuHWKMYEG177_JRfrCmxtg6_IOs";
const RANGE = "Respostas ao formulário 1!A1:K";

const refreshBtn = document.getElementById("refreshBtn");
const statusText = document.getElementById("statusText");
const totalCount = document.getElementById("totalCount");
const avgAge = document.getElementById("avgAge");
const topDay = document.getElementById("topDay");
const topArea = document.getElementById("topArea");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const searchInput = document.getElementById("searchInput");
const lastUpdated = document.getElementById("lastUpdated");

let daysChart = null;
let areasChart = null;
let cachedRows = [];

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusText.style.color = isError ? "#b3261e" : "";
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildUrl() {
  const encodedRange = encodeURIComponent(RANGE);
  return `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}?key=${API_KEY}`;
}

function parseDateBR(value) {
  if (!value) return null;
  const parts = value.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map((item) => Number(item));
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

function calcAge(dateObj) {
  if (!dateObj) return null;
  const today = new Date();
  let age = today.getFullYear() - dateObj.getFullYear();
  const m = today.getMonth() - dateObj.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateObj.getDate())) {
    age -= 1;
  }
  return age;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    const key = (value || "").trim();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topFromCount(counts) {
  const entries = Object.entries(counts);
  if (!entries.length) return "-";
  entries.sort((a, b) => b[1] - a[1]);
  return `${entries[0][0]} (${entries[0][1]})`;
}

function updateTable(headers, rows) {
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  tableHead.appendChild(headerRow);

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((_, index) => {
      const td = document.createElement("td");
      td.textContent = row[index] ?? "";
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });
}

function renderCharts(dayCounts, areaCounts) {
  const dayLabels = Object.keys(dayCounts);
  const dayValues = Object.values(dayCounts);
  const areaLabels = Object.keys(areaCounts);
  const areaValues = Object.values(areaCounts);

  if (daysChart) daysChart.destroy();
  if (areasChart) areasChart.destroy();

  daysChart = new Chart(document.getElementById("daysChart"), {
    type: "bar",
    data: {
      labels: dayLabels,
      datasets: [
        {
          label: "Respostas",
          data: dayValues,
          backgroundColor: "#f07a2b",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
    },
  });

  areasChart = new Chart(document.getElementById("areasChart"), {
    type: "doughnut",
    data: {
      labels: areaLabels,
      datasets: [
        {
          data: areaValues,
          backgroundColor: [
            "#f07a2b",
            "#f1a661",
            "#f2c08b",
            "#f4d9a6",
            "#f7ece0",
            "#e65f25",
            "#d94b2b",
            "#c83f2f",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
}

function applySearch(value) {
  const term = value.trim().toLowerCase();
  if (!term) {
    updateTable(cachedRows.headers, cachedRows.rows);
    return;
  }
  const filtered = cachedRows.rows.filter((row) =>
    row.some((cell) => String(cell || "").toLowerCase().includes(term))
  );
  updateTable(cachedRows.headers, filtered);
}

async function loadData() {
  try {
    setStatus("Carregando dados...");
    const res = await fetch(buildUrl());
    if (!res.ok) {
      throw new Error(`Erro ${res.status}`);
    }
    const payload = await res.json();
    const [headers, ...rows] = payload.values || [];

    if (!headers || !headers.length) {
      throw new Error("Planilha sem cabecalho");
    }

    const normalizedHeaders = headers.map(normalizeText);
    const nameIndex = normalizedHeaders.findIndex((h) => h.includes("nome"));
    const birthIndex = normalizedHeaders.findIndex((h) =>
      h.includes("nascimento")
    );
    const dayIndex = normalizedHeaders.findIndex((h) =>
      h.includes("dia da semana")
    );
    const areaIndex = normalizedHeaders.findIndex((h) => h.includes("area"));

    const extendedHeaders = [...headers, "Idade"];
    const enrichedRows = rows.map((row) => {
      const birthDate = parseDateBR(row[birthIndex]);
      const age = calcAge(birthDate);
      return [...row, age ?? "-"];
    });

    cachedRows = { headers: extendedHeaders, rows: enrichedRows };

    totalCount.textContent = rows.length.toString();

    const ages = enrichedRows
      .map((row) => row[extendedHeaders.length - 1])
      .filter((age) => typeof age === "number");
    const avg = ages.length
      ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)
      : 0;
    avgAge.textContent = avg ? `${avg} anos` : "-";

    const dayCounts = dayIndex >= 0 ? countBy(rows.map((row) => row[dayIndex])) : {};
    const areaCounts =
      areaIndex >= 0 ? countBy(rows.map((row) => row[areaIndex])) : {};

    topDay.textContent = topFromCount(dayCounts);
    topArea.textContent = topFromCount(areaCounts);

    updateTable(extendedHeaders, enrichedRows);
    renderCharts(dayCounts, areaCounts);

    lastUpdated.textContent = `Ultima atualizacao: ${new Date().toLocaleString("pt-BR")}`;
    setStatus("Atualizado.");
  } catch (err) {
    setStatus(`Falha ao carregar: ${err.message}`, true);
  }
}

refreshBtn.addEventListener("click", loadData);
searchInput.addEventListener("input", (event) => applySearch(event.target.value));

loadData();
