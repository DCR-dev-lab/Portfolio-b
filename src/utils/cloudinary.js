const cloudinary = require("cloudinary").v2;

/**
 * Configure Cloudinary with environment variables.
 * Safe to call even if credentials are not yet set.
 */
function getCloudinaryClient() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    return null;
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });

  return cloudinary;
}

/**
 * Extracts the Cloudinary public_id from a full URL.
 * Handles folders, versions (v12345...), and transformations (w_500, etc.).
 *
 * Example:
 *   "https://res.cloudinary.com/demo/image/upload/v1570979139/portfolio/projects/hero.png"
 *   => "portfolio/projects/hero"
 */
function getCloudinaryPublicId(url) {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.hostname !== "res.cloudinary.com") return null;

    const configuredCloud = process.env.CLOUDINARY_CLOUD_NAME;
    const rawPathSegments = parsed.pathname.split("/").filter(Boolean);
    if (configuredCloud && rawPathSegments[0] !== configuredCloud) {
      return null;
    }

    const parts = parsed.pathname.split("/upload/");
    if (parts.length < 2) return null;

    let path = parts[1];
    const segments = path.split("/");
    const cleanSegments = [];
    let passedPrefixes = false;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!seg || seg === "." || seg === "..") continue;

      if (!passedPrefixes) {
        // Skip version segment (e.g. v1732452341)
        if (/^v\d+$/.test(seg)) {
          passedPrefixes = true;
          continue;
        }
        // Skip transformation segment (e.g. c_fill,w_300 or q_auto)
        if (seg.includes(",") || /^[a-z]_[a-z0-9_-]+$/i.test(seg)) {
          continue;
        }
      }

      cleanSegments.push(seg);
    }

    if (cleanSegments.length === 0) return null;

    const fullPathWithExt = cleanSegments.join("/");
    const lastDotIndex = fullPathWithExt.lastIndexOf(".");
    return lastDotIndex !== -1
      ? fullPathWithExt.substring(0, lastDotIndex)
      : fullPathWithExt;
  } catch (err) {
    console.warn("[Cloudinary] Error parsing public_id from URL:", err.message);
    return null;
  }
}

/**
 * Deletes an image from Cloudinary by its full URL.
 * Silently succeeds if credentials are not configured or if URL is not a Cloudinary asset.
 *
 * @param {string} url - Full Cloudinary URL
 * @returns {Promise<boolean>} True if deleted, false otherwise
 */
async function deleteCloudinaryImage(url) {
  if (!url) return false;

  const publicId = getCloudinaryPublicId(url);
  if (!publicId) return false;

  const client = getCloudinaryClient();
  if (!client) {
    console.info(
      `[Cloudinary] Skipped deleting "${publicId}" (Cloudinary credentials not set in backend .env)`
    );
    return false;
  }

  try {
    const result = await client.uploader.destroy(publicId);
    console.info(`[Cloudinary] Deleted "${publicId}":`, result.result);
    return result.result === "ok";
  } catch (err) {
    console.error(`[Cloudinary] Failed to delete "${publicId}":`, err.message);
    return false;
  }
}

module.exports = {
  getCloudinaryPublicId,
  deleteCloudinaryImage,
};
