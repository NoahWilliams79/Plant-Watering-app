(function () {
  "use strict";

  const FREE_LIMIT = 6;
  const storageKey = "hydrationVegitationPlants";
  const iconForKind = { Tropical: "🌿", Succulent: "🌵", Fern: "🌱", Foliage: "🪴", Other: "🍃" };
  const defaultPlants = [
    { id: "monstera", name: "Monstera", kind: "Tropical", interval: 7, lastWatered: dateDaysAgo(6) },
    { id: "little-prickles", name: "Little Prickles", kind: "Succulent", interval: 14, lastWatered: dateDaysAgo(12) },
    { id: "fernando", name: "Fernando", kind: "Fern", interval: 5, lastWatered: dateDaysAgo(5) },
    { id: "pothos", name: "Golden Pothos", kind: "Foliage", interval: 9, lastWatered: dateDaysAgo(3) }
  ];

  function dateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return toDateInputValue(date);
  }

  function toDateInputValue(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function readPlants() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === null) return defaultPlants;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : defaultPlants;
    } catch (error) {
      return defaultPlants;
    }
  }

  let plants = readPlants();
  let activeFilter = "all";
  const list = document.getElementById("plant-list");
  const dialog = document.getElementById("plant-dialog");
  const form = document.getElementById("plant-form");
  const reminderButton = document.getElementById("reminder-button");

  function savePlants() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(plants));
    } catch (error) {
      document.getElementById("chart-note").textContent = "Browser storage is unavailable; changes may not be saved.";
    }
  }

  function daysSinceWatered(plant) {
    const watered = new Date(plant.lastWatered + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - watered) / 86400000));
  }

  function daysUntilWater(plant) {
    return Number(plant.interval) - daysSinceWatered(plant);
  }

  function isDue(plant) {
    return daysUntilWater(plant) <= 0;
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makePlantCard(plant) {
    const dueIn = daysUntilWater(plant);
    const due = dueIn <= 0;
    const card = makeElement("article", "plant-row" + (due ? " is-due" : ""));
    const icon = makeElement("span", "plant-icon", iconForKind[plant.kind] || iconForKind.Other);
    icon.setAttribute("aria-hidden", "true");
    const details = makeElement("div", "plant-details");
    const title = makeElement("h3", "", plant.name);
    const meta = makeElement("p", "plant-meta", plant.kind + " · every " + plant.interval + " days");
    details.append(title, meta);

    const status = makeElement("div", "plant-status");
    const statusLabel = due
      ? (dueIn === 0 ? "Water today" : "Overdue by " + Math.abs(dueIn) + (Math.abs(dueIn) === 1 ? " day" : " days"))
      : (dueIn === 1 ? "Water tomorrow" : "In " + dueIn + " days");
    const statusText = makeElement("span", "status-label" + (due ? " status-due" : ""), statusLabel);
    const wateredText = makeElement("span", "watered-label", "Last watered " + daysSinceWatered(plant) + (daysSinceWatered(plant) === 1 ? " day ago" : " days ago"));
    status.append(statusText, wateredText);

    const actions = makeElement("div", "plant-actions");
    const waterButton = makeElement("button", "water-button", due ? "Watered" : "Water now");
    waterButton.type = "button";
    waterButton.setAttribute("aria-label", "Mark " + plant.name + " as watered today");
    waterButton.addEventListener("click", function () {
      plant.lastWatered = toDateInputValue(new Date());
      savePlants();
      render();
    });
    const removeButton = makeElement("button", "icon-button remove-button", "×");
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", "Remove " + plant.name);
    removeButton.addEventListener("click", function () {
      plants = plants.filter(function (item) { return item.id !== plant.id; });
      savePlants();
      render();
    });
    actions.append(waterButton, removeButton);
    card.append(icon, details, status, actions);
    return card;
  }

  function renderWeekChart() {
    const chart = document.getElementById("week-chart");
    chart.replaceChildren();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      const key = toDateInputValue(date);
      const count = plants.filter(function (plant) {
        const dueDate = new Date(plant.lastWatered + "T00:00:00");
        dueDate.setDate(dueDate.getDate() + Number(plant.interval));
        dueDate.setHours(0, 0, 0, 0);
        return toDateInputValue(dueDate) === key;
      }).length;
      const column = makeElement("div", "chart-day" + (day === 0 ? " is-today" : ""));
      const barArea = makeElement("div", "bar-area");
      const bar = makeElement("span", "chart-bar" + (count ? " has-water" : ""));
      bar.style.setProperty("--bar-height", (count ? Math.min(100, 26 + count * 22) : 9) + "%");
      bar.setAttribute("aria-label", count + (count === 1 ? " plant due" : " plants due"));
      barArea.append(bar);
      const label = makeElement("span", "day-label", day === 0 ? "Today" : date.toLocaleDateString(undefined, { weekday: "short" }));
      column.append(barArea, label);
      chart.append(column);
    }
    const dueSoon = plants.filter(function (plant) { return daysUntilWater(plant) > 0 && daysUntilWater(plant) <= 7; }).length;
    document.getElementById("chart-note").textContent = dueSoon
      ? dueSoon + (dueSoon === 1 ? " plant is" : " plants are") + " due in the next 7 days."
      : "No plants due in the next 7 days. Enjoy the slow growth.";
  }

  function render() {
    const duePlants = plants.filter(isDue);
    const visiblePlants = activeFilter === "due" ? duePlants : plants;
    list.replaceChildren.apply(list, visiblePlants.map(makePlantCard));
    document.getElementById("filter-empty").hidden = activeFilter !== "due" || duePlants.length > 0;
    document.getElementById("empty-state").hidden = plants.length !== 0 || activeFilter === "due";
    document.getElementById("due-count").textContent = duePlants.length;
    document.getElementById("due-caption").textContent = duePlants.length === 1 ? "plant waiting" : "plants waiting";
    document.getElementById("happy-count").textContent = plants.length - duePlants.length;
    document.getElementById("total-count").textContent = plants.length;
    document.getElementById("heading-count").textContent = plants.length;
    document.getElementById("plant-limit").textContent = plants.length + " of " + FREE_LIMIT + " free plants";
    document.getElementById("filter-due-count").textContent = duePlants.length;
    renderWeekChart();
    document.getElementById("add-plant-top").disabled = plants.length >= FREE_LIMIT;
    document.getElementById("add-first-plant").disabled = plants.length >= FREE_LIMIT;
  }

  function openDialog() {
    if (plants.length >= FREE_LIMIT) {
      document.getElementById("prototype-note").textContent = "The free garden holds 6 plants. Preview Plus for unlimited plants; checkout is not connected.";
      document.getElementById("plus").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    document.getElementById("dialog-error").hidden = true;
    document.getElementById("last-watered").value = toDateInputValue(new Date());
    dialog.showModal();
    document.getElementById("plant-name").focus();
  }

  document.getElementById("add-plant-top").addEventListener("click", openDialog);
  document.getElementById("add-first-plant").addEventListener("click", openDialog);
  document.getElementById("close-dialog").addEventListener("click", function () { dialog.close(); });
  document.getElementById("plant-kind").addEventListener("change", function (event) {
    const intervals = { Tropical: 7, Succulent: 14, Fern: 5, Foliage: 9, Other: 7 };
    const interval = document.getElementById("plant-interval");
    interval.value = intervals[event.target.value];
    document.getElementById("interval-display").textContent = interval.value;
  });
  document.getElementById("plant-interval").addEventListener("input", function (event) {
    document.getElementById("interval-display").textContent = event.target.value;
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (plants.length >= FREE_LIMIT) {
      document.getElementById("dialog-error").textContent = "Your free garden is full. Preview Plant Care Plus for unlimited plants.";
      document.getElementById("dialog-error").hidden = false;
      return;
    }
    const values = new FormData(form);
    plants.push({
      id: "plant-" + Date.now(),
      name: String(values.get("name")).trim(),
      kind: String(values.get("kind")),
      interval: Number(values.get("interval")),
      lastWatered: String(values.get("lastWatered"))
    });
    savePlants();
    form.reset();
    document.getElementById("interval-display").textContent = "7";
    activeFilter = "all";
    document.querySelectorAll(".filter-button").forEach(function (button) {
      const selected = button.dataset.filter === "all";
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    dialog.close();
    render();
  });

  document.querySelectorAll(".filter-button").forEach(function (button) {
    button.addEventListener("click", function () {
      activeFilter = button.dataset.filter;
      document.querySelectorAll(".filter-button").forEach(function (filter) {
        const selected = filter === button;
        filter.classList.toggle("is-active", selected);
        filter.setAttribute("aria-pressed", String(selected));
      });
      render();
    });
  });

  document.getElementById("plus-button").addEventListener("click", function () {
    document.getElementById("prototype-note").textContent = "Plus preview selected. Checkout is not connected, and no payment was taken.";
    this.textContent = "Plus preview selected";
    this.disabled = true;
  });

  reminderButton.addEventListener("click", async function () {
    if (!("Notification" in window)) {
      document.getElementById("chart-note").textContent = "Browser notifications are not available here. Your watering reminders still appear in this garden.";
      return;
    }
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission !== "granted") {
      document.getElementById("chart-note").textContent = "Notifications are off. Your watering reminders still appear in this garden.";
      return;
    }
    const due = plants.filter(isDue);
    new Notification("Hydration Vegitation", { body: due.length ? due.length + (due.length === 1 ? " plant needs" : " plants need") + " a drink today." : "No plants need water today. Your garden is doing well." });
    document.getElementById("chart-note").textContent = "Reminder preview sent. Notifications work while this page is open.";
  });

  document.getElementById("today-label").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const today = toDateInputValue(new Date());
  document.getElementById("last-watered").max = today;
  render();
})();
