'use strict';

var TileLoader = function (opts) {
  opts = opts || {};

  this.baseUrl = opts.service.baseUrl;
  this.accessToken = opts.service.accessToken;
  this.layer = opts.layer || 'mapbox.streets';

  this.serviceType = opts.service.serviceType;
  this.getUrl = this.serviceType == 'TMS' ? this.getTMSUrl : this.getVirtualEarthUrl;

  this.flushImgSrc = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

  this.loadMap = {};
};

TileLoader.prototype.getTMSUrl = function (tile) {
  var z = tile.level;
  var x = tile.col;
  var y = tile.row;

  var url = [
    this.baseUrl,
    this.layer, '/',
    z, '/',
    x, '/',
    y,
    '.png',
    '?access_token=',
    this.accessToken
  ];

  return url.join('');
};

TileLoader.prototype.getVirtualEarthUrl = function (tile) {
  var url = [
    this.baseUrl,
    tile.virtualEarthIndex,
    '.jpeg',
    '?g=',
    this.accessToken
  ];

  return url.join('');
};

TileLoader.prototype.loadTileTexture = function (tile, callback, ctx) {
  var url = this.getUrl(tile);

  var canvas = document.createElement("canvas");
  var canvasContext = canvas.getContext("2d");
  var tileImg = document.createElement('img');
  tileImg.crossOrigin = 'anonymous';

  this.loadMap[tile.id] = tileImg;

  tileImg.abort = function () {
    callback.call(ctx, false);
    delete this.loadMap[tile.id];
  }.bind(this);

  tileImg.onload = function (abortSignal) {
    canvas.width = tileImg.width;
    canvas.height = tileImg.height;

    canvasContext.drawImage(tileImg, 0, 0, tileImg.width, tileImg.height);

    var dataURL = canvas.toDataURL();
    delete this.loadMap[tile.id];
    callback.call(ctx, dataURL);
  }.bind(this);

  tileImg.src = url;
};

/**
 * Check if the TileLoader is loading the supplied tile
 * @param  TileNode  tile
 * @return Boolean
 */
TileLoader.prototype.isLoading = function (tile) {
  return this.loadMap.hasOwnProperty(tile.id);
};

TileLoader.prototype.abortLoading = function (tile) {
  this.loadMap[tile.id].onload = function () {};
  this.loadMap[tile.id].src = this.flushImgSrc;
  this.loadMap[tile.id].abort();
};
