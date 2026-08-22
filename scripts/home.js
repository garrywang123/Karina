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
  const symbols = ["♥", "♡", "୨୧", "✦"];

  for (let index = 0; index < 22; index += 1) {
    const heart = document.createElement("i");
    heart.textContent = symbols[index % symbols.length];
    heart.style.setProperty("--x", `${5 + ((index * 29) % 90)}%`);
    heart.style.setProperty("--delay", `${(index % 7) * 0.07}s`);
    heart.style.fontSize = `${17 + (index % 4) * 5}px`;
    rain.appendChild(heart);
  }

  button.querySelector("span").textContent = "Karina，今天也超可爱！";
  window.setTimeout(() => rain.replaceChildren(), 2300);
});
