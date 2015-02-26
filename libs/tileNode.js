var TileNode = function (opts) {
  opts = opts || {};

  this.position = opts.position;
  this.parent = opts.parent;
  this.master = opts.master;
  this.level = opts.level;
  this.ulrichFactor = opts.ulrichFactor;
  this.transform = opts.transform || '';
  this.tileLoader = opts.tileLoader;

  this.col = opts.col || 0;
  this.row = opts.row || 0;

  this.loading = false;
  this.visible = true;

  this.scale = this.master.getScale()/Math.pow(2, this.level);

  var pos = this.position.clone();
  pos.sub(this.master.getWidthDir().multiplyScalar(this.scale*0.5));
  pos.sub(this.master.getHeightDir().multiplyScalar(this.scale*0.5));

  // console.log(this.level + "/" + this.col + "/" + this.row);

  this.corners = [
    pos, // BL
    pos.clone().add(new THREE.Vector3(this.scale, 0, 0)), // BR
    pos.clone().add(new THREE.Vector3(0, this.scale, 0)), // TL
    pos.clone().add(new THREE.Vector3(this.scale, this.scale, 0)) // TR
  ];

  this.center = this.getCenter();

  this.id = this.getId();
};

/**
 * Check visibility, splitting and merging
 */
TileNode.prototype.update = function () {
  var childrenAdded = this.isChildrenAdded();

  if (this.isVisible()) {
    this.visible = true;
    if (this.shouldSplit()) {
      this.split();
      // this.removeFromMaster();
      this.update();
    } else if (this.shouldMerge()) {
      this.merge();
      this.addToMaster();
      this.update();
    } else if (this.isSplit) {
      if (this.added && childrenAdded) {
        this.removeFromMaster();
      }
      this.updateChildren();
    } else if (!this.added && !this.loading) {
      this.addToMaster();
    }
  } else if (this.added) {
    if (this.isSplit) {
      this.updateChildren();
    }
    this.removeFromMaster();
  } else {
    this.visible = false;
  }
};

TileNode.prototype.updateChildren = function () {
  this.bottomLeft.update();
  this.bottomRight.update();
  this.topLeft.update();
  this.topRight.update();
};

TileNode.prototype.isChildrenAdded = function () {
  if (this.isSplit) {
    var blDone = this.bottomLeft.added || !this.bottomLeft.visible;
    var brDone = this.bottomRight.added || !this.bottomRight.visible;
    var tlDone = this.topLeft.added || !this.topLeft.visible;
    var trDone = this.topRight.added || !this.topRight.visible;
    return blDone && brDone && tlDone && trDone;
  }
  return false;
};

TileNode.prototype.isVisible = function () {
  return this.isInFrustum();
};

TileNode.prototype.isInFrustum = function () {
  return this.master.isTileInFrustum(this);
}

TileNode.prototype.getDistance = function () {
  return this.master.getDistanceToTile(this);
};

/**
 * Get the center point of this tile
 */
TileNode.prototype.getCenter = function () {
  if (this.center) return this.center.clone();

  var wd = this.master.getWidthDir();
  var hd = this.master.getHeightDir();

  return new THREE.Vector3(
    this.position.x + wd.x*this.scale + hd.x*this.scale,
    this.position.y + wd.y*this.scale + hd.y*this.scale,
    this.position.z + wd.z*this.scale + hd.z*this.scale
  );
};

TileNode.prototype.getId = function () {
  if (this.id) return this.id;

  var id = this.center.x + ":" + this.center.y + ":" + this.center.z;

  if (this.transform) {
    var transfromString = "";
    for (var i = 0; i < this.transform.elements.length; i++) {
      transfromString += this.transform.elements[i];
    }
    id += transfromString;
  }
  return id;
};

TileNode.prototype.shouldMerge = function () {
  if (this.isSplit) return this.level > 0 && this.master.getMaxScreenSpaceError() >= this.getScreenSpaceError();
  return false;
};

TileNode.prototype.shouldSplit = function () {
  if (this.isSplit) return false;
  return this.level < this.master.getMaxLodLevel() && this.master.getMaxScreenSpaceError() < this.getScreenSpaceError();
};

TileNode.prototype.getScreenSpaceError = function () {
  return this.master.getPerspectiveScaling()*this.ulrichFactor/this.getDistance();
};

/**
 * Split this tile into four sub-tiles
 *
 *    +----+----+
 *    | TL | TR |
 *    +----+----+
 *    | BL | BR |
 *    +----+----+
 */
TileNode.prototype.split = function () {

  if (this.isSplit) return;
  // console.log("split");

  // Shared opts
  var opts = {
    parent: this,
    master: this.master,
    level: this.level + 1,
    ulrichFactor: this.ulrichFactor*0.5,
    transform: this.transform,
    tileLoader: this.tileLoader
  }

  var nextCol = this.col*2;
  var nextRow = this.row*2;

  // move anchor to BL corner
  var pos = this.position.clone();
  pos.sub(this.master.getWidthDir().multiplyScalar(this.scale*0.25));
  pos.sub(this.master.getHeightDir().multiplyScalar(this.scale*0.25));

  // BL
  opts.position = pos.clone();
  opts.col = nextCol;
  opts.row = nextRow + 1;
  this.bottomLeft = new TileNode(opts);

  // BR
  opts.position = pos.clone().add(this.master.getWidthDir().multiplyScalar(this.scale*0.5));
  opts.col = nextCol + 1;
  opts.row = nextRow + 1;
  this.bottomRight = new TileNode(opts);

  // TL
  opts.position = pos.clone().add(this.master.getHeightDir().multiplyScalar(this.scale*0.5));
  opts.col = nextCol;
  opts.row = nextRow;
  this.topLeft = new TileNode(opts);

  // TR
  opts.position = pos.clone().add(this.master.getHeightDir().multiplyScalar(this.scale*0.5));
  opts.position.add(this.master.getWidthDir().multiplyScalar(this.scale*0.5));
  opts.col = nextCol + 1;
  opts.row = nextRow;
  this.topRight = new TileNode(opts);

  this.isSplit = true;
};

/**
 * Collapse this tile into a leaf node
 * TODO: Children get stuck in limbo, causing z-fighting, if they haven't finished loading
 */
TileNode.prototype.merge = function () {
  if (this.isSplit) {
    this.bottomLeft.destroy();
    this.bottomRight.destroy();
    this.topLeft.destroy();
    this.topRight.destroy();

    delete this.bottomLeft;
    delete this.bottomRight;
    delete this.topLeft;
    delete this.topRight;
  }

  this.isSplit = false;
};

TileNode.prototype.addToMaster = function () {
  this.loading = true;
  var texUrl = this.tileLoader.loadTileTexture(this, function (image) {
    if (image) {
      this.texture = THREE.ImageUtils.loadTexture(image);

      this.master.addTile(this);
      this.added = true;
    }
    this.loading = false;
  }, this);
};

/**
 * Attempt to remove this tile from the render list
 */
TileNode.prototype.removeFromMaster = function () {
  if (this.tileLoader.isLoading(this)) {
    this.tileLoader.abortLoading(this);
  }
  if (this.master.removeTile(this)) {
    this.added = false;
  }
};

/**
 * Remove and collapse this tile
 */
TileNode.prototype.destroy = function () {
  if (this.isSplit) {
    this.merge();
  } else {
    this.removeFromMaster();
  }
};
