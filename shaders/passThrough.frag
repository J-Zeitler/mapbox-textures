uniform sampler2D tileTex;
uniform vec2 topLeft;
uniform float tileScale;

varying vec3 pos;

void main() {
  vec2 uv = vec2(
    pos.x - topLeft.x,
    topLeft.y - pos.y
  );
  uv /= tileScale;
  uv.y = 1.0 - uv.y;

  gl_FragColor = texture2D(tileTex, uv);

  // gl_FragColor = vec4(uv, 0.0, 1.0);
}
