'use strict';

var updateLod;
require([
  'libs/vendor/text!shaders/passThrough.vert',
  'libs/vendor/text!shaders/passThrough.frag',
  'mapboxSettings',
  'libs/vendor/orbitControls',
  'libs/tileNode',
  'libs/chunkedPlane'
],

function (passThroughVert, passThroughFrag) {
  var t = new Date();
  var rendererStats;
  var camera, controls, renderer, scene;
  var plane, planeGeometry, planeMaterial;

  init();
  animate();

  function init() {
    System.logSystemInfo();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.001, 100);
    camera.position.set(0, 0, 2);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    scene = new THREE.Scene();

    var tileLoader = new TileLoader({
      mapbox: mapboxSettings
    });

    plane = new ChunkedPlane({
      tileRes: 8,
      camera: camera,
      shaders: {
        vert: passThroughVert,
        frag: passThroughFrag
      },
      tileLoader: tileLoader,
      renderer: renderer
    });
    scene.add(plane);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor(0x222222, 1);

    controls = new THREE.OrbitControls(camera);
    document.body.appendChild(renderer.domElement);

    rendererStats = new THREEx.RendererStats();
    rendererStats.domElement.style.position = 'absolute';
    rendererStats.domElement.style.left = '0px';
    rendererStats.domElement.style.bottom = '0px';
    document.body.appendChild(rendererStats.domElement);
  }

  updateLod = true;
  function animate() {
    var dt = new Date() - t;
    t = new Date();

    if (updateLod) {
      plane.update();
    }
    controls.update();

    renderer.render(scene, camera);
    rendererStats.update(renderer);
    requestAnimationFrame(animate);
  }
});