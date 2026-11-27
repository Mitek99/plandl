import { resolvePlan } from "@plandl/core";
import { parsePlan } from "@plandl/parser";
import { renderSvg } from "@plandl/renderer";
import { gridPreference, setGridPreference } from "./grid-preference.js";

// Renders every <figure class="plandl-view" data-source="..."> on the page in the browser,
// with a "Grid lines" checkbox. The checkboxes stay in sync and the choice is remembered.

const views = [...document.querySelectorAll<HTMLElement>(".plandl-view[data-source]")];
const toggles = views
  .map((view) => view.querySelector<HTMLInputElement>(".plandl-grid-toggle"))
  .filter((toggle): toggle is HTMLInputElement => toggle !== null);

function render(view: HTMLElement, index: number, grid: boolean): void {
  const canvas = view.querySelector<HTMLElement>(".plandl-view-canvas");
  if (!canvas) return;
  const parsed = parsePlan(view.dataset.source ?? "");
  const plan = resolvePlan(parsed.document, parsed.diagnostics);
  const errors = plan.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (errors.length > 0) {
    const message = document.createElement("p");
    message.className = "plandl-view-error";
    message.textContent = errors
      .map((diagnostic) => `${diagnostic.location ? `${diagnostic.location.line}:${diagnostic.location.column} ` : ""}${diagnostic.code} ${diagnostic.message}`)
      .join("\n");
    canvas.replaceChildren(message);
    return;
  }
  canvas.innerHTML = renderSvg(plan, { grid });
  // Several plans share a page: give each SVG title a unique id and the figure's description.
  const svg = canvas.querySelector("svg");
  const title = svg?.querySelector("title");
  if (svg && title) {
    title.id = `plandl-view-title-${index}`;
    title.textContent = view.dataset.alt || "PlanDL floor plan";
    svg.setAttribute("aria-labelledby", title.id);
  }
}

function renderAll(grid: boolean): void {
  views.forEach((view, index) => render(view, index, grid));
  for (const toggle of toggles) toggle.checked = grid;
}

for (const toggle of toggles) {
  toggle.closest<HTMLElement>(".plandl-view-controls")?.removeAttribute("hidden");
  toggle.addEventListener("change", () => {
    setGridPreference(toggle.checked);
    renderAll(toggle.checked);
  });
}

renderAll(gridPreference());
