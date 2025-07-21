// Simple weekend ray tracer in JavaScript
// Inspired by Peter Shirley's "Ray Tracing in One Weekend" books
// Supports 3 materials: diffuse (Lambertian), metal (with fuzz) and dielectric (glass)
// Scene: random spheres on ground + 3 big spheres in center

/* eslint-disable no-bitwise */

class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  add(v) {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }
  sub(v) {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }
  mul(t) {
    return new Vec3(this.x * t, this.y * t, this.z * t);
  }
  div(t) {
    return this.mul(1 / t);
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  cross(v) {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }
  length() {
    return Math.sqrt(this.lengthSquared());
  }
  lengthSquared() {
    return this.x ** 2 + this.y ** 2 + this.z ** 2;
  }
  unit() {
    return this.div(this.length());
  }
  negate() {
    return new Vec3(-this.x, -this.y, -this.z);
  }
  static random(min = 0, max = 1) {
    return new Vec3(
      min + Math.random() * (max - min),
      min + Math.random() * (max - min),
      min + Math.random() * (max - min)
    );
  }
  static randomInUnitSphere() {
    while (true) {
      const p = Vec3.random(-1, 1);
      if (p.lengthSquared() >= 1) continue;
      return p;
    }
  }
  static randomUnitVector() {
    return Vec3.randomInUnitSphere().unit();
  }
  static reflect(v, n) {
    return v.sub(n.mul(2 * v.dot(n)));
  }
  static refract(uv, n, etai_over_etat) {
    const cosTheta = Math.min(uv.negate().dot(n), 1.0);
    const rOutPerp = uv.add(n.mul(cosTheta)).mul(etai_over_etat);
    const rOutParallel = n.mul(-Math.sqrt(Math.abs(1.0 - rOutPerp.lengthSquared())));
    return rOutPerp.add(rOutParallel);
  }
}

class Ray {
  constructor(origin, direction) {
    this.origin = origin;
    this.direction = direction;
  }
  at(t) {
    return this.origin.add(this.direction.mul(t));
  }
}

class HitRecord {
  constructor() {
    this.p = null;
    this.normal = null;
    this.t = 0;
    this.frontFace = true;
    this.material = null;
  }
  setFaceNormal(ray, outwardNormal) {
    this.frontFace = ray.direction.dot(outwardNormal) < 0;
    this.normal = this.frontFace ? outwardNormal : outwardNormal.negate();
  }
}

class Sphere {
  constructor(center, radius, material) {
    this.center = center;
    this.radius = radius;
    this.material = material;
  }
  hit(ray, tMin, tMax, rec) {
    const oc = ray.origin.sub(this.center);
    const a = ray.direction.lengthSquared();
    const half_b = oc.dot(ray.direction);
    const c = oc.lengthSquared() - this.radius ** 2;
    const discriminant = half_b ** 2 - a * c;
    if (discriminant < 0) return false;
    const sqrtd = Math.sqrt(discriminant);

    let root = (-half_b - sqrtd) / a;
    if (root < tMin || root > tMax) {
      root = (-half_b + sqrtd) / a;
      if (root < tMin || root > tMax) return false;
    }

    rec.t = root;
    rec.p = ray.at(rec.t);
    const outwardNormal = rec.p.sub(this.center).div(this.radius);
    rec.setFaceNormal(ray, outwardNormal);
    rec.material = this.material;

    return true;
  }
}

// Materials
class Lambertian {
  constructor(albedo) {
    this.albedo = albedo; // Vec3
  }
  scatter(rayIn, rec, attenuation, scattered) {
    let scatterDirection = rec.normal.add(Vec3.randomUnitVector());
    if (scatterDirection.lengthSquared() < 1e-8) scatterDirection = rec.normal;
    scattered.origin = rec.p;
    scattered.direction = scatterDirection;
    attenuation.x = this.albedo.x;
    attenuation.y = this.albedo.y;
    attenuation.z = this.albedo.z;
    return true;
  }
}

class Metal {
  constructor(albedo, fuzz) {
    this.albedo = albedo;
    this.fuzz = fuzz < 1 ? fuzz : 1;
  }
  scatter(rayIn, rec, attenuation, scattered) {
    const reflected = Vec3.reflect(rayIn.direction.unit(), rec.normal);
    scattered.origin = rec.p;
    scattered.direction = reflected.add(Vec3.randomInUnitSphere().mul(this.fuzz));
    attenuation.x = this.albedo.x;
    attenuation.y = this.albedo.y;
    attenuation.z = this.albedo.z;
    return scattered.direction.dot(rec.normal) > 0;
  }
}

class Dielectric {
  constructor(ir) {
    this.ir = ir; // Index of Refraction
  }
  static reflectance(cosine, refIdx) {
    // Schlick's approximation
    let r0 = (1 - refIdx) / (1 + refIdx);
    r0 = r0 ** 2;
    return r0 + (1 - r0) * (1 - cosine) ** 5;
  }
  scatter(rayIn, rec, attenuation, scattered) {
    attenuation.x = 1;
    attenuation.y = 1;
    attenuation.z = 1;
    const refractionRatio = rec.frontFace ? 1 / this.ir : this.ir;
    const unitDirection = rayIn.direction.unit();

    const cosTheta = Math.min(unitDirection.negate().dot(rec.normal), 1);
    const sinTheta = Math.sqrt(1 - cosTheta ** 2);
    let direction;
    if (refractionRatio * sinTheta > 1 || Dielectric.reflectance(cosTheta, refractionRatio) > Math.random()) {
      direction = Vec3.reflect(unitDirection, rec.normal);
    } else {
      direction = Vec3.refract(unitDirection, rec.normal, refractionRatio);
    }
    scattered.origin = rec.p;
    scattered.direction = direction;
    return true;
  }
}

class HittableList {
  constructor() {
    this.objects = [];
  }
  add(obj) {
    this.objects.push(obj);
  }
  hit(ray, tMin, tMax, rec) {
    const tempRec = new HitRecord();
    let hitAnything = false;
    let closest = tMax;
    for (const obj of this.objects) {
      if (obj.hit(ray, tMin, closest, tempRec)) {
        hitAnything = true;
        closest = tempRec.t;
        Object.assign(rec, tempRec);
      }
    }
    return hitAnything;
  }
}

class Camera {
  constructor(lookfrom, lookat, vup, vfov, aspectRatio) {
    const theta = (vfov * Math.PI) / 180;
    const h = Math.tan(theta / 2);
    const viewportHeight = 2 * h;
    const viewportWidth = aspectRatio * viewportHeight;

    this.w = lookfrom.sub(lookat).unit();
    this.u = vup.cross(this.w).unit();
    this.v = this.w.cross(this.u);

    this.origin = lookfrom;
    this.horizontal = this.u.mul(viewportWidth);
    this.vertical = this.v.mul(viewportHeight);
    this.lowerLeftCorner = this.origin
      .sub(this.horizontal.div(2))
      .sub(this.vertical.div(2))
      .sub(this.w);
  }
  getRay(s, t) {
    const dir = this.lowerLeftCorner
      .add(this.horizontal.mul(s))
      .add(this.vertical.mul(t))
      .sub(this.origin);
    return new Ray(this.origin, dir);
  }
}

function rayColor(ray, world, depth) {
  if (depth <= 0) return new Vec3(0, 0, 0);
  const rec = new HitRecord();
  if (world.hit(ray, 0.001, Infinity, rec)) {
    const scattered = new Ray(new Vec3(), new Vec3());
    const attenuation = new Vec3();
    if (rec.material.scatter(ray, rec, attenuation, scattered)) {
      const col = rayColor(scattered, world, depth - 1);
      return new Vec3(
        attenuation.x * col.x,
        attenuation.y * col.y,
        attenuation.z * col.z
      );
    }
    return new Vec3(0, 0, 0);
  }
  const unitDir = ray.direction.unit();
  const t = 0.5 * (unitDir.y + 1.0);
  return new Vec3(1.0, 1.0, 1.0).mul(1.0 - t).add(new Vec3(0.7, 0.8, 1.0).mul(t));
}

function randomScene() {
  const world = new HittableList();
  const groundMaterial = new Lambertian(new Vec3(0.5, 0.5, 0.5));
  world.add(new Sphere(new Vec3(0, -1000, 0), 1000, groundMaterial));

  for (let a = -11; a < 11; ++a) {
    for (let b = -11; b < 11; ++b) {
      const chooseMat = Math.random();
      const center = new Vec3(a + 0.9 * Math.random(), 0.2, b + 0.9 * Math.random());
      if (center.sub(new Vec3(4, 0.2, 0)).length() > 0.9) {
        let sphereMaterial;
        if (chooseMat < 0.8) {
          // diffuse
          const albedo = Vec3.random().mul(Vec3.random());
          sphereMaterial = new Lambertian(albedo);
        } else if (chooseMat < 0.95) {
          // metal
          const albedo = Vec3.random(0.5, 1);
          const fuzz = Math.random() * 0.5;
          sphereMaterial = new Metal(albedo, fuzz);
        } else {
          // glass
          sphereMaterial = new Dielectric(1.5);
        }
        world.add(new Sphere(center, 0.2, sphereMaterial));
      }
    }
  }

  const material1 = new Dielectric(1.5);
  world.add(new Sphere(new Vec3(0, 1, 0), 1.0, material1));

  const material2 = new Lambertian(new Vec3(0.4, 0.2, 0.1));
  world.add(new Sphere(new Vec3(-4, 1, 0), 1.0, material2));

  const material3 = new Metal(new Vec3(0.7, 0.6, 0.5), 0.0);
  world.add(new Sphere(new Vec3(4, 1, 0), 1.0, material3));

  return world;
}

// Rendering
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const aspectRatio = width / height;

  // Samples-per-pixel slider elements (added in HTML)
  const sppInput = document.getElementById('spp');
  const sppVal = document.getElementById('sppVal');

  // Default value comes from the input element
  let samplesPerPixel = parseInt(sppInput.value, 10);
  const maxDepth = 10; // Allow deeper light bounces

  const world = randomScene();

  const camXInput = document.getElementById('camX');
  const camYInput = document.getElementById('camY');
  const camZInput = document.getElementById('camZ');
  const camXVal = document.getElementById('camXVal');
  const camYVal = document.getElementById('camYVal');
  const camZVal = document.getElementById('camZVal');
  const renderBtn = document.getElementById('renderBtn');
  const ppmBtn = document.getElementById('ppmBtn');

  // Store the latest rendered image for export
  let lastImageData = null;

  function updateLabels() {
    camXVal.textContent = camXInput.value;
    camYVal.textContent = camYInput.value;
    camZVal.textContent = camZInput.value;
    sppVal.textContent = sppInput.value;
    samplesPerPixel = parseInt(sppInput.value, 10);
  }
  [camXInput, camYInput, camZInput, sppInput].forEach((inp) => inp.addEventListener('input', updateLabels));
  updateLabels();

  function getCamera() {
    const lookfrom = new Vec3(parseFloat(camXInput.value), parseFloat(camYInput.value), parseFloat(camZInput.value));
    const lookat = new Vec3(0, 0, 0);
    const vup = new Vec3(0, 1, 0);
    const distToFocus = 10.0;
    const aperture = 0.0; // no depth of field
    return new Camera(lookfrom, lookat, vup, 20, aspectRatio);
  }

  function render() {
    const camera = getCamera();
    const imageData = ctx.createImageData(width, height);

    function renderRow(j) {
      for (let i = 0; i < width; ++i) {
        let pixelColor = new Vec3();
        for (let s = 0; s < samplesPerPixel; ++s) {
          const u = (i + Math.random()) / (width - 1);
          const v = (j + Math.random()) / (height - 1);
          const r = camera.getRay(u, 1 - v);
          pixelColor = pixelColor.add(rayColor(r, world, maxDepth));
        }
        // Write pixel
        const scale = 1 / samplesPerPixel;
        let r = Math.sqrt(scale * pixelColor.x);
        let g = Math.sqrt(scale * pixelColor.y);
        let b = Math.sqrt(scale * pixelColor.z);
        const index = (j * width + i) * 4;
        imageData.data[index] = Math.floor(256 * clamp(r, 0, 0.999));
        imageData.data[index + 1] = Math.floor(256 * clamp(g, 0, 0.999));
        imageData.data[index + 2] = Math.floor(256 * clamp(b, 0, 0.999));
        imageData.data[index + 3] = 255;
      }
    }

    // Render rows asynchronously to keep UI responsive
    let currentRow = 0;
    function loop() {
      const rowsPerBatch = 2;
      for (let k = 0; k < rowsPerBatch && currentRow < height; ++k, ++currentRow) {
        renderRow(currentRow);
      }
      ctx.putImageData(imageData, 0, 0);
      if (currentRow < height) {
        setTimeout(loop, 0);
      } else {
        // Save final frame so user can export to PPM later
        lastImageData = imageData;
      }
    }
    loop();
  }

  function clamp(x, min, max) {
    if (x < min) return min;
    if (x > max) return max;
    return x;
  }

  renderBtn.addEventListener('click', render);
  render(); // initial render

  // ----- PPM EXPORT -------------------------------------------------------
  function createPPM(data) {
    let header = `P3\n${width} ${height}\n255\n`;
    let body = '';
    // Canvas coordinates are top-left origin, but PPM expects bottom-left
    for (let j = height - 1; j >= 0; --j) {
      for (let i = 0; i < width; ++i) {
        const idx = (j * width + i) * 4;
        const r = data.data[idx];
        const g = data.data[idx + 1];
        const b = data.data[idx + 2];
        body += `${r} ${g} ${b}\n`;
      }
    }
    return header + body;
  }

  ppmBtn.addEventListener('click', () => {
    if (!lastImageData) {
      alert('Render the scene first, then export.');
      return;
    }
    const ppmString = createPPM(lastImageData);
    const blob = new Blob([ppmString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'render.ppm';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
});