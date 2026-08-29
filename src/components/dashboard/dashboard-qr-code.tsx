import QRCode from "qrcode";
import { useEffect, useState } from "react";

type DashboardQrCodeProps = {
  url?: string;
  label: string;
  alt: string;
  sizeClassName?: string;
  containerClassName?: string;
};

export const DashboardQrCode = ({
  url,
  label,
  alt,
  sizeClassName = "h-28 w-28",
  containerClassName = "flex flex-col items-center gap-2 rounded-2xl border border-[#d6c4a4] bg-[#fffaf0] p-3 text-center",
}: DashboardQrCodeProps) => {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;

    const generate = async () => {
      if (!url) {
        setSrc("");
        return;
      }

      try {
        const nextSrc = await QRCode.toDataURL(url, {
          width: 160,
          margin: 1,
          color: {
            dark: "#0f2747",
            light: "#f9f3e7",
          },
        });

        if (active) {
          setSrc(nextSrc);
        }
      } catch {
        if (active) {
          setSrc("");
        }
      }
    };

    void generate();

    return () => {
      active = false;
    };
  }, [url]);

  if (!url || !src) {
    return null;
  }

  return (
    <div className={containerClassName}>
      <img alt={alt} className={`${sizeClassName} rounded-xl`} src={src} />
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[#8d6a2f]">{label}</p>
    </div>
  );
};
