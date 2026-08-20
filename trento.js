const countdown = document.querySelector("#exchangeCountdown");
const departureDate = new Date("2026-09-06T00:00:00+08:00");
const todayAtMidnight = new Date();

todayAtMidnight.setHours(0, 0, 0, 0);
const daysUntilDeparture = Math.ceil((departureDate - todayAtMidnight) / 86400000);

if (daysUntilDeparture > 0) {
  countdown.textContent = `还有 ${daysUntilDeparture} 天出发`;
} else if (daysUntilDeparture === 0) {
  countdown.textContent = "今天出发啦！";
} else {
  countdown.textContent = "交换旅程进行中";
}

const journeyMap = document.querySelector("#journeyMap");
const journeyMapFrame = document.querySelector("#journeyMapFrame");
const mapFullscreen = document.querySelector("#mapFullscreen");
const mapClose = document.querySelector("#mapClose");
let routeMap;

if (journeyMap && window.L) {
  const routeStops = [
    { name: "上海", stage: "9 月 6 日 · 从上海出发", coordinates: [31.1443, 121.8083], label: "01" },
    { name: "赫尔辛基", stage: "AY88 · 转机", coordinates: [60.3172, 24.9633], label: "02" },
    { name: "维罗纳", stage: "9 月 6 日 · 抵达", coordinates: [45.4384, 10.9916], label: "03" },
    { name: "特伦托", stage: "9 月 7 日 · 火车抵达", coordinates: [46.0748, 11.1217], label: "04" },
  ];
  routeMap = window.L.map(journeyMap, { scrollWheelZoom: true, worldCopyJump: true }).setView([48, 52], 3);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap contributors",
  }).addTo(routeMap);

  const markerIcon = (label) => window.L.divIcon({
    className: "",
    html: `<div class="map-pin"><span>${label}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });

  routeStops.forEach((stop) => {
    window.L.marker(stop.coordinates, { icon: markerIcon(stop.label) })
      .addTo(routeMap)
      .bindPopup(`<strong>${stop.name}</strong><br>${stop.stage}`);
  });

  window.L.polyline(routeStops.map((stop) => stop.coordinates), {
    color: "#d93654",
    weight: 3,
    opacity: 0.85,
    dashArray: "8 10",
  }).addTo(routeMap);

  journeyMap.querySelector(".map-loading")?.remove();
}

if (mapFullscreen && journeyMapFrame) {
  const journeyMapWrap = journeyMapFrame.closest(".journey-map-wrap");
  const setMapExpanded = (isExpanded) => {
    journeyMapFrame.classList.toggle("is-expanded", isExpanded);
    journeyMapWrap?.classList.toggle("is-map-expanded", isExpanded);
    document.body.classList.toggle("map-expanded", isExpanded);
    mapFullscreen.textContent = isExpanded ? "收起地图" : "展开地图";
    if (routeMap) window.setTimeout(() => routeMap.invalidateSize(), 120);
  };

  mapFullscreen.addEventListener("click", () => setMapExpanded(!journeyMapFrame.classList.contains("is-expanded")));
  mapClose?.addEventListener("click", () => setMapExpanded(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && journeyMapFrame.classList.contains("is-expanded")) setMapExpanded(false);
  });
}

const itineraryPanel = document.querySelector("#itineraryPanel");
const itineraryDate = document.querySelector("#itineraryDate");
const itineraryStatus = document.querySelector("#itineraryStatus");
const itineraryContent = document.querySelector("#itineraryContent");
const calendarDays = document.querySelector("#calendarDays");
const calendarMonthLabel = document.querySelector("#calendarMonthLabel");
const calendarPrevious = document.querySelector("#calendarPrevious");
const calendarNext = document.querySelector("#calendarNext");

const tripDays = {
  "2026-09-06": {
    date: "9 月 6 日 · 周日",
    status: "航段已确认",
    cards: [
      {
        type: "国际航班",
        title: "AY88",
        suffix: "Finnair",
        rows: [
          ["出发（当地 / 北京）", "20:50 · 上海 UTC+8"],
          ["出发机场", "上海浦东 PVG · T2"],
          ["抵达（当地）", "09/07 05:55 · 赫尔辛基 UTC+3"],
          ["抵达（北京时间）", "09/07 10:55"],
          ["计划机型", "Airbus A350-900"],
        ],
        note: "预计飞行约 14 小时 05 分。跨日抵达赫尔辛基。",
      },
      {
        type: "出发前",
        title: "PVG T2",
        suffix: "机场信息",
        rows: [
          ["建议到达机场", "起飞前 3 小时"],
          ["办理事项", "值机 / 托运 / 出境"],
          ["待补充", "值机柜台、座位、行李额度"],
        ],
        note: "此卡留给订单中的座位、行李和实际柜台信息。",
      },
    ],
    sources: ["Finnair AY88 航段", "https://www.flight.info/AY88"],
  },
  "2026-09-07": {
    date: "9 月 7 日 · 周一",
    status: "转机航班待订单确认",
    cards: [
      {
        type: "赫尔辛基转机",
        title: "HEL",
        suffix: "约 10 小时 25 分",
        rows: [
          ["AY88 抵达", "05:55 · 当地时间 UTC+3"],
          ["对应北京时间", "10:55"],
          ["下一程预计出发", "16:20 · 当地时间"],
          ["转机时长", "约 10 小时 25 分"],
        ],
        note: "请以订单的实际到达、登机口和转机要求为准。",
      },
      {
        type: "推定直飞航段",
        title: "AY1803",
        suffix: "待确认",
        rows: [
          ["出发（当地）", "16:20 · HEL UTC+3"],
          ["出发（北京时间）", "21:20"],
          ["抵达（当地）", "18:15 · VRN UTC+2"],
          ["抵达（北京时间）", "09/08 00:15"],
          ["计划机型", "Airbus A320"],
        ],
        note: "这与“赫尔辛基当地下午出发”的描述匹配；航班号和机型须以订单确认。",
      },
      {
        type: "维罗纳抵达",
        title: "VRN",
        suffix: "Verona Villafranca",
        rows: [
          ["抵达时间", "18:15 · 当地时间"],
          ["下一步", "住宿 / 机场接驳"],
          ["待补充", "酒店或前往车站的路线"],
        ],
        note: "如有住宿订单或接驳信息，可直接补到这张卡。",
      },
    ],
    sources: ["Finnair HEL–VRN 航线页面", "https://www.finnair.com/en/flights/city-to-city/hel/vrn/flights-from-Helsinki-to-Verona"],
  },
  "2026-09-08": {
    date: "9 月 8 日 · 周二",
    status: "火车信息待补充",
    cards: [
      {
        type: "铁路路线",
        title: "Verona → Trento",
        suffix: "待确认",
        rows: [
          ["出发站", "Verona Porta Nuova（待订单确认）"],
          ["到达站", "Trento"],
          ["待补充", "车次 / 发车时间 / 站台"],
          ["待补充", "座位 / 行李 / 到达时间"],
        ],
        note: "收到火车票或截图后，这里会补成完整的进城路线。",
      },
      {
        type: "到达特伦托",
        title: "入住与安顿",
        suffix: "待补充",
        rows: [
          ["车站到住处", "待补充"],
          ["交通方式", "步行 / 巴士 / 出租车"],
          ["必要采购", "SIM 卡 / 食物 / 生活用品"],
        ],
        note: "住处大概区域确认后，可以把附近超市、药店和路线写入生活模块。",
      },
    ],
    sources: ["火车班次与票面信息待补充", "https://www.trenitalia.com/"],
  },
};

const renderItinerary = (dateKey) => {
  const selected = tripDays[dateKey];
  if (!itineraryPanel) return;

  if (!selected) {
    const selectedDate = new Date(`${dateKey}T12:00:00`);
    const dateText = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(selectedDate);
    itineraryDate.textContent = dateText;
    itineraryStatus.textContent = "尚未录入安排";
    itineraryContent.innerHTML = `<div class="empty-itinerary"><b>这一天还没有安排</b><span>后续告诉我日期、地点或订单信息，就可以继续补进这个日历。</span></div>`;
    return;
  }

  itineraryDate.textContent = selected.date;
  itineraryStatus.textContent = selected.status;
  itineraryContent.innerHTML = `<div class="itinerary-grid">${selected.cards.map((card) => `
    <article class="transport-detail${card.suffix === "待确认" ? " is-pending" : ""}">
      <p>${card.type}</p><h3>${card.title}<span>${card.suffix}</span></h3>
      <dl>${card.rows.map(([term, definition]) => `<dt>${term}</dt><dd>${definition}</dd>`).join("")}</dl>
      <p class="transport-note">${card.note}</p>
    </article>`).join("")}</div>
    <p class="itinerary-sources">资料参考：<a href="${selected.sources[1]}" target="_blank" rel="noopener noreferrer">${selected.sources[0]}</a></p>`;
};

const calendarRange = [
  { year: 2026, month: 8 }, { year: 2026, month: 9 }, { year: 2026, month: 10 },
  { year: 2026, month: 11 }, { year: 2027, month: 0 }, { year: 2027, month: 1 },
];
let currentCalendarIndex = 0;
let selectedDateKey = "2026-09-06";

const dateKeyFor = (year, month, day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const renderCalendar = () => {
  if (!calendarDays || !calendarMonthLabel) return;

  const { year, month } = calendarRange[currentCalendarIndex];
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const numberOfDays = new Date(year, month + 1, 0).getDate();
  const monthName = `${year} 年 ${month + 1} 月`;
  const cells = Array.from({ length: firstWeekday }, () => '<span class="calendar-empty" aria-hidden="true"></span>');

  for (let day = 1; day <= numberOfDays; day += 1) {
    const dateKey = dateKeyFor(year, month, day);
    const itinerary = tripDays[dateKey];
    const description = itinerary ? itinerary.cards[0].title : "暂无安排";
    cells.push(`<button class="calendar-day${itinerary ? " is-planned" : ""}${dateKey === selectedDateKey ? " is-active" : ""}" type="button" aria-pressed="${dateKey === selectedDateKey}" data-date="${dateKey}"><b>${day}</b><small>${description}</small></button>`);
  }

  calendarMonthLabel.textContent = monthName;
  calendarDays.setAttribute("aria-label", `${monthName}行程日历`);
  calendarDays.innerHTML = cells.join("");
  calendarPrevious.disabled = currentCalendarIndex === 0;
  calendarNext.disabled = currentCalendarIndex === calendarRange.length - 1;
};

calendarDays?.addEventListener("click", (event) => {
  const button = event.target.closest(".calendar-day");
  if (!button) return;
  selectedDateKey = button.dataset.date;
  renderCalendar();
  renderItinerary(selectedDateKey);
});

calendarPrevious?.addEventListener("click", () => {
  if (currentCalendarIndex > 0) {
    currentCalendarIndex -= 1;
    renderCalendar();
  }
});

calendarNext?.addEventListener("click", () => {
  if (currentCalendarIndex < calendarRange.length - 1) {
    currentCalendarIndex += 1;
    renderCalendar();
  }
});

renderCalendar();
renderItinerary(selectedDateKey);

const weatherElements = {
  icon: document.querySelector("#weatherIcon"),
  now: document.querySelector("#weatherNow"),
  condition: document.querySelector("#weatherCondition"),
  feels: document.querySelector("#weatherFeels"),
  high: document.querySelector("#weatherHigh"),
  low: document.querySelector("#weatherLow"),
  rain: document.querySelector("#weatherRain"),
  updated: document.querySelector("#weatherUpdated"),
};
const weatherRefresh = document.querySelector("#weatherRefresh");
const trentoTime = document.querySelector("#trentoTime");
const beijingTime = document.querySelector("#beijingTime");

const updateCityTimes = () => {
  const formatTime = (timeZone) => new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  setWeatherValue(trentoTime, formatTime("Europe/Rome"));
  setWeatherValue(beijingTime, formatTime("Asia/Shanghai"));
};

const weatherLabel = (code) => {
  const conditions = {
    0: ["☀", "晴"], 1: ["◌", "大致晴朗"], 2: ["◌", "局部多云"], 3: ["☁", "阴"],
    45: ["≋", "有雾"], 48: ["≋", "雾凇"], 51: ["☂", "毛毛雨"], 53: ["☂", "毛毛雨"],
    55: ["☂", "强毛毛雨"], 61: ["☂", "小雨"], 63: ["☂", "中雨"], 65: ["☂", "大雨"],
    71: ["✳", "小雪"], 73: ["✳", "中雪"], 75: ["✳", "大雪"], 80: ["☂", "阵雨"],
    81: ["☂", "强阵雨"], 82: ["☂", "暴雨"], 95: ["ϟ", "雷暴"], 96: ["ϟ", "冰雹雷暴"], 99: ["ϟ", "强冰雹雷暴"],
  };

  return conditions[code] ?? ["◌", "天气数据更新中"];
};

const setWeatherValue = (element, value) => {
  if (element) element.textContent = value;
};

const loadTrentoWeather = async () => {
  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=46.0748&longitude=11.1217&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FRome&forecast_days=1&_=${Date.now()}`;

  if (weatherRefresh) {
    weatherRefresh.disabled = true;
    weatherRefresh.textContent = "更新中…";
  }

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("Weather request failed");

    const weather = await response.json();
    const [symbol, description] = weatherLabel(weather.current.weather_code);
    const daily = weather.daily;

    setWeatherValue(weatherElements.icon, symbol);
    setWeatherValue(weatherElements.now, `${Math.round(weather.current.temperature_2m)}°`);
    setWeatherValue(weatherElements.condition, description);
    setWeatherValue(weatherElements.feels, `${Math.round(weather.current.apparent_temperature)}°`);
    setWeatherValue(weatherElements.high, `${Math.round(daily.temperature_2m_max[0])}°`);
    setWeatherValue(weatherElements.low, `${Math.round(daily.temperature_2m_min[0])}°`);
    setWeatherValue(weatherElements.rain, `${daily.precipitation_probability_max[0]}%`);
    const updateTime = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit",
    }).format(new Date());
    setWeatherValue(weatherElements.updated, `特伦托时间 ${updateTime} 更新`);
  } catch {
    setWeatherValue(weatherElements.condition, "暂时无法获取天气");
    setWeatherValue(weatherElements.updated, "天气服务暂时不可用，请稍后刷新");
  } finally {
    if (weatherRefresh) {
      weatherRefresh.disabled = false;
      weatherRefresh.textContent = "↻ 刷新";
    }
  }
};

weatherRefresh?.addEventListener("click", loadTrentoWeather);
updateCityTimes();
window.setInterval(updateCityTimes, 1000);
loadTrentoWeather();
