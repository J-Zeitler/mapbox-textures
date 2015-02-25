'use strict';

var TileLoader = function (opts) {
  opts = opts || {};

  this.baseUrl = opts.mapbox.baseUrl;
  this.accessToken = opts.mapbox.accessToken;
  this.layer = opts.layer || 'mapbox.streets';

};

TileLoader.prototype.loadTileTexture = function (z, x, y, callback, ctx) {
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

  url = url.join('');

  var canvas = document.createElement("canvas");
  var canvasContext = canvas.getContext("2d");
  var tileImg = document.createElement('img');
  tileImg.crossOrigin = 'anonymous';

  tileImg.onload = function () {
    canvas.width = tileImg.width;
    canvas.height = tileImg.height;

    canvasContext.drawImage(tileImg, 0, 0, tileImg.width, tileImg.height);

    var dataURL = canvas.toDataURL();
    // console.log(dataURL);
    callback.call(ctx, dataURL);
  }.bind(this);

  tileImg.src = url;
};
