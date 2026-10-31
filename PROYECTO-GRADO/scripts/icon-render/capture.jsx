import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Mascota from "../../src/Mascota.jsx";
import "./capture.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Mascota variante="icon-capture" />
  </StrictMode>,
);
