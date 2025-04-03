// Three.js background scene

// Global variables
var composer, bloomPass;
var camera, scene, renderer, geometry, material, mesh, materials, lightSphere;
var prevMouseX = 0, prevMouseY = 0, mouseDX = 0, mouseDY = 0, scrollMomentum = 0;
var clock = new THREE.Clock();
var mouseLight;

// Custom shader material for the sphere
var customShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    lightPosition: { value: new THREE.Vector3() }
  },
  vertexShader: `
    precision highp float;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform vec3 lightPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    // Ordered dithering function for retro effect - using if statements instead of arrays
    float orderedDither(vec2 pos) {
      // 4x4 Bayer matrix pattern through manual mapping
      int x = int(mod(pos.x, 4.0));
      int y = int(mod(pos.y, 4.0));
      int index = y * 4 + x;
      
      // Map index to Bayer pattern value manually
      if (index == 0) return 0.0/16.0;
      if (index == 1) return 8.0/16.0;
      if (index == 2) return 2.0/16.0;
      if (index == 3) return 10.0/16.0;
      if (index == 4) return 12.0/16.0;
      if (index == 5) return 4.0/16.0;
      if (index == 6) return 14.0/16.0;
      if (index == 7) return 6.0/16.0;
      if (index == 8) return 3.0/16.0;
      if (index == 9) return 11.0/16.0;
      if (index == 10) return 1.0/16.0;
      if (index == 11) return 9.0/16.0;
      if (index == 12) return 15.0/16.0;
      if (index == 13) return 7.0/16.0;
      if (index == 14) return 13.0/16.0;
      return 5.0/16.0; // index == 15
    }

    void main() {
      // Normal material contribution
      vec3 normalColor = normalize(vNormal) * 0.5 + 0.5;

      // Phong material contribution
      vec3 lightDirection = normalize(lightPosition - vViewPosition);
      float specularStrength = 0.5;
      vec3 viewDirection = normalize(vViewPosition);
      vec3 halfVector = normalize(lightDirection + viewDirection);
      float specular = pow(max(dot(vNormal, halfVector), 0.0), 32.0);
      vec3 phongColor = vec3(0.1, 0.1, 0.1) + vec3(0.7, 0.7, 0.7) * max(dot(vNormal, lightDirection), 0.0) + specularStrength * specular;

      // Blend the two contributions
      vec3 finalColor = mix(normalColor, phongColor, 0.6);
      
      // Mix of random and ordered dithering for retro feel
      float dither = mix(rand(gl_FragCoord.xy), orderedDither(gl_FragCoord.xy), 0.7) * (2.5 / 255.0);
      finalColor.rgb += dither - (1.0/255.0);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
  side: THREE.DoubleSide
});

// Set up post-processing effects
function setupPostProcessing() {
  var renderScene = new THREE.RenderPass(scene, camera);

  bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.4, // radius
    0.85 // threshold
  );
  
  bloomPass.renderToScreen = true;

  composer = new THREE.EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);
}

// Handle mouse and touch input
function handleInput(event, scaleX = 1) {
  var tempX = (event.clientX - window.innerWidth / 2) * 0.0002;
  var tempY = (event.clientY - window.innerHeight / 2) * 0.0002;
  mouseDX += tempX - prevMouseX;
  mouseDY += tempY - prevMouseY;
  prevMouseX = tempX;
  prevMouseY = tempY;

  // Update light position to follow mouse
  var mouseLightX = (event.clientX / window.innerWidth) * 20 - 10
  var mouseLightY = -(event.clientY / window.innerHeight) * 20 + 10
  mouseLight.position.set(mouseLightX, mouseLightY, 0.5);
  var newPosition = new THREE.Vector3(mouseLightX, mouseLightY, 8);
  customShaderMaterial.uniforms.lightPosition.value.copy(newPosition);
  
  var mouseX = (event.clientX / window.innerWidth);
  var mouseY = -(event.clientY / window.innerHeight);
  lightSphere.position.set((mouseX * 6 - 3) * scaleX, mouseY * 4 + 2, -2);
}

function handleTouchInput(event) {
  event.preventDefault();
  var touch = event.touches[0];
  handleInput(touch, 0.33);
}

// Initialize the scene
function init() {
  setupScene();
  setupScrollMomentum();
  setupPostProcessing();

  const initialMouseX = (window.innerWidth);
  const initialMouseY = (-window.innerHeight);

  // Convert the initial mouse position to 3D coordinates
  var initialMouseLightX = (initialMouseX / window.innerWidth) * 20 - 10;
  var initialMouseLightY = -(initialMouseY / window.innerHeight) * 20 + 10;
  mouseLight.position.set(initialMouseLightX, initialMouseLightY, 0.5);
  var initialNewPosition = new THREE.Vector3(initialMouseLightX, initialMouseLightY, 8);
  customShaderMaterial.uniforms.lightPosition.value.copy(initialNewPosition);
  var initialMouse3DX = (initialMouseX / window.innerWidth);
  var initialMouse3DY = -(initialMouseY / window.innerHeight);
  lightSphere.position.set(initialMouse3DX * 6 - 3, initialMouse3DY * 4 + 2, -2);
  
  document.addEventListener('mousemove', handleInput, false);
  document.addEventListener('touchmove', handleTouchInput, false);
  window.addEventListener('resize', onWindowResize, false);
}

function updateRendererSize() {
  var container = document.getElementById('threejs-container');
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  camera.aspect = container.offsetWidth / container.offsetHeight;
  camera.updateProjectionMatrix();
}

function onWindowResize() {
  if (!isMobileDevice()) {
    updateRendererSize();
  }
}

function isMobileDevice() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

function createCircleTexture() {
  var size = 128;
  var canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  var context = canvas.getContext('2d');
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  context.closePath();
  context.fillStyle = 'white';
  context.fill();

  var texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function setupScene() {
  var container = document.getElementById('threejs-container');
  
  camera = new THREE.PerspectiveCamera(70, container.offsetWidth / container.offsetHeight, 0.01, 50);
  camera.position.z = 1;
  scene = new THREE.Scene();
  geometry = new THREE.SphereGeometry(3, 3, 3);
  mesh = new THREE.Mesh(geometry, customShaderMaterial);
  mesh.position.set(0, 0, -5);
  scene.add(mesh);

  // Set background to a gradient with retro dithering
  var canvas = document.createElement('canvas');
  canvas.width = 256; // Increased size for more visible pattern
  canvas.height = 1024;
  var context = canvas.getContext('2d');
  
  // Create gradient
  var gradient = context.createLinearGradient(0, 0, 0, 1024);
  gradient.addColorStop(0, '#101010');
  gradient.addColorStop(0.5, '#202040');
  gradient.addColorStop(1, '#101010');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 1024);
  
  // Apply retro-style ordered dithering
  var imageData = context.getImageData(0, 0, 256, 1024);
  var data = imageData.data;
  
  // Bayer matrix 4x4 pattern for ordered dithering
  var bayerMatrix = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5
  ];
  
  for (var y = 0; y < 1024; y++) {
    for (var x = 0; x < 256; x++) {
      var index = (y * 256 + x) * 4;
      
      // Get Bayer pattern value at this position
      var bayerValue = bayerMatrix[(y % 4) * 4 + (x % 4)];
      
      // Apply a subtle dithering effect based on the Bayer pattern
      var ditherAmount = (bayerValue / 16.0 - 0.5) * 6; // Subtle adjustment
      
      data[index] = Math.max(0, Math.min(255, data[index] + ditherAmount));     // R
      data[index+1] = Math.max(0, Math.min(255, data[index+1] + ditherAmount)); // G
      data[index+2] = Math.max(0, Math.min(255, data[index+2] + ditherAmount)); // B
    }
  }
  
  context.putImageData(imageData, 0, 0);
  
  var backgroundTexture = new THREE.CanvasTexture(canvas);
  backgroundTexture.minFilter = THREE.LinearFilter;
  backgroundTexture.magFilter = THREE.LinearFilter;
  scene.background = backgroundTexture;

  mouseLight = new THREE.PointLight(0xffffff, 1, 100);
  scene.add(mouseLight);

  var lightSphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
  var lightSphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  lightSphere = new THREE.Mesh(lightSphereGeometry, lightSphereMaterial);
  scene.add(lightSphere);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.dithering = true;
  renderer.outputEncoding = THREE.LinearEncoding;
  customShaderMaterial.dithering = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  container.appendChild(renderer.domElement);
}

function setupScrollMomentum() {
  window.onscroll = function () {
    let scrollDelta = window.scrollY - (window.lastScrollY || 0);
    window.lastScrollY = window.scrollY;
    scrollMomentum += scrollDelta * 0.00015;
  };
}

function animate() {
  requestAnimationFrame(animate);

  let delta = clock.getDelta();
  mesh.rotation.x += (0.1 * delta) + mouseDX;
  mesh.rotation.y += (0.1 * delta) + mouseDY;
  mesh.rotation.z += scrollMomentum;

  // Dampen the momentum
  mouseDX *= 0.95;
  mouseDY *= 0.95;
  scrollMomentum *= 0.95;

  composer.render();
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  init();
  animate();
}); 