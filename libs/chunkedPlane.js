'use strict';

var ChunkedPlane = function (opts) {
  THREE.Object3D.call(this);

  this.opts = opts || {};

  this.tileRes = opts.tileRes || 16;
  this.maxScreenSpaceError = opts.maxScreenSpaceError || 2;
  this.camera = opts.camera;
  this.scaleFactor = opts.scale || 1;
  this.maxLevels = opts.maxLevels || 32;

  this.vertShader = opts.shaders.vert;
  this.fragShader = opts.shaders.frag;

  this.tileLoader = opts.tileLoader;

  this.perspectiveScaling = 1;
  this.updatePerspectiveScaling();

  this.widthDir = opts.widthDir || new THREE.Vector3(1, 0, 0);
  this.heightDir = opts.heightDir || new THREE.Vector3(0, 1, 0);
  this.frustum = new THREE.Frustum();

  this.renderer = opts.renderer;

  this.initTileTree();
};

ChunkedPlane.prototype = Object.create(THREE.Object3D.prototype);

ChunkedPlane.prototype.initTileTree = function () {
  this.rootTile = new TileNode({
    position: new THREE.Vector3(0, 0, 0),
    parent: null,
    master: this,
    level: 0,
    ulrichFactor: 0.005*this.scaleFactor,
    tileLoader: this.tileLoader
  });
};

ChunkedPlane.prototype.addTile = function (tile) {
  var selectedTile = this.getObjectByName(tile.id);
  if (selectedTile) return;

  var tileGeometry = new THREE.PlaneBufferGeometry(tile.scale, tile.scale, this.tileRes, this.tileRes);

  var topLeft = new THREE.Vector2(
    tile.position.x - tile.scale*0.5,
    tile.position.y + tile.scale*0.5
  );

  var tileMaterial;

  var tileUniforms = {
    worldScale: {type: "f", value: this.scaleFactor*0.5},
    level: {type: "f", value: tile.level},
    tileTex: {type: "t", value: tile.texture},
    topLeft: {type: "v2", value: topLeft},
    tileScale: {type: "f", value: tile.scale},
    opacity: {type: "f", value: 0.0}
  };

  tileMaterial = new THREE.ShaderMaterial({
    uniforms: tileUniforms,
    vertexShader: this.vertShader,
    fragmentShader: this.fragShader,
    transparent: true
  });

  var translation = new THREE.Matrix4().makeTranslation(
    tile.position.x,
    tile.position.y,
    tile.position.z
  );
  tileGeometry.applyMatrix(translation);

  var tileMesh = new THREE.Mesh(
    tileGeometry,
    tileMaterial
  );

  // tileMesh.frustumCulled = false;
  tileMesh.name = tile.id;
  this.add(tileMesh);

  this._animateTileOpacity(tileMaterial, 100);
};

ChunkedPlane.prototype.removeTile = function (tile) {
  var selectedTile = this.getObjectByName(tile.id);
  if (selectedTile) {
    // Fade out and remove
    this._animateTileOpacity(selectedTile.material, -100, function () {
      if (tile.texture) {
        tile.texture.dispose();
      }
      selectedTile.geometry.dispose();
      selectedTile.material.dispose();
      this.remove(selectedTile);
    });
    return true;
  }
  return false;
};

ChunkedPlane.prototype._animateTileOpacity = function (material, fadeTime, done) {
  var self = this;

  var toValue = fadeTime > 0 ? 1.0 : 0.0;
  var opacity = material.uniforms.opacity.value;

  var tweenOpacity = new TWEEN.Tween({opacity: opacity})
      .to({opacity: 1.0}, Math.abs(fadeTime))
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(function () {
        material.uniforms.opacity.value = this.opacity;
      })
      .onComplete(function () {
        if (typeof done === 'function') {
          done.call(self);
        }
      });
  tweenOpacity.start();
};

ChunkedPlane.prototype.getCameraPosition = function () {
  var invModelMatrix = new THREE.Matrix4();
  invModelMatrix.getInverse(this.matrix);

  var localCam = this.camera.position.clone().applyMatrix4(invModelMatrix);

  return localCam;
};

ChunkedPlane.prototype.update = function () {
  this.updatePerspectiveScaling();
  this.updateFrustum();

  // Recursive tile update
  this.rootTile.update();
};

ChunkedPlane.prototype.getPerspectiveScaling = function () {
  return this.perspectiveScaling;
};

ChunkedPlane.prototype.getMaxScreenSpaceError = function () {
  return this.maxScreenSpaceError;
};

ChunkedPlane.prototype.getMaxLodLevel = function () {
  return this.maxLevels;
};

ChunkedPlane.prototype.getWidthDir = function () {
  return this.widthDir.clone();
};

ChunkedPlane.prototype.getHeightDir = function () {
  return this.heightDir.clone();
};

ChunkedPlane.prototype.getScale = function () {
  return this.scaleFactor;
};

ChunkedPlane.prototype.isTileInFrustum = function (tile) {
  this.camera.updateMatrix();
  this.camera.updateMatrixWorld();
  this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

  // same transform as above
  var tileGeometry = new THREE.PlaneBufferGeometry(tile.scale, tile.scale, 1, 1);
  var translation = new THREE.Matrix4().makeTranslation(
    tile.position.x,
    tile.position.y,
    tile.position.z
  );
  tileGeometry.applyMatrix(translation);

  tileGeometry.computeBoundingBox();

  if (this.frustum.intersectsBox(tileGeometry.boundingBox)) return true;
  return false;
};

ChunkedPlane.prototype.getDistanceToTile = function (tile) {
  var tilePos = tile.position.clone();
  tilePos.applyMatrix4(this.matrix);
  return this.camera.position.distanceTo(tilePos);
};

/**
 * Calculate horizontal perspective scaling factor.
 * Divide by object dist to camera to get number of pixels per unit at that dist.
 */
ChunkedPlane.prototype.updatePerspectiveScaling = function () {
  var vFOV = this.camera.fov*Math.PI/180;
  var heightScale = 2*Math.tan(vFOV/2);
  var aspect = window.innerWidth/window.innerHeight;

  this.perspectiveScaling = window.innerWidth/(aspect*heightScale);
};

ChunkedPlane.prototype.updateFrustum = function () {
  this.frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
};
