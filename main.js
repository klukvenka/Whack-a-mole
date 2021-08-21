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

function main() {

  // Get a WebGL context
  canvas = document.getElementById("c");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    document.write("GL context not opened");
    return;
  }
  utils.resizeCanvasToDisplaySize(gl.canvas);

  //Loads object mesh from assets
  var mesh = new OBJ.Mesh(hammer);
  
  //use this aspect ratio to keep proportions
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  //creates, compiles and link shaders to gl program
  programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);
  

  //creating an object containing vertices, normals, idexes etc. to use with twgl
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
    a_position: mesh.vertices,
    //sending random colors (R G B alpha) for every vertex
    a_color: new Uint8Array (Array.from({length: 3824}, () => Math.floor(Math.random() * 255))),
    indices: mesh.indices
    }
    );

  //creating an object containing all uniforms
  const uniforms = {
    matrix: []
  };

  //creating perspective matrix
  perspectiveMatrix = utils.MakePerspective(90, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
  
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
    // animate()
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.useProgram(programInfo.program);

    //creating projection matrix
    var worldMatrix = utils.MakeWorld(cubeTx, cubeTy, cubeTz, cubeRx, cubeRy, cubeRz, cubeS);
    var viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

    var projectionMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
    var projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, projectionMatrix);

    //populating uniform object with projmatrix (the only uniform we use in this program)
    uniforms.matrix = utils.transposeMatrix(projectionMatrix);

    //binding buffers and attributes to program
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    
    //binding uniforms to program
    twgl.setUniforms(programInfo, uniforms);
    
    //draw the elements!
    // gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
    twgl.drawBufferInfo(gl, bufferInfo);

    //continuously recalls himself
    window.requestAnimationFrame(drawScene);

  }

}

window.onload = main;