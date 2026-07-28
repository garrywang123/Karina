const today = document.querySelector("#today");
const year = document.querySelector("#year");
const button = document.querySelector("#loveButton");
const rain = document.querySelector("#heartRain");

today.textContent = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
year.textContent = new Date().getFullYear();

button.addEventListener("click", () => {
  rain.replaceChildren();
  for (let index = 0; index < 18; index += 1) {
    const heart = document.createElement("i");
    heart.textContent = "♥";
    heart.style.setProperty("--x", `${8 + ((index * 29) % 86)}%`);
    heart.style.setProperty("--delay", `${(index % 6) * 0.07}s`);
    heart.style.fontSize = `${16 + (index % 4) * 5}px`;
    rain.appendChild(heart);
  }
  button.querySelector("span").textContent = "Karina，今天也要开心";
  window.setTimeout(() => rain.replaceChildren(), 2200);
});
