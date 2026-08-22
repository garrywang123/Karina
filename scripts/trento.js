const countdown = document.querySelector("#exchangeCountdown");
const departureDate = new Date("2026-09-06T00:00:00+08:00");
const todayAtMidnight = new Date();

todayAtMidnight.setHours(0, 0, 0, 0);
const daysUntilDeparture = Math.ceil((departureDate - todayAtMidnight) / 86400000);

if (countdown && daysUntilDeparture > 0) {
  countdown.textContent = `还有 ${daysUntilDeparture} 天出发`;
} else if (countdown && daysUntilDeparture === 0) {
  countdown.textContent = "今天出发啦！";
} else if (countdown) {
  countdown.textContent = "交换旅程进行中";
}

const journeyMap = document.querySelector("#journeyMap");
const journeyMapFrame = document.querySelector("#journeyMapFrame");
const mapFullscreen = document.querySelector("#mapFullscreen");
const mapClose = document.querySelector("#mapClose");
const mapStatus = document.querySelector("#mapStatus");
let routeMap;
let googleMapCenter;
let currentLocation;
let currentLocationMarker;
let currentRouteLines = [];
let routeStepMarkers = [];
let routeAlternativeLines = [];
let routeSummaryLabels = [];
let currentRouteOptions = [];
let currentRouteContext;
let selectedRouteIndex = 0;
let routeDetailsOpen = false;
let selectedRouteOrigin;
let selectedRouteDestination;
const GOOGLE_MAPS_API_KEY = "AIzaSyAFeKxaBmwfhiGCHUHkqSWLMqmuQSr-R1U";
const navigationStatus = document.querySelector("#navigationStatus");
const mapNavigation = document.querySelector("#mapNavigation");
const mapUseLocation = document.querySelector("#mapUseLocation");
const mapClearRoute = document.querySelector("#mapClearRoute");
const routeOriginInput = document.querySelector("#routeOrigin");
const routeDestinationInput = document.querySelector("#routeDestination");
const routeMode = document.querySelector("#routeMode");
const routeSwap = document.querySelector("#routeSwap");
const routeOriginSuggestions = document.querySelector("#routeOriginSuggestions");
const routeDestinationSuggestions = document.querySelector("#routeDestinationSuggestions");
const routeSteps = document.querySelector("#routeSteps");
const routeAlternatives = document.querySelector("#routeAlternatives");
const routeDetailsToggle = document.querySelector("#routeDetailsToggle");
const placeDetailPanel = document.querySelector("#placeDetailPanel");
const itineraryRoutes = {
  "verona-airport-hotel": {
    label: "维罗纳机场 → Porta Nuova Suites",
    origin: { name: "Verona Villafranca Airport", lat: 45.3957, lng: 10.8885 },
    destinationQuery: "Porta Nuova Suites, Verona, Italy",
    travelMode: "TRANSIT",
  },
};

const escapeHtml = (value = "") => String(value).replace(/[&<'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character]));

const hidePlacePanel = () => {
  if (placeDetailPanel) placeDetailPanel.hidden = true;
};

const formatPlacePrice = (priceRange, priceLevel) => {
  const money = (value) => value?.units != null ? `${value.currencyCode || ""} ${value.units}${value.nanos ? `.${String(value.nanos).padStart(9, "0").slice(0, 2)}` : ""}`.trim() : "";
  const start = money(priceRange?.startPrice);
  const end = money(priceRange?.endPrice);
  if (start || end) return `${start || ""}${start && end ? "–" : ""}${end || ""}`;
  return { PRICE_LEVEL_FREE: "免费", PRICE_LEVEL_INEXPENSIVE: "¥", PRICE_LEVEL_MODERATE: "¥¥", PRICE_LEVEL_EXPENSIVE: "¥¥¥", PRICE_LEVEL_VERY_EXPENSIVE: "¥¥¥¥" }[priceLevel] || "";
};

const placeTypeLabel = (place) => localizedText(place.primaryTypeDisplayName) || place.category || "Google 地点";

const placeOfferingLabels = (place) => [
  ["servesBreakfast", "早餐"], ["servesBrunch", "早午餐"], ["servesLunch", "午餐"], ["servesDinner", "晚餐"],
  ["servesCoffee", "咖啡"], ["servesDessert", "甜点"], ["servesVegetarianFood", "素食"], ["servesWine", "葡萄酒"],
].filter(([key]) => place[key] === true).map(([, label]) => label);

const placeCuisineLabels = (place) => {
  const typeLabels = {
    italian_restaurant: "意大利菜", chinese_restaurant: "中餐", japanese_restaurant: "日料",
    korean_restaurant: "韩餐", thai_restaurant: "泰餐", indian_restaurant: "印度菜",
    mexican_restaurant: "墨西哥菜", french_restaurant: "法餐", greek_restaurant: "希腊菜",
    mediterranean_restaurant: "地中海菜", seafood_restaurant: "海鲜", pizza_restaurant: "披萨",
    steak_house: "牛排", sushi_restaurant: "寿司", vegan_restaurant: "纯素餐",
    vegetarian_restaurant: "素食", hamburger_restaurant: "汉堡", barbecue_restaurant: "烧烤",
    cafe: "咖啡馆", bakery: "烘焙甜点", ice_cream_shop: "冰淇淋",
  };
  const types = [place.primaryType, ...(Array.isArray(place.types) ? place.types : [])];
  return [...new Set(types.map((type) => typeLabels[String(type || "").toLowerCase()]).filter(Boolean))];
};

const placeFeatureLabels = (place) => [
  [place.accessibilityOptions?.wheelchairAccessibleEntrance, "无障碍入口"],
  [place.accessibilityOptions?.wheelchairAccessibleParking, "无障碍停车"],
  [place.accessibilityOptions?.wheelchairAccessibleRestroom, "无障碍卫生间"],
  [place.parkingOptions?.freeParkingLot, "免费停车"],
  [place.parkingOptions?.paidParkingLot, "收费停车"],
  [place.parkingOptions?.freeStreetParking, "免费路边停车"],
  [place.paymentOptions?.acceptsCreditCards, "可刷信用卡"],
  [place.paymentOptions?.acceptsNfc, "支持感应支付"],
  [place.goodForChildren, "适合儿童"], [place.allowsDogs, "允许携犬"],
  [place.restroom, "有卫生间"], [place.reservable, "可预约"],
  [place.outdoorSeating, "户外座位"], [place.liveMusic, "现场音乐"],
  [place.dineIn, "可堂食"], [place.takeout, "可外带"], [place.delivery, "可配送"],
].filter(([available]) => available === true).map(([, label]) => label);

const makePlacePanelDraggable = () => {
  if (!placeDetailPanel || !journeyMapFrame || placeDetailPanel.dataset.dragReady === "true") return;
  placeDetailPanel.dataset.dragReady = "true";
  placeDetailPanel.addEventListener("pointerdown", (event) => {
    if (!journeyMapFrame.classList.contains("is-expanded") || window.matchMedia("(max-width: 760px)").matches) return;
    if (event.target instanceof Element && event.target.closest("button, a, summary, details, input, select")) return;
    event.preventDefault();
    const frameBounds = journeyMapFrame.getBoundingClientRect();
    const panelBounds = placeDetailPanel.getBoundingClientRect();
    const offsetX = event.clientX - panelBounds.left;
    const offsetY = event.clientY - panelBounds.top;
    const move = (moveEvent) => {
      const left = Math.min(Math.max(moveEvent.clientX - frameBounds.left - offsetX, 8), Math.max(8, frameBounds.width - panelBounds.width - 8));
      const top = Math.min(Math.max(moveEvent.clientY - frameBounds.top - offsetY, 8), Math.max(8, frameBounds.height - 88));
      placeDetailPanel.style.right = "auto";
      placeDetailPanel.style.bottom = "auto";
      placeDetailPanel.style.left = `${left}px`;
      placeDetailPanel.style.top = `${top}px`;
    };
    placeDetailPanel.setPointerCapture?.(event.pointerId);
    placeDetailPanel.addEventListener("pointermove", move);
    placeDetailPanel.addEventListener("pointerup", () => placeDetailPanel.removeEventListener("pointermove", move), { once: true });
    placeDetailPanel.addEventListener("pointercancel", () => placeDetailPanel.removeEventListener("pointermove", move), { once: true });
  });
};

const isVisitorPlace = (place) => {
  const type = String(place.primaryType || place.category || "").toLowerCase();
  return /museum|tourist|art_gallery|zoo|aquarium|amusement|park|church|landmark|historical/.test(type);
};

const showPlacePanel = (place) => {
  if (!placeDetailPanel) return;
  // A place card is the active task. Keep the selected route, but collapse its
  // long step list so the card is never hidden below the navigation controls.
  if (routeDetailsOpen) {
    routeDetailsOpen = false;
    if (routeSteps) routeSteps.hidden = true;
    renderRouteAlternatives();
    if (routeDetailsToggle) routeDetailsToggle.textContent = "查看详细步骤";
  }
  const photo = place.photoName ? `https://places.googleapis.com/v1/${place.photoName}/media?maxWidthPx=720&key=${GOOGLE_MAPS_API_KEY}` : "";
  const photoCredit = place.photoAttributions?.map((item) => item.displayName || item.uri ? `<a href="${escapeHtml(item.uri || "#")}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.displayName || "图片来源")}</a>` : "").join("") || "";
  const rating = Number.isFinite(place.rating) ? `★ ${place.rating.toFixed(1)}${place.userRatingCount ? `（${place.userRatingCount} 条评价）` : ""}` : "暂无评分";
  const price = formatPlacePrice(place.priceRange, place.priceLevel);
  const opening = place.currentOpeningHours?.openNow === true ? "营业中" : place.currentOpeningHours?.openNow === false ? "当前未营业" : "营业时间待确认";
  const mapLink = place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.lat},${place.lng}`)}`;
  const offerings = placeOfferingLabels(place);
  const cuisines = placeCuisineLabels(place);
  const features = placeFeatureLabels(place);
  const visitorPlace = isVisitorPlace(place);
  const summary = localizedText(place.editorialSummary) || localizedText(place.reviewSummary);
  const phone = place.internationalPhoneNumber || place.nationalPhoneNumber || "";
  const hours = place.regularOpeningHours?.weekdayDescriptions?.filter(Boolean) || [];
  const reviews = (place.reviews || []).filter((review) => localizedText(review.text)).slice(0, 2);
  placeDetailPanel.innerHTML = `<div class="place-detail-drag-handle" data-place-drag-handle title="全屏时可拖动地点卡"><i></i><span>拖动地点卡</span></div><button class="place-detail-close" type="button" aria-label="关闭地点详情">×</button>${photo ? `<img class="place-detail-photo" src="${photo}" alt="${escapeHtml(place.name)} 的地点图片" />` : ""}<div class="place-detail-body"><span>${escapeHtml(placeTypeLabel(place))}</span><h3>${escapeHtml(place.name)}</h3><p class="place-detail-address">${escapeHtml(place.detail || place.formattedAddress || "地址待确认")}</p><div class="place-detail-meta"><b>${rating}</b>${price ? `<i>${visitorPlace ? "费用参考" : "价格参考"} ${escapeHtml(price)}</i>` : ""}<em>${opening}</em></div>${cuisines.length || offerings.length ? `<section class="place-detail-section place-detail-dining">${cuisines.length ? `<p><b>菜系</b>${escapeHtml(cuisines.join(" · "))}</p>` : ""}${offerings.length ? `<div class="place-detail-tags">${offerings.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}</section>` : ""}${features.length ? `<section class="place-detail-section"><b>设施与服务</b><div class="place-detail-tags place-detail-tags--features">${features.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section>` : ""}${summary ? `<p class="place-detail-summary">${escapeHtml(summary)}</p>` : ""}${phone || place.websiteUri ? `<div class="place-detail-contact">${phone ? `<a href="tel:${escapeHtml(phone.replace(/[^+\d]/g, ""))}">电话 ${escapeHtml(phone)}</a>` : ""}${place.websiteUri ? `<a href="${escapeHtml(place.websiteUri)}" target="_blank" rel="noopener noreferrer">${visitorPlace ? "门票 / 预约与官方详情" : "官方网站"} ↗</a>` : ""}</div>` : ""}${hours.length ? `<details class="place-detail-hours"><summary>营业时间</summary>${hours.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}</details>` : ""}${reviews.length ? `<section class="place-detail-reviews" aria-label="Google Maps 评价"><b>Google Maps 评价</b>${reviews.map((review) => `<article><strong>${escapeHtml(review.authorAttribution?.displayName || "Google 用户")}${Number.isFinite(review.rating) ? ` · ★ ${review.rating.toFixed(1)}` : ""}</strong><p>${escapeHtml(localizedText(review.text))}</p></article>`).join("")}</section>` : ""}<div class="place-detail-actions"><button type="button" data-place-panel-origin>设为起点</button><button type="button" data-place-panel-destination>设为终点</button></div><button class="place-detail-current" type="button" data-place-panel-current>从我的位置出发</button><a href="${mapLink}" target="_blank" rel="noopener noreferrer">在 Google Maps 中打开 ↗</a>${photoCredit ? `<small class="place-photo-credit">图片：${photoCredit}</small>` : ""}</div>`;
  placeDetailPanel.hidden = false;
  makePlacePanelDraggable();
  placeDetailPanel.querySelector(".place-detail-close")?.addEventListener("click", hidePlacePanel);
  placeDetailPanel.querySelector("[data-place-panel-origin]")?.addEventListener("click", () => {
    if (routeOriginInput) routeOriginInput.value = place.name;
    selectedRouteOrigin = place;
    setNavigationStatus(`已将“${place.name}”设为起点。`);
    hidePlacePanel();
  });
  placeDetailPanel.querySelector("[data-place-panel-destination]")?.addEventListener("click", () => {
    if (routeDestinationInput) routeDestinationInput.value = place.name;
    selectedRouteDestination = place;
    setNavigationStatus(`已将“${place.name}”设为终点。`);
    hidePlacePanel();
  });
  placeDetailPanel.querySelector("[data-place-panel-current]")?.addEventListener("click", () => navigateFromCurrentLocation(place));
};

const distanceBetween = (first, second) => {
  if (!first || !second) return Number.POSITIVE_INFINITY;
  const latitudeScale = 111000;
  const longitudeScale = Math.cos(((first.lat + second.lat) / 2) * Math.PI / 180) * 111000;
  return Math.hypot((first.lat - second.lat) * latitudeScale, (first.lng - second.lng) * longitudeScale);
};

const coordinateOf = (location, axis) => {
  const value = location?.[axis];
  return typeof value === "function" ? value.call(location) : value;
};

const mergePlaceDetails = (...places) => {
  const usable = places.filter(Boolean);
  const preferred = usable.find((place) => Number.isFinite(place.rating) || place.photoName || place.googleMapsUri) || usable[0];
  if (!preferred) throw new Error("未能读取地点资料");
  return usable.reduce((merged, place) => ({
    ...merged,
    ...place,
    name: place.name || merged.name,
    detail: place.detail || merged.detail,
    rating: Number.isFinite(place.rating) ? place.rating : merged.rating,
    userRatingCount: Number.isFinite(place.userRatingCount) ? place.userRatingCount : merged.userRatingCount,
    priceLevel: place.priceLevel || merged.priceLevel,
    priceRange: place.priceRange || merged.priceRange,
    currentOpeningHours: place.currentOpeningHours || merged.currentOpeningHours,
    regularOpeningHours: place.regularOpeningHours || merged.regularOpeningHours,
    primaryTypeDisplayName: place.primaryTypeDisplayName || merged.primaryTypeDisplayName,
    internationalPhoneNumber: place.internationalPhoneNumber || merged.internationalPhoneNumber,
    nationalPhoneNumber: place.nationalPhoneNumber || merged.nationalPhoneNumber,
    websiteUri: place.websiteUri || merged.websiteUri,
    editorialSummary: place.editorialSummary || merged.editorialSummary,
    reviewSummary: place.reviewSummary || merged.reviewSummary,
    reviews: place.reviews || merged.reviews,
    primaryType: place.primaryType || merged.primaryType,
    types: place.types || merged.types,
    accessibilityOptions: place.accessibilityOptions || merged.accessibilityOptions,
    parkingOptions: place.parkingOptions || merged.parkingOptions,
    paymentOptions: place.paymentOptions || merged.paymentOptions,
    goodForChildren: place.goodForChildren ?? merged.goodForChildren,
    allowsDogs: place.allowsDogs ?? merged.allowsDogs,
    restroom: place.restroom ?? merged.restroom,
    reservable: place.reservable ?? merged.reservable,
    outdoorSeating: place.outdoorSeating ?? merged.outdoorSeating,
    liveMusic: place.liveMusic ?? merged.liveMusic,
    dineIn: place.dineIn ?? merged.dineIn,
    takeout: place.takeout ?? merged.takeout,
    delivery: place.delivery ?? merged.delivery,
    photoName: place.photoName || merged.photoName,
    photoAttributions: place.photoAttributions || merged.photoAttributions,
    googleMapsUri: place.googleMapsUri || merged.googleMapsUri,
  }), { ...preferred });
};

const findPlaceByMapsJsId = async (placeId) => {
  if (!window.google?.maps?.importLibrary) throw new Error("Google 地图详情组件尚未就绪");
  const normalizedId = String(placeId).replace(/^places\//, "");
  const { Place } = await window.google.maps.importLibrary("places");
  const place = new Place({ id: normalizedId });
  await place.fetchFields({
    fields: ["displayName", "formattedAddress", "location", "rating", "userRatingCount", "priceLevel", "currentOpeningHours", "googleMapsURI"],
  });
  const lat = coordinateOf(place.location, "lat");
  const lng = coordinateOf(place.location, "lng");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("地点没有可用坐标");
  return {
    name: place.displayName || "地图地点",
    detail: place.formattedAddress || "Google 地图地点",
    category: "Google 地点",
    placeId: normalizedId,
    lat,
    lng,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    priceLevel: place.priceLevel,
    currentOpeningHours: place.currentOpeningHours,
    googleMapsUri: place.googleMapsURI,
  };
};

const resolveGooglePlaceDetails = async (placeId) => {
  const results = await Promise.allSettled([findPlaceByMapsJsId(placeId), findPlaceById(placeId)]);
  const details = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
  if (!details.length) throw new Error("未能读取地点资料");
  return mergePlaceDetails(...details);
};

const enrichMapPlace = async (place) => {
  if (place.placeId) return resolveGooglePlaceDetails(place.placeId);
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location" },
    body: JSON.stringify({
      textQuery: `${place.name}, Trento, Italy`, languageCode: "zh-CN", regionCode: "IT",
      locationBias: { circle: { center: { latitude: place.lat, longitude: place.lng }, radius: 180 } },
    }),
  });
  if (!response.ok) throw new Error("未能匹配 Google 地点资料");
  const candidates = (await response.json()).places || [];
  const nearby = candidates.map((candidate) => ({
    id: candidate.id,
    name: candidate.displayName?.text,
    lat: candidate.location?.latitude,
    lng: candidate.location?.longitude,
  })).filter((candidate) => candidate.id && Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng))
    .sort((a, b) => distanceBetween(place, a) - distanceBetween(place, b))[0];
  if (!nearby || distanceBetween(place, nearby) > 300) throw new Error("未找到同一地点的 Google 资料");
  return resolveGooglePlaceDetails(nearby.id);
};

const openMapPlacePanel = (place) => {
  showPlacePanel(place);
  if (place.type === "transit") return;
  setNavigationStatus(`正在加载“${place.name}”的 Google 地点资料…`);
  enrichMapPlace(place).then((details) => {
    const enrichedPlace = { ...place, ...details, category: place.category || details.category };
    showPlacePanel(enrichedPlace);
    setNavigationStatus(`已加载“${enrichedPlace.name}”的地点资料。`);
  }).catch(() => {
    setNavigationStatus("该地点暂未匹配到 Google 商户资料；基础位置和导航仍可使用。");
  });
};

window.gm_authFailure = () => {
  setNavigationStatus("Google 地图无法验证 · 请检查 API key 的网站限制");
};

window.initGoogleMap = () => {
  if (!journeyMap || !window.google?.maps) return;
  const trentoCenter = { lat: 46.0708, lng: 11.1217 };
  googleMapCenter = trentoCenter;
  routeMap = new window.google.maps.Map(journeyMap, {
    center: trentoCenter,
    zoom: 14,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    gestureHandling: "greedy",
    clickableIcons: true,
  });
  routeMap.addListener("click", async (event) => {
    if (!event.placeId) return;
    event.stop?.();
    try {
      const place = await resolveGooglePlaceDetails(event.placeId);
      showPlacePanel(place);
    } catch {
      setNavigationStatus("该地点资料暂时无法读取；仍可使用 Google 原始地点卡片，或在搜索框中查找。 ");
    }
  });

  journeyMap.querySelector(".map-loading")?.remove();
  const initialRouteId = new URLSearchParams(window.location.search).get("route");
  if (initialRouteId) window.setTimeout(() => navigateItineraryRoute(initialRouteId), 350);
};

const setNavigationStatus = (message) => {
  if (navigationStatus) navigationStatus.textContent = message;
};

const formatRouteDuration = (duration) => {
  const minutes = Math.max(1, Math.round(Number.parseInt(duration, 10) / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分` : `${minutes} 分钟`;
};

const formatRouteDistance = (meters = 0) => meters >= 1000 ? `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km` : `${Math.max(1, Math.round(meters))} m`;

const localizedText = (value, fallback = "") => {
  if (typeof value === "string") return value;
  return value?.text || value?.name || fallback;
};

const cleanInstruction = (instruction) => {
  const value = String(instruction || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return value || "沿路线继续前进";
};

const clearRouteStepMarkers = () => {
  routeStepMarkers.forEach((marker) => marker.setMap(null));
  routeStepMarkers = [];
};

const clearRouteLines = () => {
  currentRouteLines.forEach((line) => line.setMap(null));
  currentRouteLines = [];
  routeAlternativeLines.forEach((line) => line.setMap(null));
  routeAlternativeLines = [];
  routeSummaryLabels.forEach((label) => label.setMap(null));
  routeSummaryLabels = [];
};

const addRouteMapLabel = (position, route, segments) => {
  if (!routeMap || !window.google?.maps?.OverlayView || !position) return;
  class RouteMapLabel extends window.google.maps.OverlayView {
    constructor() {
      super();
      this.position = position;
      this.element = document.createElement("div");
      this.element.className = "route-map-label";
      const transport = segments.find((segment) => segment.type === "transit") || segments[0];
      const summary = transport ? `${transport.label} · ${transport.detail}` : "路线信息待确认";
      this.element.innerHTML = `<b>${escapeHtml(formatRouteDuration(route.duration))}</b><span>${escapeHtml(formatRouteDistance(route.distanceMeters))} · ${escapeHtml(summary)}</span>`;
      this.setMap(routeMap);
    }

    onAdd() {
      this.getPanes()?.floatPane.append(this.element);
    }

    draw() {
      const point = this.getProjection()?.fromLatLngToDivPixel(this.position);
      if (point) this.element.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px) translate(-50%, -115%)`;
    }

    onRemove() {
      this.element.remove();
    }
  }
  const label = new RouteMapLabel();
  routeSummaryLabels.push(label);
};

const addRouteStepMarker = (position, label, title, color) => {
  const coordinate = position?.latLng || position;
  if (!Number.isFinite(coordinate?.latitude) || !Number.isFinite(coordinate?.longitude) || !routeMap || !window.google?.maps) return;
  routeStepMarkers.push(new window.google.maps.Marker({
    position: { lat: coordinate.latitude, lng: coordinate.longitude },
    map: routeMap,
    title,
    label: { text: label, color: "#fff", fontWeight: "700", fontSize: "11px" },
    zIndex: 1000,
    icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2, scale: 14 },
  }));
};

const buildRouteStages = (route) => {
  const steps = route.legs?.flatMap((leg) => leg.steps || []) || [];
  const segments = [];
  if (!steps.length) {
    const mode = currentRouteContext?.travelMode || "WALK";
    const label = { WALK: "步行", DRIVE: "驾车", BICYCLE: "骑行", TRANSIT: "公共交通" }[mode] || "前往";
    return [{ type: mode, label, detail: `${formatRouteDistance(route.distanceMeters || 0)} · ${formatRouteDuration(route.duration || "0s")}`, fallback: true }];
  }
  steps.forEach((step) => {
    const transit = step.transitDetails;
    if (transit) {
      const line = localizedText(transit.transitLine?.nameShort) || localizedText(transit.transitLine?.name) || "公共交通";
      const vehicle = localizedText(transit.transitLine?.vehicle?.name) || transit.transitLine?.vehicle?.type || "公交";
      segments.push({
        type: "transit", label: `${vehicle} ${line}`,
        detail: `${transit.stopCount ? `${transit.stopCount} 站` : "按站点提示"}${step.staticDuration || step.duration ? ` · ${formatRouteDuration(step.staticDuration || step.duration)}` : ""}`,
        transit, line, vehicle, startLocation: step.startLocation, endLocation: step.endLocation,
      });
      return;
    }
    const mode = step.travelMode || "WALK";
    const latest = segments.at(-1);
    if (latest?.type === mode) {
      latest.meters += step.distanceMeters || 0;
      latest.seconds += Number.parseInt(step.staticDuration || step.duration || "0", 10) || 0;
      latest.endLocation = step.endLocation;
    } else {
      segments.push({ type: mode, meters: step.distanceMeters || 0, seconds: Number.parseInt(step.staticDuration || step.duration || "0", 10) || 0, startLocation: step.startLocation, endLocation: step.endLocation });
    }
  });
  return segments.map((segment) => {
    if (segment.type === "transit") return segment;
    const label = { WALK: "步行", DRIVE: "驾车", BICYCLE: "骑行", TRANSIT: "公共交通" }[segment.type] || "前往";
    return { ...segment, label, detail: `${formatRouteDistance(segment.meters)} · ${formatRouteDuration(`${segment.seconds}s`)}` };
  });
};

const renderRouteSteps = (route, origin, destination) => {
  if (!routeSteps) return;
  routeSteps.replaceChildren();
  const stages = buildRouteStages(route);
  const items = [];
  stages.forEach((stage, index) => {
    const item = document.createElement("li");
    const previous = stages[index - 1];
    const next = stages[index + 1];
    if (stage.type === "transit") {
      const departureStop = stage.transit.stopDetails?.departureStop?.name || "上车站";
      const arrivalStop = stage.transit.stopDetails?.arrivalStop?.name || "下车站";
      const headsign = stage.transit.headsign ? `往 ${stage.transit.headsign}` : "按线路提示方向";
      const departureTime = stage.transit.stopDetails?.departureTime ? new Date(stage.transit.stopDetails.departureTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
      const arrivalTime = stage.transit.stopDetails?.arrivalTime ? new Date(stage.transit.stopDetails.arrivalTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
      item.innerHTML = `<b><span>${index + 1}</span>乘坐 ${escapeHtml(stage.label)}<small>${escapeHtml(stage.detail)}</small></b><strong>${escapeHtml(headsign)}</strong><p><em>上车</em> ${escapeHtml(departureStop)}　→　<em>下车</em> ${escapeHtml(arrivalStop)}${departureTime || arrivalTime ? ` · ${departureTime || "--:--"}–${arrivalTime || "--:--"}` : ""}</p>`;
      addRouteStepMarker(stage.startLocation, "上", `${stage.line} · ${departureStop} 上车`, "#e2234d");
      addRouteStepMarker(stage.endLocation, "下", `${stage.line} · ${arrivalStop} 下车`, "#a70f2d");
      items.push(item);
      return;
    }
    const nextStop = next?.type === "transit" ? next.transit.stopDetails?.departureStop?.name : "";
    const previousStop = previous?.type === "transit" ? previous.transit.stopDetails?.arrivalStop?.name : "";
    const destinationLabel = nextStop ? `前往 ${nextStop}` : previousStop ? `从 ${previousStop} 前往目的地` : `前往 ${destination.name}`;
    item.innerHTML = `<b><span>${index + 1}</span>${escapeHtml(stage.label)}<small>${escapeHtml(stage.detail)}</small></b><p>${escapeHtml(destinationLabel)}${stage.type === "WALK" && /airport|机场/i.test(origin.name) && index === 0 ? "（机场内/周边接驳，请以现场指示为准）" : ""}</p>`;
    items.push(item);
  });
  routeSteps.append(...items);
  if (!routeSteps.childElementCount) {
    const item = document.createElement("li");
    item.innerHTML = "<b>路线已绘制</b><p>路线服务这次没有返回出行节点；可切换出行方式后重新查询。</p>";
    routeSteps.append(item);
  }
  routeSteps.hidden = true;
  const rawSteps = route.legs?.flatMap((leg) => leg.steps || []) || [];
  if (rawSteps.length) {
    addRouteStepMarker(rawSteps[0].startLocation, "起", `${origin.name} · 起点`, "#e2234d");
    addRouteStepMarker(rawSteps.at(-1).endLocation, "终", `${destination.name} · 终点`, "#a70f2d");
  }
};

const summarizeRoute = (route) => buildRouteStages(route).map(({ type, label, detail }) => ({ type, label, detail }));

const routeFareText = (route) => {
  const localized = localizedText(route.localizedValues?.transitFare);
  if (localized) return localized;
  const fare = route.travelAdvisory?.transitFare;
  return fare?.currencyCode && fare?.units != null ? `${fare.currencyCode} ${fare.units}` : "票价以运营方为准";
};

const routeFingerprint = (route) => (route.legs?.flatMap((leg) => leg.steps || []) || []).map((step) => {
  const transit = step.transitDetails;
  if (transit) {
    const line = localizedText(transit.transitLine?.nameShort) || localizedText(transit.transitLine?.name) || "transit";
    return `T:${line}:${transit.stopDetails?.departureStop?.name || ""}:${transit.stopDetails?.arrivalStop?.name || ""}:${transit.stopCount || ""}`;
  }
  return `${step.travelMode || "WALK"}:${Math.round((step.distanceMeters || 0) / 50)}`;
}).join("|");

const renderRouteAlternatives = () => {
  if (!routeAlternatives) return;
  routeAlternatives.replaceChildren();
  currentRouteOptions.forEach((route, index) => {
    if (routeDetailsOpen && index !== selectedRouteIndex) return;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `route-option${index === selectedRouteIndex ? " is-selected" : ""}`;
    const segments = summarizeRoute(route);
    const chips = segments.slice(0, 4).map((segment) => `<span class="route-segment--${escapeHtml(segment.type)}">${escapeHtml(segment.label)} · ${escapeHtml(segment.detail)}</span>`).join("");
    const fare = segments.some((segment) => segment.type === "transit") ? routeFareText(route) : "";
    card.innerHTML = `<b>${index === 0 ? "推荐方案" : `方案 ${index + 1}`}<strong>${formatRouteDuration(route.duration)}</strong></b><p>${formatRouteDistance(route.distanceMeters)}${fare ? ` · ${escapeHtml(fare)}` : ""}</p><div>${chips || "路线详情待提供"}</div>`;
    card.addEventListener("click", () => selectRouteOption(index));
    routeAlternatives.append(card);
  });
  routeAlternatives.hidden = currentRouteOptions.length === 0;
};

const drawRouteOptions = () => {
  clearRouteLines();
  const selectedRoute = currentRouteOptions[selectedRouteIndex];
  currentRouteOptions.forEach((route, index) => {
    if (!route.polyline?.encodedPolyline) return;
    const path = window.google.maps.geometry.encoding.decodePath(route.polyline.encodedPolyline);
    const isSelected = index === selectedRouteIndex;
    const rawSteps = route.legs?.flatMap((leg) => leg.steps || []) || [];
    const fallbackMode = rawSteps.some((step) => step.transitDetails) ? "TRANSIT" : (currentRouteContext?.travelMode || "WALK");
    const fallbackStyle = { WALK: "#4285f4", DRIVE: "#1a73e8", BICYCLE: "#f29900", TRANSIT: "#188038" }[fallbackMode] || "#4285f4";
    const hasSegmentPaths = rawSteps.some((step) => step.polyline?.encodedPolyline);
    const polyline = new window.google.maps.Polyline({
      path, geodesic: true, map: routeMap, zIndex: isSelected ? 30 : 15,
      strokeColor: isSelected ? (hasSegmentPaths ? "#9aa0a6" : fallbackStyle) : "#d6d9dc", strokeOpacity: isSelected ? (hasSegmentPaths ? .28 : .88) : .16, strokeWeight: isSelected ? (hasSegmentPaths ? 3 : 5) : 2,
    });
    if (isSelected) currentRouteLines.push(polyline);
    else routeAlternativeLines.push(polyline);

    if (!isSelected) return;
    const modeStyle = {
      WALK: { color: "#4285f4", weight: 4, opacity: .92, dash: true },
      DRIVE: { color: "#1a73e8", weight: 5, opacity: .9 },
      BICYCLE: { color: "#f29900", weight: 4, opacity: .92, dash: true },
      TRANSIT: { color: "#188038", weight: 5, opacity: .92 },
    };
    rawSteps.forEach((step) => {
      const stepPath = step.polyline?.encodedPolyline ? window.google.maps.geometry.encoding.decodePath(step.polyline.encodedPolyline) : [];
      if (!stepPath.length) return;
      const mode = step.transitDetails ? "TRANSIT" : (step.travelMode || "WALK");
      const style = modeStyle[mode] || modeStyle.WALK;
      const segment = new window.google.maps.Polyline({
        path: stepPath, geodesic: true, map: routeMap, zIndex: 35,
        strokeColor: style.color, strokeOpacity: style.opacity, strokeWeight: style.weight,
        icons: style.dash ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: style.color, scale: 3 }, offset: "0", repeat: "11px" }] : [],
      });
      currentRouteLines.push(segment);
    });
  });
  if (selectedRoute?.polyline?.encodedPolyline) {
    const path = window.google.maps.geometry.encoding.decodePath(selectedRoute.polyline.encodedPolyline);
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    routeMap.fitBounds(bounds, 48);
    addRouteMapLabel(path[Math.floor(path.length / 2)], selectedRoute, summarizeRoute(selectedRoute));
  }
};

const selectRouteOption = (index) => {
  if (!currentRouteOptions[index] || !currentRouteContext) return;
  selectedRouteIndex = index;
  routeDetailsOpen = false;
  clearRouteStepMarkers();
  drawRouteOptions();
  renderRouteAlternatives();
  renderRouteSteps(currentRouteOptions[index], currentRouteContext.origin, currentRouteContext.destination);
  if (routeDetailsToggle) {
    routeDetailsToggle.hidden = false;
    routeDetailsToggle.textContent = "查看详细步骤";
  }
};

const requestCurrentLocation = () => new Promise((resolve, reject) => {
  if (currentLocation) return resolve(currentLocation);
  if (!navigator.geolocation) return reject(new Error("此设备不支持定位"));
  setNavigationStatus("正在请求当前位置授权…");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
      currentLocationMarker?.setMap(null);
      currentLocationMarker = new window.google.maps.Marker({
        position: currentLocation, map: routeMap, title: "我的位置",
        label: { text: "我", color: "#fff", fontWeight: "700", fontSize: "11px" },
      });
      if (routeOriginInput) routeOriginInput.value = "我的位置";
      setNavigationStatus("已定位当前位置。点击任一地点即可网页内导航。");
      resolve(currentLocation);
    },
    () => reject(new Error("未取得当前位置；请在浏览器中允许定位权限")),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  );
});

const runEmbeddedRoute = async ({ label, origin, destination, travelMode = "WALK" }) => {
  if (!routeMap || !window.google?.maps?.geometry) throw new Error("地图尚未加载完成");
  setNavigationStatus(`正在查询 ${label} 的最新路线…`);
  clearRouteStepMarkers();
  const routeRequest = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode,
    languageCode: "zh-CN",
    units: "METRIC",
    computeAlternativeRoutes: true,
  };
  // Google only accepts a departure timestamp for transit; driving/walking/cycling
  // requests use traffic-unaware routing and reject that parameter.
  if (travelMode === "TRANSIT") routeRequest.departureTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.startLocation,routes.legs.steps.endLocation,routes.legs.steps.travelMode,routes.legs.steps.polyline.encodedPolyline,routes.legs.steps.transitDetails,routes.travelAdvisory.transitFare,routes.localizedValues",
    },
    body: JSON.stringify(routeRequest),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const serviceMessage = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`路线服务未返回结果：${serviceMessage}`);
  }
  const seenRouteFingerprints = new Set();
  currentRouteOptions = (payload.routes || []).filter((route) => {
    if (!route.polyline?.encodedPolyline) return false;
    const fingerprint = routeFingerprint(route);
    if (seenRouteFingerprints.has(fingerprint)) return false;
    seenRouteFingerprints.add(fingerprint);
    return true;
  }).slice(0, 4);
  if (!currentRouteOptions.length) throw new Error("当前没有可用路线");
  currentRouteContext = { label, origin, destination, travelMode };
  selectedRouteIndex = 0;
  const hasTransitLeg = currentRouteOptions[0].legs?.some((leg) => leg.steps?.some((step) => step.transitDetails));
  const transitNote = travelMode === "TRANSIT" && !hasTransitLeg ? " · 此距离步行更快，未建议乘公交" : "";
  setNavigationStatus(`${label} · 已找到 ${currentRouteOptions.length} 个方案${transitNote}`);
  selectRouteOption(0);
  if (mapClearRoute) mapClearRoute.hidden = false;
};

const navigateFromCurrentLocation = async (destination) => {
  try {
    if (routeOriginInput) routeOriginInput.value = "我的位置";
    if (routeDestinationInput) routeDestinationInput.value = destination.name;
    selectedRouteOrigin = undefined;
    selectedRouteDestination = destination;
    if (routeMode) routeMode.value = "WALK";
    const origin = await requestCurrentLocation();
    await runEmbeddedRoute({ label: `我的位置 → ${destination.name}`, origin, destination });
  } catch (error) {
    setNavigationStatus(error.message || "无法计算路线");
  }
};

const findPlaceByText = async (textQuery) => {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "places.location,places.displayName,places.formattedAddress" },
    body: JSON.stringify({ textQuery, languageCode: "zh-CN" }),
  });
  if (!response.ok) throw new Error("未能查询目的地");
  const place = (await response.json()).places?.[0];
  if (!place?.location) throw new Error("未找到目的地");
  return { name: place.displayName?.text || textQuery, lat: place.location.latitude, lng: place.location.longitude };
};

const findPlaceById = async (placeId) => {
  const normalizedId = String(placeId).replace(/^places\//, "");
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(normalizedId)}?languageCode=zh-CN`, {
    headers: { "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "displayName,formattedAddress,location,types,primaryType,primaryTypeDisplayName,rating,userRatingCount,priceLevel,priceRange,currentOpeningHours,regularOpeningHours,internationalPhoneNumber,nationalPhoneNumber,websiteUri,editorialSummary,reviewSummary,reviews,servesBreakfast,servesBrunch,servesLunch,servesDinner,servesCoffee,servesDessert,servesVegetarianFood,servesWine,accessibilityOptions,parkingOptions,paymentOptions,goodForChildren,allowsDogs,restroom,reservable,outdoorSeating,liveMusic,dineIn,takeout,delivery,photos,googleMapsUri" },
  });
  if (!response.ok) throw new Error("未能读取地点资料");
  const place = await response.json();
  if (!place?.location) throw new Error("地点没有可用坐标");
  return {
    name: place.displayName?.text || "地图地点",
    detail: place.formattedAddress || "Google 地图地点",
    category: "Google 地点",
    placeId: normalizedId,
    lat: place.location.latitude,
    lng: place.location.longitude,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    priceLevel: place.priceLevel,
    priceRange: place.priceRange,
    currentOpeningHours: place.currentOpeningHours,
    regularOpeningHours: place.regularOpeningHours,
    primaryTypeDisplayName: place.primaryTypeDisplayName,
    primaryType: place.primaryType,
    types: place.types,
    internationalPhoneNumber: place.internationalPhoneNumber,
    nationalPhoneNumber: place.nationalPhoneNumber,
    websiteUri: place.websiteUri,
    editorialSummary: place.editorialSummary,
    reviewSummary: place.reviewSummary,
    reviews: place.reviews,
    servesBreakfast: place.servesBreakfast,
    servesBrunch: place.servesBrunch,
    servesLunch: place.servesLunch,
    servesDinner: place.servesDinner,
    servesCoffee: place.servesCoffee,
    servesDessert: place.servesDessert,
    servesVegetarianFood: place.servesVegetarianFood,
    servesWine: place.servesWine,
    accessibilityOptions: place.accessibilityOptions,
    parkingOptions: place.parkingOptions,
    paymentOptions: place.paymentOptions,
    goodForChildren: place.goodForChildren,
    allowsDogs: place.allowsDogs,
    restroom: place.restroom,
    reservable: place.reservable,
    outdoorSeating: place.outdoorSeating,
    liveMusic: place.liveMusic,
    dineIn: place.dineIn,
    takeout: place.takeout,
    delivery: place.delivery,
    photoName: place.photos?.[0]?.name,
    photoAttributions: place.photos?.[0]?.authorAttributions,
    googleMapsUri: place.googleMapsUri,
  };
};

const searchPlaceSuggestions = async (input) => {
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY },
    body: JSON.stringify({ input, languageCode: "zh-CN", regionCode: "IT" }),
  });
  if (!response.ok) throw new Error("地点联想暂时不可用");
  return (await response.json()).suggestions || [];
};

const setupAutocomplete = (input, panel, endpoint) => {
  if (!input || !panel) return;
  let timer;
  let requestId = 0;
  const hide = () => { panel.hidden = true; panel.replaceChildren(); };
  const show = (suggestions) => {
    panel.replaceChildren();
    suggestions.slice(0, 5).forEach((suggestion) => {
      const prediction = suggestion.placePrediction;
      if (!prediction?.text?.text) return;
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "option");
      button.innerHTML = `<strong>${escapeHtml(prediction.text.text)}</strong>${prediction.structuredFormat?.secondaryText?.text ? `<small>${escapeHtml(prediction.structuredFormat.secondaryText.text)}</small>` : ""}`;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        input.value = prediction.text.text;
        const placeId = prediction.placeId || String(prediction.place || "").replace(/^places\//, "");
        if (endpoint === "origin") selectedRouteOrigin = { name: prediction.text.text, placeId };
        else selectedRouteDestination = { name: prediction.text.text, placeId };
        hide();
      });
      panel.append(button);
    });
    panel.hidden = panel.childElementCount === 0;
  };
  input.addEventListener("input", () => {
    if (endpoint === "origin") selectedRouteOrigin = undefined;
    else selectedRouteDestination = undefined;
    window.clearTimeout(timer);
    const value = input.value.trim();
    if (value.length < 2 || value === "我的位置") return hide();
    const currentRequest = ++requestId;
    timer = window.setTimeout(async () => {
      try {
        const suggestions = await searchPlaceSuggestions(value);
        if (currentRequest === requestId) show(suggestions);
      } catch {
        if (currentRequest === requestId) hide();
      }
    }, 260);
  });
  input.addEventListener("blur", () => window.setTimeout(hide, 160));
  input.addEventListener("keydown", (event) => { if (event.key === "Escape") hide(); });
};

setupAutocomplete(routeOriginInput, routeOriginSuggestions, "origin");
setupAutocomplete(routeDestinationInput, routeDestinationSuggestions, "destination");

const routePointFor = async (input, fallbackToLocation = false, selectedPlace) => {
  const query = input.trim();
  if (!query && fallbackToLocation) return requestCurrentLocation();
  if (query === "我的位置") return requestCurrentLocation();
  if (!query) throw new Error("请填写终点");
  if (selectedPlace && selectedPlace.name === query) {
    if (Number.isFinite(selectedPlace.lat) && Number.isFinite(selectedPlace.lng)) return selectedPlace;
    if (selectedPlace.placeId) return findPlaceById(selectedPlace.placeId);
  }
  return findPlaceByText(query);
};

mapNavigation?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const origin = await routePointFor(routeOriginInput?.value || "", true, selectedRouteOrigin);
    const destination = await routePointFor(routeDestinationInput?.value || "", false, selectedRouteDestination);
    const originLabel = routeOriginInput?.value.trim() || "我的位置";
    const destinationLabel = routeDestinationInput?.value.trim() || destination.name;
    await runEmbeddedRoute({ label: `${originLabel} → ${destinationLabel}`, origin, destination, travelMode: routeMode?.value || "WALK" });
  } catch (error) {
    setNavigationStatus(error.message || "无法计算路线");
  }
});

routeSwap?.addEventListener("click", () => {
  if (!routeOriginInput || !routeDestinationInput) return;
  [routeOriginInput.value, routeDestinationInput.value] = [routeDestinationInput.value, routeOriginInput.value];
  [selectedRouteOrigin, selectedRouteDestination] = [selectedRouteDestination, selectedRouteOrigin];
  setNavigationStatus("已互换起点和终点，点击“查询路线”即可更新。");
});

const navigateItineraryRoute = async (routeId) => {
  const route = itineraryRoutes[routeId];
  if (!route) return;
  if (!journeyMap) {
    window.location.href = `./map.html?route=${encodeURIComponent(routeId)}`;
    return;
  }
  try {
    if (routeOriginInput) routeOriginInput.value = route.origin.name;
    if (routeDestinationInput) routeDestinationInput.value = route.destinationQuery;
    selectedRouteOrigin = route.origin;
    selectedRouteDestination = undefined;
    if (routeMode) routeMode.value = route.travelMode;
    const destination = await findPlaceByText(route.destinationQuery);
    await runEmbeddedRoute({ label: route.label, origin: route.origin, destination, travelMode: route.travelMode });
  } catch (error) {
    setNavigationStatus(`${error.message || "无法计算路线"}；可使用备用 Google Maps 导航。`);
  }
};

mapUseLocation?.addEventListener("click", () => requestCurrentLocation().catch((error) => setNavigationStatus(error.message)));
routeDetailsToggle?.addEventListener("click", () => {
  if (!routeSteps) return;
  routeDetailsOpen = !routeDetailsOpen;
  routeSteps.hidden = !routeDetailsOpen;
  renderRouteAlternatives();
  routeDetailsToggle.textContent = routeDetailsOpen ? "返回全部方案" : "查看详细步骤";
});
mapClearRoute?.addEventListener("click", () => {
  clearRouteLines();
  clearRouteStepMarkers();
  currentRouteOptions = [];
  currentRouteContext = undefined;
  routeDetailsOpen = false;
  if (routeAlternatives) {
    routeAlternatives.hidden = true;
    routeAlternatives.replaceChildren();
  }
  if (routeDetailsToggle) routeDetailsToggle.hidden = true;
  mapClearRoute.hidden = true;
  if (routeSteps) {
    routeSteps.hidden = true;
    routeSteps.replaceChildren();
  }
  setNavigationStatus("路线已清除。选择地点后可重新导航。");
});

if (mapFullscreen && journeyMapFrame) {
  const journeyMapWrap = journeyMapFrame.closest(".journey-map-wrap");
  const setMapExpanded = (isExpanded) => {
    if (placeDetailPanel) {
      placeDetailPanel.style.removeProperty("top");
      placeDetailPanel.style.removeProperty("right");
      placeDetailPanel.style.removeProperty("bottom");
      placeDetailPanel.style.removeProperty("left");
    }
    journeyMapFrame.classList.toggle("is-expanded", isExpanded);
    journeyMapWrap?.classList.toggle("is-map-expanded", isExpanded);
    document.body.classList.toggle("map-expanded", isExpanded);
    mapFullscreen.textContent = isExpanded ? "收起地图" : "展开地图";
    if (routeMap && window.google?.maps) window.setTimeout(() => {
      window.google.maps.event.trigger(routeMap, "resize");
      if (googleMapCenter) routeMap.setCenter(googleMapCenter);
    }, 120);
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
          ["上海出发", "20:50 · PVG（北京时间）"],
          ["出发机场", "上海浦东 PVG · T2"],
          ["赫尔辛基抵达", "09/07 05:55 · HEL 当地"],
          ["北京时间", "09/07 10:55"],
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
    status: "维罗纳抵达日 · 已确认",
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
        type: "已确认直飞航段",
        title: "AY1803",
        suffix: "Finnair",
        rows: [
          ["出发（当地）", "16:20 · HEL UTC+3"],
          ["出发（北京时间）", "21:20"],
          ["抵达（当地）", "18:15 · VRN UTC+2"],
          ["抵达（北京时间）", "09/08 00:15"],
          ["计划机型", "Airbus A320"],
        ],
        note: "赫尔辛基当地下午出发；抵达后按机场当日行李、边检与登机口信息执行。",
      },
      {
        type: "机场 → 酒店",
        title: "Airlink 199",
        suffix: "至 Porta Nuova",
        rows: [
          ["航班抵达", "18:15 · VRN 当地时间"],
          ["接驳", "Airlink 199 → Verona Porta Nuova"],
          ["运营窗口", "05:35–23:10 · 约每 20 分钟"],
          ["机场至车站", "约 15 分钟"],
        ],
        note: "取行李后直接在到达层外乘车；即使约 19:00 才出机场，距末班仍有余量。出租车位于到达层外，可作延误备选。",
        routeId: "verona-airport-hotel",
        mapLink: "https://www.google.com/maps/dir/?api=1&origin=Verona+Villafranca+Airport&destination=Porta+Nuova+Suites%2C+Verona&travelmode=transit",
        mapLabel: "Google Maps 导航",
      },
      {
        type: "维罗纳过夜",
        title: "Porta Nuova Suites",
        suffix: "已确认",
        rows: [
          ["入住", "9/7 晚 · 以酒店确认信息为准"],
          ["所在区域", "Case Ferrovieri / Porta Nuova"],
          ["车站步行", "约 5 分钟"],
          ["次日目标", "10:10 前离开酒店前往车站"],
        ],
        note: "酒店在 Porta Nuova 火车站附近，抵达车站后优先步行入住；无需再安排晚间市内公交。",
      },
    ],
    sources: ["Verona Airport 官方 Airlink 199 时刻说明", "https://www.aeroportoverona.it/it_it/assistenza/faqs-trasporti-da-per-aeroporto"],
  },
  "2026-09-08": {
    date: "9 月 8 日 · 周二",
    status: "火车信息待补充",
    cards: [
      {
        type: "已确认火车",
        title: "Italo · 直达",
        suffix: "54 分钟",
        rows: [
          ["出发站", "Verona Porta Nuova"],
          ["到达站", "Trento"],
          ["出发", "10:50 · 当地时间"],
          ["抵达", "11:44 · 当地时间"],
          ["建议到站", "10:25 前到站台区"],
        ],
        note: "火车为直达；酒店距车站约 5 分钟步行，建议 10:10 离开酒店，留出找站台和行李缓冲。",
      },
      {
        type: "到达特伦托",
        title: "Trento Stazione FS",
        suffix: "11:44 抵达",
        rows: [
          ["站前位置", "Piazza Dante / Stazione FS"],
          ["前往校区", "Povo / Mesiano · 公交 5 路"],
          ["夏季班次", "12:29、12:59（9/8 有效）"],
          ["中心校区", "步行约 10–15 分钟"],
        ],
        note: "9/8 是周二，5 路夏季表有效至 9/9。最终上哪一站取决于学院校区；确认院系/宿舍后，再补最短路线和下车站。",
      },
      {
        type: "学校 / 宿舍接驳",
        title: "待确认终点",
        suffix: "下一步补充",
        rows: [
          ["学校校区", "待确认（中心 / Mesiano / Povo）"],
          ["学生公寓", "待分配"],
          ["推荐策略", "先从 Trento 站出发，再按终点选步行或 5 路"],
        ],
        note: "拿到学院或宿舍名称后，这张卡会补成具体公交站、车次、步行时间和晚间备选。",
      },
    ],
    sources: ["Trentino Trasporti · 5 路夏季 2026 时刻", "https://www.trentinotrasporti.it/pdforari/urbani/fermate/OrariDiFermataConPercorso-T26E-20125p-T-05_A.PDF"],
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
      ${card.routeId ? `<button class="transport-action" type="button" data-itinerary-route="${card.routeId}">网页内导航 <span aria-hidden="true">↗</span></button>` : ""}
      ${card.mapLink ? `<a class="transport-action transport-action-secondary" href="${card.mapLink}" target="_blank" rel="noopener noreferrer" aria-label="在 Google Maps 中导航：维罗纳机场至 Porta Nuova Suites">${card.mapLabel} <span aria-hidden="true">↗</span></a>` : ""}
    </article>`).join("")}</div>
    <p class="itinerary-sources">资料参考：<a href="${selected.sources[1]}" target="_blank" rel="noopener noreferrer">${selected.sources[0]}</a></p>`;
};

itineraryContent?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-itinerary-route]");
  if (button) navigateItineraryRoute(button.dataset.itineraryRoute);
});

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
