var vertexShaderSource = `#version 300 es

in vec3 a_position;
in vec3 a_color;
out vec3 colorV;

uniform mat4 matrix; 
void main() {
  colorV = a_color;
  gl_Position = matrix * vec4(a_position,1.0);
}
`;

var fragmentShaderSource = `#version 300 es

precision mediump float;


in vec3 colorV;
out vec4 outColor;

void main() {
  outColor = vec4(colorV,1.0);
}
`;
var canvas;
var gl = null,
  program = null;

var projectionMatrix,
  perspectiveMatrix,
  viewMatrix,
  worldMatrix, vao, matrixLocation;
var lastUpdateTime = (new Date).getTime();

//Cube parameters
var cubeTx = 0.0;
var cubeTy = 0.0;
var cubeTz = -1.0;
var cubeRx = 0.0;
var cubeRy = 0.0;
var cubeRz = 0.0;
var cubeS = 0.5; 

//Camera parameters
var cx = 0.5;
var cy = 0.0;
var cz = 1.0;
var elevation = 0.0;
var angle = -30.0;

var delta = 0.1;
var flag = 0;

/*async function initMesh () {
  let objStr = await utils.get_objstr("Assets/hammer.obj");

  return new OBJ.Mesh(objStr);  
};*/

function main() {

  // Get a WebGL context
  canvas = document.getElementById("c");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    document.write("GL context not opened");
    return;
  }
  utils.resizeCanvasToDisplaySize(gl.canvas);

  var mesh = new OBJ.Mesh(hammer);

  //use this aspect ratio to keep proportions
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);

  bufferInfo = twgl.createBufferInfoFromArrays(gl, {
    position: mesh.vertices,
    // normal: mesh.vertexNormals,
    indices: mesh.indices,
    color : mesh.vertices
    }
    );

  // twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

  // // create GLSL shaders, upload the GLSL source, compile the shaders and link them
  // var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  // var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  // var program = utils.createProgram(gl, vertexShader, fragmentShader);

  // // look up where the vertex data needs to go.
  // //var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  // var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  // var colorAttributeLocation = gl.getAttribLocation(program, "a_color");
  // matrixLocation = gl.getUniformLocation(program, "matrix");

  const uniforms = {
    u_worldViewProjection: []
  };

  perspectiveMatrix = utils.MakePerspective(90, gl.canvas.width / gl.canvas.height, 0.1, 100.0);

  // // Create a vertex array object (attribute state)
  // vao = gl.createVertexArray();
  // // and make it the one we're currently working with
  // gl.bindVertexArray(vao);
  // // Create a buffer and put three 2d clip space points in it
  // var positionBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
  // gl.enableVertexAttribArray(positionAttributeLocation);
  // gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  // var colorBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
  // gl.enableVertexAttribArray(colorAttributeLocation);
  // gl.vertexAttribPointer(colorAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  // var indexBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
  
  
  drawScene();

  // function animate() {
  //   var currentTime = (new Date).getTime();
  //   if (lastUpdateTime) {
  //     //currentTime – lastUpdateTime is the time passed between frames
  //     var deltaC = (3 * (currentTime - lastUpdateTime)) / 1000.0;
  //     if (flag == 0) cubeTx += deltaC;
  //     else cubeTx -= deltaC;
  //     if (cubeTx >= 1.5) flag = 1;
  //     else if (cubeTx <= -1.5) flag = 0;
  //   }
  //   worldMatrix = utils.MakeWorld(cubeTx, cubeTy, cubeTz, cubeRx, cubeRy, cubeRz, cubeS);
  //   lastUpdateTime = currentTime; //Need to update it for the next frame
  // }


  function drawScene() {
    // animate();

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.useProgram(programInfo.program);

    // // Bind the attribute/buffer set we want.
    // gl.bindVertexArray(vao);
    var worldMatrix = utils.MakeWorld(cubeTx, cubeTy, cubeTz, cubeRx, cubeRy, cubeRz, cubeS);
    var viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

    var projectionMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
    var projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, projectionMatrix);

    // gl.uniformMatrix4fv(matrixLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));

    // uniforms.u_viewInverse = camera;
    // uniforms.u_world = world;
    // uniforms.u_worldInverseTranspose = m4.transpose(m4.inverse(world));
    uniforms.u_worldViewProjection = projectionMatrix;

    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, uniforms);
    gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);

    window.requestAnimationFrame(drawScene);
  }

}

window.onload = main;