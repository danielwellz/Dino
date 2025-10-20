"use client";

import Image, { ImageProps } from "next/image";
import { assets } from "@/app/assets/assets";

const sizeMap = {
  xs: { width: 24, height: 34 },
  sm: { width: 32, height: 45 },
  md: { width: 40, height: 56 },
  lg: { width: 52, height: 73 },
  xl: { width: 64, height: 89 },
} as const;

type LogoSize = keyof typeof sizeMap;

interface LogoProps
  extends Omit<ImageProps, "src" | "alt" | "width" | "height"> {
  size?: LogoSize;
  alt?: string;
}

const Logo = ({
  size = "md",
  alt = "پلتفرم مدیریت پروژه‌های چندرسانه‌ای داینو | Dyno Multimedia Project Management Platform",
  ...rest
}: LogoProps) => {
  const { width, height } = sizeMap[size];

  return (
    <Image
      src={assets.logo}
      alt={alt}
      width={width}
      height={height}
      {...rest}
    />
  );
};

export default Logo;
