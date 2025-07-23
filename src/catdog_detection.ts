import * as tf from '@tensorflow/tfjs-node';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import axios from 'axios';
import sharp from 'sharp';

// Suppress TensorFlow logs
process.env.TF_CPP_MIN_LOG_LEVEL = '2';

const MAX_SIZE = 480;

function resizeImage(tensor: tf.Tensor3D): tf.Tensor3D {
  const [h, w] = tensor.shape;
  const scale = Math.min(MAX_SIZE / w, MAX_SIZE / h, 1);
  const newW = Math.floor(w * scale);
  const newH = Math.floor(h * scale);
  // Resize and cast to int32
  return tf.image.resizeBilinear(tensor, [newH, newW]).cast('int32');
}

const model = await cocoSsd.load();

async function downloadImage(url: string): Promise<tf.Tensor3D | null> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    validateStatus: (status) => status >= 200 && status < 300,
  });

  const contentType = response.headers['content-type'];
  if (!contentType?.startsWith('image/')) {
    return null;
  }

  let imageBuffer: Buffer;

  try {
    // Convert to PNG using sharp for unsupported formats
    imageBuffer = await sharp(response.data).toFormat('png').toBuffer();
  } catch (err) {
    console.error('Sharp failed to process image:', err);
    return null;
  }

  try {
    let imageTensor = tf.node.decodeImage(imageBuffer) as tf.Tensor3D;
    if (imageTensor.shape[2] === 4) {
      imageTensor = tf.slice(imageTensor, [0, 0, 0], [-1, -1, 3]);
    }
    return imageTensor;
  } catch (err) {
    console.error('TensorFlow failed to decode image:', err);
    return null;
  }
}

export default async function detectAnimals(
  imageUrl: string,
): Promise<{ hasCat: boolean; hasDog: boolean }> {
  let imageTensor = await downloadImage(imageUrl);
  if (!imageTensor) throw new Error('Failed to download or decode image');
  imageTensor = resizeImage(imageTensor);

  const predictions = await model.detect(imageTensor);
  imageTensor.dispose(); // free memory

  let hasCat = false;
  let hasDog = false;

  for (const prediction of predictions) {
    if (prediction.class === 'cat') hasCat = true;
    if (prediction.class === 'dog') hasDog = true;
  }

  return { hasCat, hasDog };
}
