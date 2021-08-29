var canvas;
var gl = null,
  program = null;

//Copied from other whac-a-mole project (we have to rewrite this part)
var settings = {
    /** directories */
    baseDir:null,
    shaderDir:null,
    assetDir:null,
    /** variables  */
    scaleFactor: 2.5,
    
    /** camera parameters */
    cameraGamePosition: [0.0, 7.0, 4.0], 
    cameraPosition: [0.0, 10.0, 20.0],
    target: [0.0, 0.8 * 2.5, 0.0], //2.5 is te scale factor 
    //the target is not the origin but the point of the cabinet where the moles jump. 
    up: [0.0, 1.0, 0.0],
    fieldOfView: 60,

    /** object positions */
    moleSpacePosition: [0, 1.1, 0.2],
    hammerStartingPosition: [-1.5, 1.4, 1.3],
    molesStartingPositions: [
        [-0.63523, -0.6, 0],
        [0, -0.6, 0],
        [0.6353, -0.6, 0],
        [-0.31763, -0.7, 0.4429],
        [0.31763, -0.7, 0.4429]
    ],

}

var projectionMatrix,
  perspectiveMatrix,
  viewMatrix,
  viewWorldMatrix,
  normalsMatrix,
  worldMatrix, vao, matrixLocation;
var lastUpdateTime = (new Date).getTime();

//Camera parameters
var cx = 0.0;
var cy = 3.0;
var cz = 7.5;
var elevation = 0.0;
var angle = 0.0;

var delta = 0.1;
var flag = 0;

//Stores all the gometries of the objects
var meshes = [];

//Stores all the buffer information from twgl
var bufferInfos = [];

//Stores all the objects from the scene graph
var objects;

//Texture
var texture;

//TWGL program information
var programInfo;

//uniforms definition, according to TWGL
const uniforms = {
  matrix: [],
  pMatrix: [],
  nMatrix: [],
  ADir: [],
  eyePos: [],
  diffuseColor: [],
  u_texture: [],
  SspecKwAng: [],
  LADir: [],
  LAlightColor: []
};

//Async function to load meshes (NOW WORKS, problem was we were calling it incorrectly AKA without waiting for it to dispatch the values)
async function loadMeshes(){
  let threedObjects = ['cabinet.obj', 'mole.obj', 'hammer.obj'];
  
  for (const objFile of threedObjects) {
    var objStr = await utils.get_objstr('Assets/' + objFile);

    meshes.push(new OBJ.Mesh(objStr));
  }
}

//Function that creates and stores buffer info inside "meshes"
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

//Async function that initialize WebGL and then starts the main program
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
  
  //initialization ended. Go to the main program
  main();
}

//sceneGraph definition (also blatantly copied from the the other guys whac-a-mole. WE HAVE TO REWRITE THIS!)
function defineSceneGraph() {
  var cabinetSpace = new Node();
  cabinetSpace.localMatrix = utils.MakeWorld(0, 0, 0, 0, 0, 0, settings.scaleFactor);

  var moleSpace = new Node();
  moleSpace.localMatrix = utils.MakeTranslateMatrix(settings.moleSpacePosition[0], settings.moleSpacePosition[1], settings.moleSpacePosition[2]);

  var cabinetNode = new Node();
  cabinetNode.drawInfo = {
    programInfo: programInfo,
    bufferLength: meshes[0].indices.length,
    vertexArray: bufferInfos[0],
  };

  var hammerNode = new Node();
  hammerNode.localMatrix = utils.MakeWorld(
    settings.hammerStartingPosition[0],
    settings.hammerStartingPosition[1],
    settings.hammerStartingPosition[2],
    0, 0, 0, 0.6
  );

  hammerNode.drawInfo = {
    programInfo: programInfo,
    bufferLength: meshes[2].indices.length,
    vertexArray: bufferInfos[2],
  };

  var mole1Node = new Node();
  mole1Node.localMatrix = utils.MakeTranslateMatrix(
    settings.molesStartingPositions[0][0],
    settings.molesStartingPositions[0][1],
    settings.molesStartingPositions[0][2]
  );

  mole1Node.drawInfo = {
    programInfo: programInfo,
    // u_color: [0.0, 0.0, 1.0],
    bufferLength: meshes[1].indices.length,
    vertexArray: bufferInfos[1],
  };

  var hole1Pos = [0.0, 0.0, 0.0, 1.0];
  hole1Pos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(mole1Node.localMatrix,
      utils.multiplyMatrices(moleSpace.localMatrix, cabinetSpace.localMatrix)),
    hole1Pos);

  var mole2Node = new Node();
  mole2Node.localMatrix = utils.MakeTranslateMatrix(
    settings.molesStartingPositions[1][0],
    settings.molesStartingPositions[1][1],
    settings.molesStartingPositions[1][2]
  );

  mole2Node.drawInfo = {
    programInfo: programInfo,
    bufferLength: meshes[1].indices.length,
    vertexArray: bufferInfos[1],
  };
  var hole2Pos = [0.0, 0.0, 0.0, 1.0];
  hole2Pos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(mole2Node.localMatrix,
      utils.multiplyMatrices(moleSpace.localMatrix, cabinetSpace.localMatrix)),
    hole2Pos);

  var mole3Node = new Node();
  mole3Node.localMatrix = utils.MakeTranslateMatrix(
    settings.molesStartingPositions[2][0],
    settings.molesStartingPositions[2][1],
    settings.molesStartingPositions[2][2]
  );

  mole3Node.drawInfo = {
    programInfo: programInfo,
    bufferLength: meshes[1].indices.length,
    vertexArray: bufferInfos[1],
  };
  var hole3Pos = [0.0, 0.0, 0.0, 1.0];
  hole3Pos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(mole3Node.localMatrix,
      utils.multiplyMatrices(moleSpace.localMatrix, cabinetSpace.localMatrix)),
    hole3Pos);

  var mole4Node = new Node();
  mole4Node.localMatrix = utils.MakeTranslateMatrix(
    settings.molesStartingPositions[3][0],
    settings.molesStartingPositions[3][1],
    settings.molesStartingPositions[3][2]
  );
  mole4Node.drawInfo = {
    programInfo: programInfo,
    bufferLength: meshes[1].indices.length,
    vertexArray: bufferInfos[1],
  };
  var hole4Pos = [0.0, 0.0, 0.0, 1.0];
  hole4Pos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(mole4Node.localMatrix,
      utils.multiplyMatrices(moleSpace.localMatrix, cabinetSpace.localMatrix)),
    hole4Pos);

  var mole5Node = new Node();
  mole5Node.localMatrix = utils.MakeTranslateMatrix(
    settings.molesStartingPositions[4][0],
    settings.molesStartingPositions[4][1],
    settings.molesStartingPositions[4][2]);
  mole5Node.drawInfo = {
    programInfo: programInfo,
    bufferLength: meshes[1].indices.length,
    vertexArray: bufferInfos[1],
  };
  var hole5Pos = [0.0, 0.0, 0.0, 1.0];
  hole5Pos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(mole5Node.localMatrix,
      utils.multiplyMatrices(moleSpace.localMatrix, cabinetSpace.localMatrix)),
    hole5Pos);

  //-0.31763, -0.1372, -0,5502
  cabinetNode.setParent(cabinetSpace);
  hammerNode.setParent(cabinetSpace);
  moleSpace.setParent(cabinetSpace);
  mole1Node.setParent(moleSpace);
  mole2Node.setParent(moleSpace);
  mole3Node.setParent(moleSpace);
  mole4Node.setParent(moleSpace);
  mole5Node.setParent(moleSpace);

  objects = [
    cabinetNode,
    hammerNode,
    mole1Node,
    mole2Node,
    mole3Node,
    mole4Node,
    mole5Node,
  ];

  let y_trasl = 0.2
  holesWorldPositions = [
    [hole1Pos[0], hole1Pos[1] - y_trasl, hole1Pos[2]],//1
    [hole2Pos[0], hole2Pos[1] - y_trasl, hole2Pos[2]],//2
    [hole3Pos[0], hole3Pos[1] - y_trasl, hole3Pos[2]],//3
    [hole4Pos[0], hole4Pos[1] - y_trasl, hole4Pos[2]],//4
    [hole5Pos[0], hole5Pos[1] - y_trasl, hole5Pos[2]],//5
  ]

  return cabinetSpace;
}

//MOLES ANIMATION
var molesState = [0, 0, 0, 0, 0];//1 moving up, -1 moving down, 0 still
// var animFinished = [false, false, false, false, false];
var molesPos = [-1, -1, -1, -1, -1];//1 up, -1 down

//only for test purposes
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

var lastMolesTime = [null, null, null, null, null];
var molesDy = [0, 0, 0, 0, 0];

function animateMoles(){
  
  let randMole = getRandomInt(5);

  //if mole is still (either up or down) start movement
  if (molesState[randMole] == 0) {
    switch(molesPos[randMole]){
      case -1: //mole is in the hole, go up
        moveMole(randMole, 1);
        break;
      case 1: //mole is up, go down
        moveMole(randMole, -1);
        break;
    }

  }

  //check what moles were already moving in last frame and reschedule their movement in this frame
  molesState.forEach((state, id) => {
    if (state != 0) {
      switch(state){
        case 1: //mole is going up
          moveMole(id, 1);
          break;
        case -1: //mole is going down
          moveMole(id, -1);
          break;
      }

  }
  });
}

function moveMole(id, upDown) {
  var currentTime = (new Date).getTime();
  let dt;
  let dy;

  if (lastMolesTime[id]) {
    dt = (currentTime - lastMolesTime[id]);
  } else {
    dt = 1 / 50;
  }

  dy = dt/80.0*0.6;

  molesDy[id] += dy;

  objects[id+2].localMatrix = utils.multiplyMatrices(objects[id+2].localMatrix, utils.MakeTranslateMatrix(0.0, 0.0 + dy*upDown, 0.0));

  lastMolesTime[id] = currentTime; //Need to update it for the next frame

  if (molesDy[id] >= 0.6) {
    dy = 0;
    molesDy[id] = 0;
    molesPos[id] = upDown;
    molesState[id] = 0;
    
    if(upDown == 1){//mole is up, reset local matrix to be up

      objects[id+2].localMatrix = utils.MakeTranslateMatrix(
        settings.molesStartingPositions[id][0],
        settings.molesStartingPositions[id][1]+0.6,
        settings.molesStartingPositions[id][2]
      )

    }
      //mole is down, reset local matrix to be down
    else objects[id+2].localMatrix = utils.MakeTranslateMatrix(
      settings.molesStartingPositions[id][0],
      settings.molesStartingPositions[id][1],
      settings.molesStartingPositions[id][2]
    )

    return;
  }

  molesState[id] = upDown;
}

//HAMMER ANIMATION
var hammerAnimFinished = true;
var lastHammerUpdateTime = null;
var targetHole; //targeted hole
var dxdz = [0, 0];//distance traveled by hammer on both axis

$(document).on('keypress', function(e){
  
  key = String.fromCharCode(e.which);
  
  if ((key == 'q' || key == 'w' || key == 'e' || key == 'a' || key == 's') && hammerAnimFinished) {
    switch(key){
      case 'q':
        targetHole = 0;
        hammerAnimFinished = false;
        break;
      
      case 'w':
        targetHole = 1;
        hammerAnimFinished = false;
        break;
      
      case 'e':
        targetHole = 2;
        hammerAnimFinished = false;
        break;

      case 'a':
        targetHole = 3;
        hammerAnimFinished = false;
        break;

      case 's':
        targetHole = 4;
        hammerAnimFinished = false;
        break;
    }
  }
} 
);

function animateHammer() {
  if (hammerAnimFinished) return;

  // let hammer = objects[1];
  // if (!positionBeforeAnim)
  //   positionBeforeAnim = hammer.localMatrix

  var currentTime = (new Date).getTime();
  let dt;
  if (lastHammerUpdateTime) {
    dt = (currentTime - lastHammerUpdateTime);
  } else {
    dt = 1 / 50;
  }
  lastHammerUpdateTime = currentTime;

  let distanceX = Math.abs(settings.hammerStartingPosition[0]-settings.molesStartingPositions[targetHole][0]);
  let distanceZ = Math.abs(settings.hammerStartingPosition[2]-settings.molesStartingPositions[targetHole][2]);

  dx = dt/80.0*distanceX; 
  dz = dt/80.0*distanceZ;

  dxdz[0] += dx;
  dxdz[1] += dz;

  objects[1].localMatrix = utils.multiplyMatrices(objects[1].localMatrix, utils.MakeTranslateMatrix(0.0+dx, 0.0, 0.0-dz));

  if (dxdz[0] >= Math.abs(distanceX) && dxdz[1] >= distanceZ){  
    dxdz[0] = 0;
    dxdz[1] = 0;
    objects[1].localMatrix = utils.MakeWorld(
      settings.hammerStartingPosition[0],
      settings.hammerStartingPosition[1],
      settings.hammerStartingPosition[2],
      0, 0, 0, 0.6
    )
    hammerAnimFinished = true;
    lastHammerUpdateTime = 0;
    return;
  }


}

//
function animate() {
  
  animateHammer();
  animateMoles();


}

//draws the scene
function drawScene() {
  
  animate();

  // console.log(hammerAnimFinished);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.useProgram(programInfo.program);

  root.updateWorldMatrix();

  

  //Renders all the 3D objects inside "objects"
  objects.forEach(function (object) {
  //creating projection matrix
  // var worldMatrix = utils.MakeWorld(cubeTx, cubeTy, cubeTz, cubeRx, cubeRy, cubeRz, cubeS);
  var viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

  var viewWorldMatrix = utils.multiplyMatrices(viewMatrix, object.worldMatrix);
  var projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewWorldMatrix);

  var normalsMatrix = utils.invertMatrix(utils.transposeMatrix(viewWorldMatrix));

  //populating uniform object
  uniforms.matrix = utils.transposeMatrix(projectionMatrix);
  uniforms.pMatrix = utils.transposeMatrix(viewWorldMatrix);
  uniforms.nMatrix = utils.transposeMatrix(normalsMatrix);
  uniforms.ADir = [0, 1, 0];
  uniforms.eyePos = [cx,cy,cz];
  // uniforms.diffuseColor = [0.0, 0.0, 0.0, 1];
  uniforms.u_texture = texture;
  uniforms.SspecKwAng = 0.1; //specular light coefficient 0-1 (in this case set to 0, only diffuse light)
  uniforms.LADir = [Math.sin(utils.degToRad(60))*Math.sin(utils.degToRad(45)), Math.cos(utils.degToRad(60)), Math.sin(utils.degToRad(60))*Math.cos(utils.degToRad(45))];
  uniforms.LAlightColor = [1, 1, 1, 1];
  //binding buffers and attributes to program
  twgl.setBuffersAndAttributes(gl, programInfo, object.drawInfo.vertexArray);
  
  //binding uniforms to program
  twgl.setUniforms(programInfo, uniforms);
  
  //draw the elements!
  // gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
  twgl.drawBufferInfo(gl, object.drawInfo.vertexArray);

  });

  //continuously recalls himself
  window.requestAnimationFrame(drawScene);
}

function main() {
  
  //creating perspective matrix
  perspectiveMatrix = utils.MakePerspective(90, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
  
  //creates sceneGraph, stores root node in "root"
  root = defineSceneGraph();

  drawScene();
}

window.onload = initWebGl;