import type { CartridgeId } from "./catalog";

export const cartridgeLabelUrl = (id: CartridgeId) => `/cartridges/${id}.svg`;
export const cartridgeLabelMarkup = (id: CartridgeId) =>
  `<span class="cartridge-label"><img src="${cartridgeLabelUrl(id)}" alt="" draggable="false" width="640" height="480" /></span>`;
