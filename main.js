var canvas;
var gl = null,
  program = null;

var game;
var moleInitTimer; // for setInterval function that changes state of random mole 

var lookRadius = 15;
var fieldOfView = 60;

var scaleFactor = 2.5;

// Starting positions
var moleSpacePosition = [0, 1.1, 0.2];
var hammerStartingPosition = [0, 1.4, 1.8];
var molesStartingPositions = [
    [-0.63523, -0.6, 0],
    [0, -0.6, 0],
    [0.6353, -0.6, 0],
    [-0.31763, -0.7, 0.4429],  
    [0.31763, -0.7, 0.4429]];

//Matrices
var projectionMatrix,
  perspectiveMatrix,
  viewMatrix,
  viewWorldMatrix,
  normalsMatrix,
  worldMatrix, vao, matrixLocation;
var lastUpdateTime = (new Date).getTime();

//Camera parameters
var cx = 0.0;
var cy = 10;
var cz = 7.5;
var elevation = -40.0;
var angle = 0.0;

var delta = 0.1;
var flag = 0;


//Direct light direction
LPhi = -120;
LTheta = -60;

//Stores all the gometries of the objects
var meshes = [];

//Stores all the buffer information from twgl
var bufferInfos = [];

//Stores all the objects from the scene graph
var objects;

//Textures
var texture; 
var envTexture;

//TWGL program information
var programInfo,
    envInfo;

//uniforms definition, according to TWGL
const uniforms = {
  matrix: [],
  pMatrix: [],
  nMatrix: [],
  u_texture: [],
  eyePos:[],
  LDir:[],
  spotPos: [],
  spotDir:[],
  coneOut:[],
  coneIn:[],
  decay:[],
  target:[],
  SpecShine:[]
};

// uniforms for environment (skybox)
const uniformsEnv = {
  u_env: [],
  u_viewDirectionProjectionInverse: []
};
var bufferInfoEnv;

// variables for sliders 
var sliderConeIn=20;
var sliderConeOut=20;
var sLPhi = 0;
var sLTheta = 0;
var sliderDecay = 1;
var sliderTarget = 20;

//MOUSE EVENT HANDLER
var mouseState = false;
var lastMouseX = -100, lastMouseY = -100;

function doMouseDown(event) {
  if(!game.isStarted){
    lastMouseX = event.pageX;
    lastMouseY = event.pageY;
    mouseState = true;
  }
}

function doMouseUp(event) {
  if(!game.isStarted){
    lastMouseX = -100;
	lastMouseY = -100;
	mouseState = false;
  }
}

function doMouseMove(event) {
  if(!game.isStarted){
    if(mouseState) {
      var dx = event.pageX - lastMouseX;
      var dy = lastMouseY - event.pageY;
      lastMouseX = event.pageX;
      lastMouseY = event.pageY;
      
      if((dx != 0) || (dy != 0)) {
        angle = angle + 0.25 * dx;
        elevation = elevation + 0.25 * dy;
      }
    }
  }
	
}

function doMouseWheel(event) {
  if(!game.isStarted){
    var nLookRadius = lookRadius + event.wheelDelta/1000.0;
	if((nLookRadius > 2.0) && (nLookRadius < 20.0)) {
		lookRadius = nLookRadius;
	}
}
}

//Async function to load meshes
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
        indices: mesh.indices}
      )
    )}
  ); 
}


function createEnvironmentBuffer(gl){
  var envVertPos = new Float32Array(
    [
      -10, -10, 1.0,
      10, -10, 1.0,
      -10, 10, 1.0,
      -10, 10, 1.0,
      10, -10, 1.0,
      10, 10, 1.0,
    ]);

  bufferInfoEnv = twgl.createBufferInfoFromArrays(gl, {a_position: envVertPos});

}


//Async function that initializes WebGL and then starts the main program
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

  //creates GL program
  await utils.loadFiles(['Shaders/env-vs.glsl','Shaders/env-fs.glsl'], function(shader){
    envInfo = twgl.createProgramInfo(gl, shader);
    }
  );

  //loads objects texture (only 1 for all 3 objects)
  texture = twgl.createTexture(gl, {src: "Assets/Mole.png"});

  // loads environment texture
  envTextures = twgl.createTexture(gl, 
    {
     target: gl.TEXTURE_CUBE_MAP,
     src: [
       'Assets/Images/x_pos.png',
       'Assets/Images/x_neg.png',
       'Assets/Images/y_pos.png',
       'Assets/Images/y_neg.png',
       'Assets/Images/z_pos.png',
       'Assets/Images/z_neg.png',
     ]
   }
 );

  //creating an array containing all buffers information
  createBuffersInfo(gl);

  //creating a buffer info for environment
  createEnvironmentBuffer(gl)
  
  //initializing new game object
  game = new Game();
  
  //initialization ended. Go to the main program
  main();
}


//sceneGraph definition
function defineSceneGraph() {
  var cabinetSpace = new Node();
  cabinetSpace.localMatrix = utils.MakeWorld(0, 0, 0, 0, 0, 0, scaleFactor);

  var moleSpace = new Node();
  moleSpace.localMatrix = utils.MakeTranslateMatrix(moleSpacePosition[0], moleSpacePosition[1], moleSpacePosition[2]);

  var cabinetNode = new Node();
  cabinetNode.drawInfo = {
    programInfo: programInfo,
    bufferLength: meshes[0].indices.length,
    vertexArray: bufferInfos[0],
  };

  var hammerNode = new Node();
  hammerNode.localMatrix = utils.MakeWorld(
  hammerStartingPosition[0],
   hammerStartingPosition[1],
   hammerStartingPosition[2],
    0, 0, 0, 0.6
  );

  hammerNode.drawInfo = {
    programInfo: programInfo,
    bufferLength: meshes[2].indices.length,
    vertexArray: bufferInfos[2],
  };

  var mole1Node = new Node();
  mole1Node.localMatrix = utils.MakeTranslateMatrix(
    molesStartingPositions[0][0],
    molesStartingPositions[0][1],
    molesStartingPositions[0][2]
  );

  mole1Node.drawInfo = {
    programInfo: programInfo,
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
    molesStartingPositions[1][0],
    molesStartingPositions[1][1],
    molesStartingPositions[1][2]
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
    molesStartingPositions[2][0],
    molesStartingPositions[2][1],
    molesStartingPositions[2][2]
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
    molesStartingPositions[3][0],
    molesStartingPositions[3][1],
    molesStartingPositions[3][2]
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
  molesStartingPositions[4][0],
  molesStartingPositions[4][1],
  molesStartingPositions[4][2]);
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

  hammerWorldPos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(hammerNode.localMatrix, cabinetSpace.localMatrix),
    [0.0, 0.0, 0.0, 1.0]);

  return cabinetSpace;
}

//MOLES ANIMATION
var molesState = [0, 0, 0, 0, 0];//1 moving up, -1 moving down, 0 still
var molesPos = [-1, -1, -1, -1, -1];//1 up, -1 down
var lastMolesTime = [null, null, null, null, null];
var molesDy = [0, 0, 0, 0, 0];
var moleTimers = [];

//Generate random integer
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

//Schedule random mole movement
function moleRand(){
  let randMole = getRandomInt(5);
  //if mole is down and steady start upward movement
  if (molesPos[randMole] == -1 && molesState[randMole] == 0) { 
      molesState[randMole] = 1;
  }
}

//function to reschedule mole movement in each frame
function animateMoles(){
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

//function that moves the mole
function moveMole(id, upDown) {
  var currentTime = (new Date).getTime();
  let dt;
  let dy;

  if (lastMolesTime[id]) {
    dt = (currentTime - lastMolesTime[id]);
  } else {
    dt = 1 / 50;
  }

  dy = (dt/120.0*0.6)*upDown;

  molesDy[id] += dy;

  objects[id+2].localMatrix = utils.multiplyMatrices(objects[id+2].localMatrix, utils.MakeTranslateMatrix(0.0, dy, 0.0));

  lastMolesTime[id] = currentTime; //Need to update it for the next frame

  if (molesDy[id] >= 0.6 || molesDy[id] <= 0) {
  
    molesPos[id] = upDown;
    molesState[id] = 0;
    lastMolesTime[id] = 0;
    
    if(upDown == 1){//mole is up, reset local matrix to be up
      molesDy[id] = 0.6;
      objects[id+2].localMatrix = utils.MakeTranslateMatrix(
        molesStartingPositions[id][0],
        molesStartingPositions[id][1]+0.6,
        molesStartingPositions[id][2]
      )

      //schedule the downward movement of the mole
      moleTimers[id] = setTimeout(function(){
        molesState[id] = -1;  
      }, 1500);

    }

      //mole is down, reset local matrix to be down
    else {
      molesDy[id] = 0;
      objects[id+2].localMatrix = utils.MakeTranslateMatrix(
      molesStartingPositions[id][0],
      molesStartingPositions[id][1],
      molesStartingPositions[id][2]
    )
  }

    return;
  }

  molesState[id] = upDown;
}



//HAMMER ANIMATION
var hammerAnimFinished = true;
var lastHammerUpdateTime = null;
var targetHole; //targeted hole
var dxdzdrot = [0, 0, 0];//distance traveled by hammer on both axis and rotation
var doOnce = false;

//jquery to retrieve keypress events
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

//function that actually animates hammer
function animateHammer() {
  if (hammerAnimFinished) return;
  var currentTime = (new Date).getTime();
  let dt;
  if (lastHammerUpdateTime) {
    dt = (currentTime - lastHammerUpdateTime);
  } else {
    dt = 1 / 50;
  }
  lastHammerUpdateTime = currentTime;

  let distanceX = 1.4*(holesWorldPositions[targetHole][0] - hammerWorldPos[0]);
  let distanceY = (holesWorldPositions[targetHole][1]+0.6 - hammerWorldPos[1]);
  let distanceZ = 1.4*(holesWorldPositions[targetHole][2] - hammerWorldPos[2]);
  
  let rotx = Math.atan(distanceY/distanceZ)*180/Math.PI;
  let roty = Math.atan(distanceX/distanceZ)*180/Math.PI;
  let rot = dt/120.0*rotx;
  let dx = dt/120.0*distanceX;
  let dz = dt/120.0*distanceZ;

  dxdzdrot[0] += Math.abs(dx);
  dxdzdrot[1] += Math.abs(dz);
  dxdzdrot[2] += rot;

  //make a rotation around an arbitrary axis centered on the handle of the hammer perpendicular to the direction of the hole 
  rotmat = utils.multiplyMatrices(utils.multiplyMatrices(utils.multiplyMatrices(utils.multiplyMatrices(
    utils.MakeRotateYMatrix(-180+roty),
    utils.MakeTranslateMatrix(0, -1.5, 0.0)), 
    utils.MakeRotateXMatrix(rot)),
    utils.MakeTranslateMatrix(0, 1.5, 0.0)),
    utils.invertMatrix(utils.MakeRotateYMatrix(-180+roty))
  );

  objects[1].localMatrix = utils.multiplyMatrices(utils.multiplyMatrices(
    objects[1].localMatrix,
    rotmat),
    utils.MakeTranslateMatrix(dx, 0.0, dz)
    );
  
   if ((dxdzdrot[0] >= Math.abs(distanceX)*0.8 && dxdzdrot[1] >= Math.abs(distanceZ)*0.8 && dxdzdrot[2] >= rotx*0.8) && molesDy[targetHole] >= 0.2 && !doOnce){
     //mole is hit
    clearTimeout(moleTimers[targetHole]);
    molesState[targetHole] = -1;            
    game.makeScore();
    doOnce = true;
   }

  if (dxdzdrot[0] >= Math.abs(distanceX) && dxdzdrot[1] >= Math.abs(distanceZ) && dxdzdrot[2] >= rotx){  
    dxdzdrot = [0, 0, 0];
    objects[1].localMatrix = utils.MakeWorld(
      hammerStartingPosition[0],
      hammerStartingPosition[1],
      hammerStartingPosition[2],
      0, 0, 0, 0.6
    )
    hammerAnimFinished = true;
    lastHammerUpdateTime = 0;
    doOnce = false;
    return;
  }
}

//Camera Animation
var lastCameraUpdateTime = null;
var timeElapsed = 0;
var posAtGameStart = [];
var cameraAnimFinished = true;
var doOnceCamera = true;

//schedules movement of the camera before starting game
function moveCamera(){
  
  if(doOnceCamera) {
    posAtGameStart = [lookRadius, fieldOfView, elevation, angle, delta, sLPhi, sLTheta, sliderDecay, sliderTarget, sliderConeIn, sliderConeOut];
    doOnceCamera = false;
  }

  let animDur = 1500;
  let gamelookRadius = 15;
  let gamefieldOfView = 30;
  let gameElevation = -50.0;
  let gameAngle = 0.0;
  let gameDelta = 0.1;
  let gameSLPhi = 8;
  let gameSLTheta = 0;
  let gameSliderDecay = 0.6;
  let gameSliderTarget = 40;
  let gameSliderConeIn = 0;
  let gameSliderConeOut = 26;

  var currentTime = (new Date).getTime();
  let dt;
  if (lastCameraUpdateTime) {
    dt = (currentTime - lastCameraUpdateTime);
  } else {
    dt = 1 / 50;
  }
  lastCameraUpdateTime = currentTime;
  
  lookRadius += dt/animDur*(gamelookRadius-posAtGameStart[0]);
  fieldOfView += dt/animDur*(gamefieldOfView-posAtGameStart[1]);
  elevation += dt/animDur*(gameElevation-posAtGameStart[2]);
  angle += dt/animDur*(gameAngle-posAtGameStart[3]);
  delta += dt/animDur*(gameDelta-posAtGameStart[4]);
  sLPhi += dt/animDur*(gameSLPhi-posAtGameStart[5]);
  sLTheta += dt/animDur*(gameSLTheta-posAtGameStart[6]);
  sliderDecay += dt/animDur*(gameSliderDecay-posAtGameStart[7]);
  sliderTarget += dt/animDur*(gameSliderTarget-posAtGameStart[8]);
  sliderConeIn += dt/animDur*(gameSliderConeIn-posAtGameStart[9]);
  sliderConeOut += dt/animDur*(gameSliderConeOut-posAtGameStart[10]);

  if(timeElapsed >= animDur){
    cameraAnimFinished = true;
    lastCameraUpdateTime = 0;
  }

  timeElapsed += dt;
}


function animate() {
  animateHammer();
  animateMoles();
}

//draws the scene
function drawScene() {
   
  if (!cameraAnimFinished) moveCamera();
  
  if(game.isStarted) {
    animate();
  }

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.useProgram(programInfo.program);

  // update WV matrix
  cz = lookRadius * Math.cos(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
  cx = lookRadius * Math.sin(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
  cy = lookRadius * Math.sin(utils.degToRad(-elevation));

  // update World Matrices for all objects in Scene graph and return the root of the graph
  root.updateWorldMatrix();

  //Renders all the 3D objects inside "objects"
  objects.forEach(function (object) {
  //creating projection matrix
  var viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);
  perspectiveMatrix = utils.MakePerspective(fieldOfView, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
  var viewWorldMatrix = utils.multiplyMatrices(viewMatrix, object.worldMatrix);
  var projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewWorldMatrix);
  var normalsMatrix = utils.invertMatrix(utils.transposeMatrix(viewWorldMatrix));
  var lightDirMatrix = utils.invertMatrix(utils.transposeMatrix(viewMatrix));
  //transformed direct light for camera space
  var directLightTransformed = utils.multiplyMatrix3Vector3(
    utils.sub3x3from4x4(lightDirMatrix), [Math.sin(utils.degToRad(LPhi))*Math.sin(utils.degToRad(LTheta)), Math.cos(utils.degToRad(LPhi)), Math.sin(utils.degToRad(LPhi))*Math.cos(utils.degToRad(LTheta))]);
  //transformed spot light for camera space
  var spotLightTransformed = utils.multiplyMatrix3Vector3(
    utils.sub3x3from4x4(lightDirMatrix), [Math.sin(utils.degToRad(sLPhi))*Math.sin(utils.degToRad(sLTheta)), Math.cos(utils.degToRad(sLPhi)), Math.sin(utils.degToRad(sLPhi))*Math.cos(utils.degToRad(sLTheta))]);

  //populating uniform object
  uniforms.matrix = utils.transposeMatrix(projectionMatrix);
  uniforms.pMatrix = utils.transposeMatrix(viewWorldMatrix);
  uniforms.nMatrix = utils.transposeMatrix(normalsMatrix);
  uniforms.u_texture = texture;
  uniforms.eyePos = [cx,cy,cz];
  uniforms.LDir = directLightTransformed;
  uniforms.SpecShine = 0.5;
  uniforms.spotPos = utils.multiplyMatrix3Vector3(utils.sub3x3from4x4(viewMatrix),[0.0, -20, -10]);
  uniforms.spotDir = spotLightTransformed;
  uniforms.coneOut = sliderConeOut;
  uniforms.coneIn = sliderConeIn/100.0;//IN PERCENTAGE
  uniforms.decay = sliderDecay;
  uniforms.target = sliderTarget;

  //binding buffers and attributes to program
  twgl.setBuffersAndAttributes(gl, programInfo, object.drawInfo.vertexArray);
  
  //binding uniforms to program
  twgl.setUniforms(programInfo, uniforms);
  
  //draw the elements!
  twgl.drawBufferInfo(gl, object.drawInfo.vertexArray);

  });

  if(game.game_over) {
    clearInterval(moleInitTimer);
  }

  //continuously recalls himself
  window.requestAnimationFrame(drawScene);
}

function drawEnv() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.useProgram(envInfo.program);

  // update WV matrix
  cz = lookRadius * Math.cos(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
  cx = lookRadius * Math.sin(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
  cy = lookRadius * Math.sin(utils.degToRad(-elevation));

  var	viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);		

  //var viewMatrix = utils.invertMatrix(cameraMatrix);
  var projectionMatrix = utils.MakePerspective(fieldOfView, gl.canvas.width / gl.canvas.height, 1.0, 2000.0); // fow, aspect, near, far
  var viewProjMat = utils.multiplyMatrices(projectionMatrix, viewMatrix);
  var inverseViewProjMatrix = utils.invertMatrix(viewProjMat);

  //populating uniform object
  uniformsEnv.u_env = envTextures;
  uniformsEnv.u_viewDirectionProjectionInverse = utils.transposeMatrix(inverseViewProjMatrix);

  twgl.setBuffersAndAttributes(gl, envInfo, bufferInfoEnv);
  twgl.setUniforms(envInfo, uniformsEnv);
  twgl.drawBufferInfo(gl, bufferInfoEnv);

  // specifying the depth comparison function, which sets the conditions under which the pixel will be drawn. 
  // lequal - (pass if the incoming value is less than or equal to the depth buffer value)
  gl.depthFunc(gl.LEQUAL); 

  // Draw the geometry.
  gl.drawArrays(gl.TRIANGLES, 0, 1 * 6);

  //continuously recalls himself
  window.requestAnimationFrame(drawEnv);
}

function main() {

  canvas.addEventListener("mousedown", doMouseDown, false);
	canvas.addEventListener("mouseup", doMouseUp, false);
	canvas.addEventListener("mousemove", doMouseMove, false);
	canvas.addEventListener("mousewheel", doMouseWheel, false);
  
  //creates sceneGraph, stores root node in "root"
  root = defineSceneGraph();

  drawScene();
  drawEnv();
}

function onStartButtonClick() {
  document.getElementById("start_game").disabled = true; // disable button
  cameraAnimFinished = false;
  setTimeout(function(){
    lockAllSliders();
    game.Start();
    moleInitTimer = setInterval(function() {
      moleRand();
    }, 1000);
  }, 2500);
  
}

function onSliderChange(slider_value, setting) {
    slider_value = parseFloat(slider_value);
    document.getElementById(setting).innerHTML = slider_value;
    if (setting=='fovValue') fieldOfView = slider_value;
    else if (setting=='DirThetaValue') sLTheta = slider_value;
    else if (setting=='DirPhiValue') sLPhi = slider_value;
    else if (setting=='DecayValue') sliderDecay = slider_value;
    else if (setting=='TargetValue') sliderTarget = slider_value;
    else if (setting=='LConeInValue') sliderConeIn = slider_value;
    else if (setting=='LConeOutValue') sliderConeOut = slider_value;
}

function lockAllSliders() {
  document.getElementById('fovValue').innerHTML=" -"; // remove slider value
  document.getElementById('fovSlider').disabled=true; // disable slider
  document.getElementById('DirThetaValue').innerHTML=" -"; // remove slider value
  document.getElementById('DirThetaSlider').disabled=true; // disable slider
  document.getElementById('DirPhiValue').innerHTML=" -"; // remove slider value
  document.getElementById('DirPhiSlider').disabled=true; // disable slider
  document.getElementById('DecayValue').innerHTML=" -"; // remove slider value
  document.getElementById('DecaySlider').disabled=true; // disable slider
  document.getElementById('TargetValue').innerHTML=" -"; // remove slider value
  document.getElementById('TargetSlider').disabled=true; // disable slider
  document.getElementById('LConeInValue').innerHTML=" -"; // remove slider value
  document.getElementById('LConeInSlider').disabled=true; // disable slider
  document.getElementById('LConeOutValue').innerHTML=" -"; // remove slider value
  document.getElementById('LConeOutSlider').disabled=true; // disable slider
}

window.onload = initWebGl;
