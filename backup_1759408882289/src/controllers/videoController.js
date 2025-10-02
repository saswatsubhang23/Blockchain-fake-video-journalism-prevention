import ffmpeg from "fluent-ffmpeg";
import ffprobe from "ffprobe-static";
import { addFileFromPath } from "../services/ipfs.js";
import { upsertVideo, findVideoByHash } from "../services/neo4j.js";
import { registerHashOnChain, isRegisteredOnChain } from "../services/eth.js";
import { sha256File } from "../utils/hash.js";

ffmpeg.setFfprobePath(ffprobe.path);

async function extractMetadata(filePath) {
  return await new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err || !data) {
        return resolve({ duration: null, format: null, size: null, mimeType: null });
      }
      resolve({
        duration: data.format?.duration ?? null,
        format: data.format?.format_name ?? null,
        size: data.format?.size ? Number(data.format.size) : null,
        mimeType: (data.format?.format_long_name || "").toLowerCase().includes("mp4") ? "video/mp4" : null
      });
    });
  });
}

export async function uploadVideo(req, res, next) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ ok: false, error: "No file uploaded (field name: video)" });

    const { uploaderId, eventId, eventType, derivedFromHash } = req.body;

    const hash = sha256File(file.path, true); // 0x-prefixed hex

    const meta = await extractMetadata(file.path);

    const ipfs = await addFileFromPath(file.path, file.originalname);

    const stored = await upsertVideo({
      hash,
      ipfsCid: ipfs.cid,
      ipfsUri: ipfs.uri,
      gatewayUrl: ipfs.gatewayUrl,
      size: meta.size ?? file.size,
      mimeType: meta.mimeType ?? file.mimetype,
      duration: meta.duration,
      format: meta.format,
      uploaderId: uploaderId || null,
      eventId: eventId || null,
      eventType: eventType || null,
      derivedFromHash: derivedFromHash || null
    });

    let chain = { submitted: false };
    try {
      chain = await registerHashOnChain(hash, ipfs.uri);
    } catch (e) {
      // Non-fatal if chain not configured or fails
      chain = { submitted: false, reason: e.message };
    }

    return res.json({
      ok: true,
      hash,
      ipfs: { cid: ipfs.cid, uri: ipfs.uri, gatewayUrl: ipfs.gatewayUrl },
      neo4j: stored,
      chain
    });
  } catch (err) {
    next(err);
  }
}

export async function checkVideo(req, res, next) {
  try {
    let { hash } = req.params;
    if (!hash) return res.status(400).json({ ok: false, error: "Hash param required" });
    if (!hash.startsWith("0x")) hash = `0x${hash}`;

    const stored = await findVideoByHash(hash);
    const onChain = await isRegisteredOnChain(hash).catch(() => false);

    if (!stored) return res.status(404).json({ ok: false, error: "Not found" });

    return res.json({
      ok: true,
      onChain,
      video: stored
    });
  } catch (err) {
    next(err);
  }
}