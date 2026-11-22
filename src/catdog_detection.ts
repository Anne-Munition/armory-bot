import * as tf from '@tensorflow/tfjs-node';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import axios from 'axios';
import sharp from 'sharp';
import logger from './logger.js';

// Suppress TensorFlow logs
process.env.TF_CPP_MIN_LOG_LEVEL = '2';

// The model internally resizes to 300x300, so there is no benefit to feeding it anything much larger
const MAX_SIZE = 640;
const MAX_DETECTIONS = 20;
// Low floor so we can log near-misses; real decisions use ANIMAL_THRESHOLDS below
const LOG_MIN_SCORE = 0.25;

// COCO animal classes and the minimum confidence required to count as a hit.
// Cats and dogs are common and well represented in the training data, so they can be a bit lower.
export const ANIMAL_THRESHOLDS: Record<string, number> = {
  cat: 0.5,
  dog: 0.5,
  bird: 0.65,
  horse: 0.65,
  sheep: 0.65,
  cow: 0.65,
  elephant: 0.65,
  bear: 0.65,
  zebra: 0.65,
  giraffe: 0.65,
};

// mobilenet_v2 is noticeably more accurate than the default lite_mobilenet_v2
const model = await cocoSsd.load({ base: 'mobilenet_v2' });

async function downloadImage(url: string): Promise<tf.Tensor3D | null> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    validateStatus: (status) => status >= 200 && status < 300,
  });

  const contentTypeHeader = response.headers['content-type'];
  const contentType = Array.isArray(contentTypeHeader)
    ? contentTypeHeader[0]
    : typeof contentTypeHeader === 'string'
      ? contentTypeHeader
      : undefined;
  if (!contentType?.startsWith('image/')) {
    return null;
  }

  try {
    const { data, info } = await sharp(response.data)
      .rotate() // apply EXIF orientation so phone photos aren't sideways
      .flatten({ background: '#ffffff' }) // composite transparency instead of leaving garbage RGB
      .resize(MAX_SIZE, MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
      .toColourspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (info.channels !== 3) {
      logger.error(`Unexpected channel count after processing: ${info.channels}`);
      return null;
    }

    return tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32');
  } catch (err) {
    logger.error(`Failed to process image: ${err}`);
    return null;
  }
}

/**
 * Detects animals in an image.
 * Returns a map of animal class -> highest confidence, only for animals above their threshold.
 */
export default async function detectAnimals(imageUrl: string): Promise<Map<string, number>> {
  const imageTensor = await downloadImage(imageUrl);
  if (!imageTensor) throw new Error('Failed to download or decode image');

  let predictions: cocoSsd.DetectedObject[];
  try {
    predictions = await model.detect(imageTensor, MAX_DETECTIONS, LOG_MIN_SCORE);
  } finally {
    imageTensor.dispose();
  }

  const topConfidences = [...predictions]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((p) => `${p.class}=${(p.score * 100).toFixed(2)}%`);
  logger.info(`Top detection confidences: ${topConfidences.join(', ') || 'none'}`);

  const found = new Map<string, number>();
  for (const { class: cls, score } of predictions) {
    const threshold = ANIMAL_THRESHOLDS[cls];
    if (threshold === undefined || score < threshold) continue;
    if (score > (found.get(cls) ?? 0)) found.set(cls, score);
  }

  if (found.size) {
    const summary = [...found].map(([cls, s]) => `${cls}=${(s * 100).toFixed(2)}%`).join(', ');
    logger.info(`Animals detected: ${summary}`);
  }

  return found;
}
