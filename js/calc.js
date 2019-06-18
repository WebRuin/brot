self.onmessage = ({ data }) => {
  const brot = data;
  const pixelH = (brot.cyMax - brot.cyMin) / brot.height;
  const pixelW = (brot.cxMax - brot.cxMin) / brot.width;
  let gy;
  let gx;
  for (let y = 0; y < brot.height; y++) {
    gy = brot.cyMin + y * pixelH;
    for (let x = 0; x < brot.width; x++) {
      gx = brot.cxMin + x * pixelW;

      let i = 0;
      let zx = 0.0;
      let zy = 0.0;
      let zx2 = 0.0;
      let zy2 = 0.0;
      for (; i < brot.maxI && zx2 + zy2 < 4; i++) {
        zy = 2 * zx * zy + gy;
        zx = zx2 - zy2 + gx;
        zx2 = zx * zx;
        zy2 = zy * zy;
      }

      let inSet = i == brot.maxI;
      let pixel = (y * brot.width + x) * 4;

      if (!inSet) {
        brot.imgData.data[pixel] = (i * 50) % 256;
        brot.imgData.data[pixel + 1] = (i * 30) % 256;
        brot.imgData.data[pixel + 2] = (i * 40) % 256;
        brot.imgData.data[pixel + 3] = 256;
      } else {
        brot.imgData.data[pixel] = (zx2 * brot.width) % 256;
        brot.imgData.data[pixel + 1] = (zy2 * brot.height) % 256;
        brot.imgData.data[pixel + 2] =
          (((zy2 * zx2) / 2) * ((brot.width * brot.height) / 2)) % 256;
        brot.imgData.data[pixel + 3] = 256;
      }
    }
  }
  self.postMessage(brot);
};

self.onerror = message => {
  log('worker error');
};

const log = msg => {
  const object = {
    type: 'debug',
    msg: `${msg} [${Date.now()}]`
  };
  self.postMessage(object);
};
