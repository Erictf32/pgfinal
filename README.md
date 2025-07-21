# pgfinal

# Simple Weekend Ray Tracer (JavaScript)

This project is an adaptation of Peter Shirley's "Ray Tracing in One Weekend" series implemented in pure JavaScript for the web.

## Features
* CPU ray tracer rendered to an HTML5 canvas.
* Three materials: Diffuse (Lambertian), Metal (with optional fuzz) and Dielectric (glass).
* Randomly generated scene with dozens of spheres plus three large spheres of each material.
* Interactive camera controls – change the camera \(x, y, z\) position and re-render.

## How to run
Simply open `index.html` in any modern browser. The first image will render automatically. Adjust the camera sliders and click **Render** to generate a new view.

## Notes
* The renderer is CPU-based and intentionally simple for educational purposes. Rendering higher resolutions or more samples per pixel will be slow.
* All code lives in two files: `index.html` (UI) and `raytracer.js` (renderer).

Enjoy exploring ray tracing! :)
