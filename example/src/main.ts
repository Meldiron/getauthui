import { AuthUI } from "@getauthui/core";

const log = document.getElementById("log")!;
const write = (line: string) => {
  log.textContent = `${new Date().toLocaleTimeString()}  ${line}\n${log.textContent ?? ""}`;
};

AuthUI.on("change", (s) =>
  write(`change → ${s.status}${s.user ? ` (${s.user.email || s.user.$id})` : ""}`)
);
AuthUI.on("signed-in", (u) => write(`signed-in → ${u.$id}`));
AuthUI.on("signed-out", () => write("signed-out"));
AuthUI.on("error", (e) => write(`error → ${e.type || e.code}: ${e.message}`));

document.getElementById("theme")!.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});
