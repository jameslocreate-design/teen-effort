import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { signedUrlMap } from "@/lib/storage";
import { format, parseISO } from "date-fns";

interface Entry {
  id: string;
  date: string;
  title: string;
  description: string | null;
  estimated_cost: string | null;
  user_rating: number | null;
  is_favorite: boolean;
  vibe: string | null;
  photo_urls: string[] | null;
}

const CREAM = [253, 251, 247] as const;
const INK = [27, 27, 47] as const;
const ROSE = [196, 112, 139] as const;
const MUTED = [120, 116, 130] as const;

const costToNumber = (cost: string | null): number => {
  if (!cost) return 0;
  const m = cost.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
};

/** Load an image URL and crop it to a centered square JPEG data URL. */
async function loadSquare(url: string, size = 480): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const side = Math.min(bitmap.width, bitmap.height);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    URL.revokeObjectURL(bitmap.src);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}

export interface MemoryBookOptions {
  partnerLinkId: string;
  myName: string;
  partnerName: string;
  linkedSince?: string | null;
}

/**
 * Builds a keepsake PDF of a couple's shared dates: stats, timeline and photos.
 * Must be called while the partner link still exists (data is readable).
 */
export async function generateMemoryBook({
  partnerLinkId,
  myName,
  partnerName,
  linkedSince,
}: MemoryBookOptions): Promise<boolean> {
  const { data } = await supabase
    .from("calendar_entries")
    .select("id, date, title, description, estimated_cost, user_rating, is_favorite, vibe, photo_urls")
    .eq("partner_link_id", partnerLinkId)
    .order("date", { ascending: true });

  const entries = (data ?? []) as Entry[];

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = 0;

  const paint = () => {
    doc.setFillColor(...CREAM);
    doc.rect(0, 0, W, H, "F");
  };
  const newPage = () => {
    doc.addPage();
    paint();
    y = M + 12;
  };
  const room = (needed: number) => {
    if (y + needed > H - M) newPage();
  };
  const heading = (text: string) => {
    room(60);
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...INK);
    doc.text(text, M, y);
    y += 10;
    doc.setDrawColor(...ROSE);
    doc.setLineWidth(1.2);
    doc.line(M, y, M + 60, y);
    y += 22;
  };

  // ---- Cover ----
  paint();
  doc.setDrawColor(...ROSE);
  doc.setLineWidth(1);
  doc.rect(M / 1.6, M / 1.6, W - (M / 1.6) * 2, H - (M / 1.6) * 2);
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(...ROSE);
  doc.text("A keepsake of our time together", W / 2, H / 2 - 96, { align: "center" });
  doc.setFont("times", "bold");
  doc.setFontSize(34);
  doc.setTextColor(...INK);
  doc.text(`${myName} & ${partnerName}`, W / 2, H / 2 - 42, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  const span = [
    linkedSince ? `Together on here since ${format(new Date(linkedSince), "MMMM d, yyyy")}` : null,
    `${entries.length} date${entries.length === 1 ? "" : "s"} shared`,
  ].filter(Boolean) as string[];
  span.forEach((line, i) => doc.text(line, W / 2, H / 2 + (i === 0 ? -6 : 12), { align: "center" }));

  // ---- Stats ----
  newPage();
  heading("Our Date Stats");

  const rated = entries.filter((e) => e.user_rating);
  const avg = rated.length
    ? (rated.reduce((s, e) => s + (e.user_rating || 0), 0) / rated.length).toFixed(1)
    : "—";
  const favorites = entries.filter((e) => e.is_favorite).length;
  const spent = entries.reduce((s, e) => s + costToNumber(e.estimated_cost), 0);
  const withPhotos = entries.filter((e) => e.photo_urls && e.photo_urls.length > 0);
  const photoCount = withPhotos.reduce((s, e) => s + (e.photo_urls?.length || 0), 0);

  const cards: [string, string][] = [
    ["Dates together", String(entries.length)],
    ["Average rating", avg === "—" ? "—" : `${avg} / 5`],
    ["Favorite dates", String(favorites)],
    ["Estimated spent", `$${spent}`],
    ["Photos saved", String(photoCount)],
    ["Dates with photos", String(withPhotos.length)],
  ];

  const cw = (W - M * 2 - 16) / 2;
  cards.forEach(([label, value], i) => {
    const col = i % 2;
    if (col === 0) room(74);
    const x = M + col * (cw + 16);
    const top = y;
    doc.setDrawColor(232, 226, 234);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, top, cw, 62, 8, 8, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 14, top + 22);
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...INK);
    doc.text(value, x + 14, top + 48);
    if (col === 1 || i === cards.length - 1) y += 78;
  });

  // Top vibes
  const vibeMap: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.vibe) vibeMap[e.vibe] = (vibeMap[e.vibe] || 0) + 1;
  });
  const vibes = Object.entries(vibeMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (vibes.length) {
    y += 10;
    heading("Our Favorite Vibes");
    const max = vibes[0][1];
    vibes.forEach(([vibe, count]) => {
      room(28);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(vibe, M, y + 10);
      const barX = M + 170;
      const barW = W - M - 40 - barX;
      doc.setFillColor(238, 232, 238);
      doc.roundedRect(barX, y + 2, barW, 9, 4, 4, "F");
      doc.setFillColor(...ROSE);
      doc.roundedRect(barX, y + 2, Math.max(6, (count / max) * barW), 9, 4, 4, "F");
      doc.setTextColor(...MUTED);
      doc.setFontSize(10);
      doc.text(String(count), W - M - 24, y + 10);
      y += 24;
    });
  }

  // ---- Timeline ----
  if (entries.length) {
    newPage();
    heading("Every Date We Shared");
    entries.forEach((e) => {
      room(52);
      doc.setFillColor(...ROSE);
      doc.circle(M + 3, y + 4, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      const title = e.is_favorite ? `${e.title}  (favorite)` : e.title;
      const titleLines = doc.splitTextToSize(title, W - M * 2 - 90);
      doc.text(titleLines, M + 16, y + 8);
      y += titleLines.length * 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED);
      const meta = [
        format(parseISO(e.date), "MMM d, yyyy"),
        e.vibe || null,
        e.estimated_cost || null,
        e.user_rating ? `${e.user_rating}/5` : null,
      ]
        .filter(Boolean)
        .join("  ·  ");
      doc.text(meta, M + 16, y + 6);
      y += 16;
      if (e.description) {
        const lines = doc.splitTextToSize(`"${e.description}"`, W - M * 2 - 30);
        room(lines.length * 12 + 8);
        doc.setFont("times", "italic");
        doc.setFontSize(10);
        doc.setTextColor(...MUTED);
        doc.text(lines.slice(0, 4), M + 16, y + 6);
        y += Math.min(lines.length, 4) * 12 + 4;
      }
      y += 12;
    });
  }

  // ---- Photo journal ----
  if (withPhotos.length) {
    const allPaths = withPhotos.flatMap((e) => e.photo_urls ?? []);
    const urlMap = await signedUrlMap("date-photos", allPaths, 600);

    newPage();
    heading("Photo Journal");

    for (const memory of withPhotos) {
      const paths = memory.photo_urls ?? [];
      const images = (
        await Promise.all(
          paths.map((p) => (urlMap[p] ? loadSquare(urlMap[p]) : Promise.resolve(null))),
        )
      ).filter(Boolean) as string[];
      if (!images.length) continue;

      const cellW = (W - M * 2 - 24) / 3;
      const rows = Math.ceil(images.length / 3);
      room(34 + rows * (cellW + 12));

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(memory.title, M, y + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(format(parseISO(memory.date), "MMMM d, yyyy"), W - M, y + 8, { align: "right" });
      y += 20;

      images.forEach((img, i) => {
        const col = i % 3;
        if (col === 0 && i > 0) y += cellW + 12;
        try {
          doc.addImage(img, "JPEG", M + col * (cellW + 12), y, cellW, cellW);
        } catch {
          /* skip unreadable photo */
        }
      });
      y += cellW + 22;
    }
  }

  // Footer note
  room(40);
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...ROSE);
  doc.text("Thank you for the memories.", W / 2, H - M, { align: "center" });

  const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  doc.save(`memory-book-${safe(myName)}-and-${safe(partnerName)}.pdf`);
  return true;
}
