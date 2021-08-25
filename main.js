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
var cubeTy = -1.0;
var cubeTz = -1.0;
var cubeRx = 20.0;
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


var meshes = [];
var bufferInfos = [];
var objects;

const uniforms = {
  pMatrix: [],
  wMatrix: [],
  ADir: [],
  eyePos: [],
  diffuseColor: [],
  u_texture: [],
  SspecKwAng: [],
  LADir: [],
  LAlightColor: []
};

async function loadMeshes(){
  let threedObjects = ['cabinet.obj', 'mole.obj', 'hammer.obj'];
  
  for (const objFile of threedObjects) {
    var objStr = await utils.get_objstr('Assets/' + objFile);

    meshes.push(new OBJ.Mesh(objStr));
  }
}

function createBuffersInfo(gl){
  meshes.forEach(mesh => {
    bufferInfos.push(
      twgl.createBufferInfoFromArrays(gl, {
        a_pos: mesh.vertices,
        a_norm: mesh.vertexNormals,
        in_uv: { numComponents: 2, data: mesh.textures},
        //sending random colors (R G B alpha) for every vertex
        // a_color: new Uint8Array (Array.from({length: (mesh.vertices.length/3)*4}, () => Math.floor(Math.random() * 255))),
        indices: mesh.indices}
      )
    )}
  );
}

async function initWebGl(){
  // Get a WebGL context
  canvas = document.getElementById("c");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    document.write("GL context not opened");
    return;
  }
  utils.resizeCanvasToDisplaySize(gl.canvas);

  //Loads meshes from assets
  await loadMeshes();

  //use this aspect ratio to keep proportions
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  //creates GL program
  await utils.loadFiles(['Shaders/obj-vs.glsl','Shaders/obj-fs.glsl'], function(shader){
    programInfo = twgl.createProgramInfo(gl, shader);
    }
  );

  //loads objects texture (only 1 for all 3 objects)
  texture = twgl.createTexture(gl, {src: "Assets/Mole.png"});

  //creating an array containing all buffers information
  createBuffersInfo(gl);
  
  main();

}

// function defineSceneGraph() {
//   var cabinetSpace = new Node();
//   cabinetSpace.localMatrix = utils.MakeWorld(0, 0, 0, 0, 0, 0, settings.scaleFactor);

//   var moleSpace = new Node();
//   moleSpace.localMatrix = utils.MakeTranslateMatrix(settings.moleSpacePosition[0], settings.moleSpacePosition[1], settings.moleSpacePosition[2]);

// }

//draws the scene
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

  //populating uniform object
  uniforms.pMatrix = utils.transposeMatrix(projectionMatrix);
  uniforms.wMatrix = utils.transposeMatrix(worldMatrix);
  uniforms.ADir = [0, 1, 0];
  uniforms.eyePos = [cx,cy,cz];
  uniforms.diffuseColor = [0.0, 0.0, 0.0, 1];
  uniforms.u_texture = texture,
  uniforms.SspecKwAng = 0.1; //specular light coefficient 0-1 (in this case set to 0, only diffuse light)
  uniforms.LADir = [Math.sin(utils.degToRad(60))*Math.sin(utils.degToRad(45)), Math.cos(utils.degToRad(60)), Math.sin(utils.degToRad(60))*Math.cos(utils.degToRad(45))];
  uniforms.LAlightColor = [1, 1, 1, 1];

  //binding buffers and attributes to program
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfos[0]);
  
  //binding uniforms to program
  twgl.setUniforms(programInfo, uniforms);
  
  //draw the elements!
  // gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
  twgl.drawBufferInfo(gl, bufferInfos[0]);

  //continuously recalls himself
  window.requestAnimationFrame(drawScene);

}


function main() {

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

}

window.onload = initWebGl;