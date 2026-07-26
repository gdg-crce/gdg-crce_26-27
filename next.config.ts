import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // ImageKit is the optimizer, not Next's built-in Image Optimization API.
    // The loader falls back to plain local paths when NEXT_PUBLIC_IMAGEKIT_URL
    // is unset — see src/lib/imagekit.ts.
    loader: "custom",
    loaderFile: "./src/lib/imagekitLoader.ts",
  },
};

export default nextConfig;
