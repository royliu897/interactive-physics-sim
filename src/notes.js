// The "About the simulation" dialog. Opening it pauses the scene.

import { state } from "./state.js";
import { setPaused } from "./ui.js";

export function attachNotes() {
  const simulationNotes = document.getElementById("simulationNotes");
  let pausedBeforeNotes = false;
  document.getElementById("aboutSimulation").addEventListener("click", () => {
    pausedBeforeNotes = state.paused;
    setPaused(true);
    simulationNotes.showModal();
  });
  simulationNotes.addEventListener("close", () => setPaused(pausedBeforeNotes));
}
