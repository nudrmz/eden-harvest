import "server-only";
import QRCode from "qrcode";
import { QR_LOGO_DATA_URI } from "./qr-logo";

/**
 * QR code as SVG with the Eden Harvest logo in the middle. Error correction
 * "H" tolerates ~30% of the code being covered, so the logo (about 22% of the
 * width, ~5% of the area) never stops it scanning.
 */
export async function campaignQrSvg(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    color: { dark: "#0f1f0f", light: "#ffffff" }
  });

  const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  const size = viewBox ? Number(viewBox[1]) : 0;
  if (!size) return svg;

  const logo = size * 0.22;
  const pad = logo * 0.12;
  const at = (size - logo) / 2;
  const badge =
    `<circle cx="${size / 2}" cy="${size / 2}" r="${logo / 2 + pad}" fill="#ffffff"/>` +
    `<image href="${QR_LOGO_DATA_URI}" x="${at}" y="${at}" width="${logo}" height="${logo}"/>`;

  return svg.replace("</svg>", `${badge}</svg>`);
}
