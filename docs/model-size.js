export const MODEL_WIDTH_M = 11.4;
export const MODEL_HEIGHT_M = 9.9;
export const MAX_HEIGHT_CM = 30;
export const DEFAULT_WIDTH_CM = 30;
// Round down so the largest selectable upright height never exceeds 30 cm.
export const MAX_WIDTH_CM = Math.floor(MAX_HEIGHT_CM*MODEL_WIDTH_M/MODEL_HEIGHT_M*10)/10;
export function clampWidthCm(value) {return Math.min(MAX_WIDTH_CM,Math.max(5,Number.isFinite(value)?value:DEFAULT_WIDTH_CM));}
export function clampMarkerWidthCm(value) {return Math.min(100,Math.max(5,Number.isFinite(value)?value:15));}
export function heightFromWidthCm(value) {return clampWidthCm(value)*MODEL_HEIGHT_M/MODEL_WIDTH_M;}
export function floorScaleFromWidthCm(value) {return clampWidthCm(value)/100/MODEL_WIDTH_M;}
export function markerScaleFromWidthCm(value,markerWidth) {return clampWidthCm(value)/(MODEL_WIDTH_M*clampMarkerWidthCm(markerWidth));}
