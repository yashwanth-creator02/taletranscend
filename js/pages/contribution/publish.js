import { state } from "./state.js";

export function publishFullTale() {
  console.log("Publishing tale:", state.chapters);
  alert("Publish flow coming next 🚀");
}
