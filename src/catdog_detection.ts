import * as tf from '@tensorflow/tfjs-node';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import axios from 'axios';

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

async function downloadImage(url: string): Promise<tf.Tensor3D> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  });

  const imageBuffer = Buffer.from(response.data, 'binary');
  const imageTensor = tf.node.decodeImage(imageBuffer) as tf.Tensor3D;
  return imageTensor;
}

export default async function detectAnimals(
  imageUrl: string,
): Promise<{ hasCat: boolean; hasDog: boolean }> {
  let imageTensor = await downloadImage(imageUrl);
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
