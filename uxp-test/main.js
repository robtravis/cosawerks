const out = document.getElementById("out");
const log = (s) => { out.textContent += "\n" + s; };
const show = (s) => { out.textContent = s; };

document.getElementById("spbtn").addEventListener("click", () => log("sp-button click works"));
document.getElementById("spact").addEventListener("click", () => log("sp-action-button click works"));

document.getElementById("probe").addEventListener("click", () => {
  show("Probing...");
  try {
    const uxp = require("uxp");
    log("uxp modules: " + Object.keys(uxp).join(", "));
    const ae = uxp.dvaaescripting;
    if (!ae) { log("NO uxp.dvaaescripting"); return; }
    log("dvaaescripting keys: " + Object.keys(ae).join(", "));
    const app = ae.Application;
    log("Application: " + typeof app + (app ? " keys: " + Object.keys(app).slice(0, 25).join(", ") : ""));
    const project = app && app.project;
    log("project: " + typeof project);
    if (project) {
      log("numItems: " + project.numItems);
      log("file: " + (project.file ? project.file.fsName : "(unsaved)"));
      const active = project.activeItem;
      log("activeItem: " + (active ? active.name + " (" + active.typeName + ")" : "none"));
      if (active && active.numLayers !== undefined) log("layers: " + active.numLayers);
    }
  } catch (e) {
    log("ERROR: " + e + (e && e.stack ? "\n" + e.stack : ""));
  }
});
