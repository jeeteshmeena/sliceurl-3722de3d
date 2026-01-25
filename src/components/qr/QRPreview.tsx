import { useMemo, memo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QRDesign } from "@/hooks/useQRDesign";

interface QRPreviewProps {
  url: string;
  design: QRDesign;
  size?: number;
  showFrame?: boolean;
}

const frameLabels: Record<string, string> = {
  scan_me: "SCAN ME",
  pay_here: "PAY HERE",
  join_now: "JOIN NOW",
  visit_us: "VISIT US",
  follow: "FOLLOW",
  download: "DOWNLOAD",
  learn_more: "LEARN MORE",
  shop_now: "SHOP NOW",
  order_now: "ORDER NOW",
  get_started: "GET STARTED",
};

export const QRPreview = memo(function QRPreview({ 
  url, 
  design, 
  size = 280, 
  showFrame = true 
}: QRPreviewProps) {
  // Stable gradient ID
  const gradientId = useMemo(() => `qr-gradient-${design.link_id}`, [design.link_id]);

  // Memoized corner radius calculation
  const cornerRadius = useMemo(() => {
    switch (design.shape) {
      case "rounded":
        return Math.min(design.corner_radius, 10);
      case "dots":
        return 50;
      case "mosaic":
        return 2;
      default:
        return 0;
    }
  }, [design.shape, design.corner_radius]);

  // Memoized frame text
  const frameText = useMemo(() => {
    return design.frame_text || (design.frame_type ? frameLabels[design.frame_type] : null);
  }, [design.frame_text, design.frame_type]);

  // Memoized image settings
  const imageSettings = useMemo(() => {
    if (!design.logo_url) return undefined;
    return {
      src: design.logo_url,
      height: (size * design.logo_size) / 100,
      width: (size * design.logo_size) / 100,
      excavate: true,
    };
  }, [design.logo_url, design.logo_size, size]);

  // Memoized QR foreground color
  const fgColor = useMemo(() => {
    return design.gradient_enabled ? `url(#${gradientId})` : design.fg_color;
  }, [design.gradient_enabled, design.fg_color, gradientId]);

  return (
    <div 
      className="relative flex flex-col items-center"
      data-qr-preview
    >
      {/* QR Container */}
      <div
        className="relative rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: design.bg_color,
          padding: design.padding,
        }}
      >
        {/* Gradient Definition - Only render when gradient enabled */}
        {design.gradient_enabled && (
          <svg width="0" height="0" className="absolute" aria-hidden="true">
            <defs>
              {design.gradient_type === "linear" ? (
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={design.gradient_start} />
                  <stop offset="100%" stopColor={design.gradient_end} />
                </linearGradient>
              ) : (
                <radialGradient id={gradientId} cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor={design.gradient_start} />
                  <stop offset="100%" stopColor={design.gradient_end} />
                </radialGradient>
              )}
            </defs>
          </svg>
        )}

        {/* QR Code */}
        <QRCodeSVG
          value={url}
          size={size}
          level="H"
          fgColor={design.gradient_enabled ? design.gradient_start : design.fg_color}
          bgColor={design.bg_color}
          style={{
            borderRadius: cornerRadius,
            display: "block",
          }}
          imageSettings={imageSettings}
        />
      </div>

      {/* Frame Label - BELOW QR */}
      {showFrame && frameText && (
        <div
          className="mt-4 flex flex-col items-center gap-1"
          data-qr-frame
        >
          {/* Arrow pointing up to QR */}
          <div
            className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[6px]"
            style={{ borderBottomColor: design.fg_color }}
          />
          {/* Label pill */}
          <div
            className="px-5 py-1.5 rounded-full font-bold text-[10px] tracking-widest uppercase shadow-lg"
            style={{
              backgroundColor: design.fg_color,
              color: design.bg_color,
            }}
          >
            {frameText}
          </div>
        </div>
      )}
    </div>
  );
});
