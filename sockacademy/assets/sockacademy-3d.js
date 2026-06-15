/**
 * SockAcademy 3D Banner — rotating electric-blue sphere
 *
 * Initialises every element with class "sock-3d-banner" on the page.
 * Three.js is loaded once from CDN then shared across all instances.
 */
(function () {
  'use strict';

  const BANNER_CLASS = 'sock-3d-banner';
  const ELECTRIC_BLUE = 0x007fff;

  function initSphere(container) {
    if (container.dataset.sock3dInit) return;
    container.dataset.sock3dInit = '1';

    const width  = container.clientWidth  || 300;
    const height = container.clientHeight || width;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 2.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: ELECTRIC_BLUE,
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0x003366,
      emissiveIntensity: 0.4,
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00bfff, 2, 10);
    pointLight.position.set(3, 3, 3);
    scene.add(pointLight);

    const rimLight = new THREE.PointLight(0xffffff, 0.8, 10);
    rimLight.position.set(-3, -2, -2);
    scene.add(rimLight);

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight || w;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    function animate() {
      requestAnimationFrame(animate);
      if (document.hidden) return;
      sphere.rotation.y += 0.008;
      sphere.rotation.x += 0.003;
      renderer.render(scene, camera);
    }
    animate();
  }

  function initAll() {
    document.querySelectorAll('.' + BANNER_CLASS).forEach(initSphere);
  }

  function loadThreeAndInit(callback) {
    if (typeof THREE !== 'undefined') { callback(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.min.js';
    script.onload = callback;
    script.onerror = () => console.error('[sockacademy-3d] Failed to load Three.js from CDN');
    document.head.appendChild(script);
  }

  // Shopify Theme Editor: reinitialize when a section is dynamically reloaded
  document.addEventListener('shopify:section:load', function (event) {
    const container = event.target.querySelector('.' + BANNER_CLASS);
    if (!container) return;
    loadThreeAndInit(() => initSphere(container));
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadThreeAndInit(initAll));
  } else {
    loadThreeAndInit(initAll);
  }
})();
