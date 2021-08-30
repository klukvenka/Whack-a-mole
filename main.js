var canvas;
var gl = null,
  program = null;

var lookRadius = 15;
var fieldOfView = 40;

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
    cameraPosition: [0.0, 0.0, 0.0],
    target: [0.0, 0.8 * 2.5, 0.0], //2.5 is te scale factor 
    //the target is not the origin but the point of the cabinet where the moles jump. 
    up: [0.0, 1.0, 0.0],
    fieldOfView: 60,

    /** object positions */
    moleSpacePosition: [0, 1.1, 0.2],
    hammerStartingPosition: [0, 1.4, 1.8],
    // hammerStartingPosition: [-1.5, 1.4, 1.3],
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
var cy = 10;
var cz = 7.5;
var elevation = -40.0;
var angle = 0.0;

var delta = 0.1;
var flag = 0;

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
  ADir: [],
  eyePos: [],
  diffuseColor: [],
  u_texture: [],
  SspecKwAng: [],
  LADir: [],
  LAlightColor: []
};

// uniforms for environment (skybox)
const uniformsEnv = {
  u_env: [],
  u_viewDirectionProjectionInverse: []
};
var bufferInfoEnv;



// event handler
var mouseState = false;
var lastMouseX = -100, lastMouseY = -100;
function doMouseDown(event) {
	lastMouseX = event.pageX;
	lastMouseY = event.pageY;
	mouseState = true;
}
function doMouseUp(event) {
	lastMouseX = -100;
	lastMouseY = -100;
	mouseState = false;
}
function doMouseMove(event) {
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
function doMouseWheel(event) {
	var nLookRadius = lookRadius + event.wheelDelta/1000.0;
	if((nLookRadius > 2.0) && (nLookRadius < 20.0)) {
		lookRadius = nLookRadius;
	}
}

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

  hammerWorldPos = utils.multiplyMatrixVector(
    utils.multiplyMatrices(hammerNode.localMatrix, cabinetSpace.localMatrix),
    [0.0, 0.0, 0.0, 1.0]);

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

function moleRand(){
  let randMole = getRandomInt(5);

  //if mole is still (either up or down) start movement
  if (molesState[randMole] == 0) {
    switch(molesPos[randMole]){
      case -1: //mole is in the hole, go up
        // moveMole(randMole, 1);
        molesState[randMole] = 1;
        break;
      case 1: //mole is up, go down
        // moveMole(randMole, -1);
        molesState[randMole] = -1;
        break;
    }
  }


}

var lastMolesTime = [null, null, null, null, null];
var molesDy = [0, 0, 0, 0, 0];

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

function moveMole(id, upDown) {
  var currentTime = (new Date).getTime();
  let dt;
  let dy;

  if (lastMolesTime[id]) {
    dt = (currentTime - lastMolesTime[id]);
  } else {
    dt = 1 / 50;
  }

  dy = dt/400.0*0.6;

  console.log(molesPos);

  molesDy[id] += dy;

  objects[id+2].localMatrix = utils.multiplyMatrices(objects[id+2].localMatrix, utils.MakeTranslateMatrix(0.0, 0.0 + dy*upDown, 0.0));

  lastMolesTime[id] = currentTime; //Need to update it for the next frame

  if (molesDy[id] >= 0.6) {
    // dy = 0;
    molesDy[id] = 0;
    molesPos[id] = upDown;
    molesState[id] = 0;
    lastMolesTime[id] = 0;
    
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
var dxdzdrot = [0, 0, 0];//distance traveled by hammer on both axis

$(document).on('keypress', function(e){
  key = String.fromCharCode(e.which);
  
  if ((key == 'q' || key == 'w' || key == 'e' || key == 'a' || key == 's') && hammerAnimFinished) {
    switch(key){
      case 'q':
        targetHole = 2;
        hammerAnimFinished = false;
        break;
      
      case 'w':
        targetHole = 1;
        hammerAnimFinished = false;
        break;
      
      case 'e':
        targetHole = 0;
        hammerAnimFinished = false;
        break;

      case 'a':
        targetHole = 4;
        hammerAnimFinished = false;
        break;

      case 's':
        targetHole = 3;
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

  let distanceX = (1/0.6)*(hammerWorldPos[0]-holesWorldPositions[targetHole][0]);
  let distanceY = (1/0.6)*(hammerWorldPos[1]-holesWorldPositions[targetHole][1]+0.6);
  let distanceZ = (1/0.6)*(hammerWorldPos[2]-holesWorldPositions[targetHole][2]);
  
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
    utils.MakeTranslateMatrix(dx, 0.0, -dz)
    );

  if (dxdzdrot[0] >= Math.abs(distanceX) && dxdzdrot[1] >= Math.abs(distanceZ) && dxdzdrot[2] >= rotx){  
    dxdzdrot = [0, 0, 0];

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

  // update WV matrix
  cz = lookRadius * Math.cos(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
  cx = lookRadius * Math.sin(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
  cy = lookRadius * Math.sin(utils.degToRad(-elevation));

  root.updateWorldMatrix();

  //Renders all the 3D objects inside "objects"
  objects.forEach(function (object) {
  //creating projection matrix
  // var worldMatrix = utils.MakeWorld(cubeTx, cubeTy, cubeTz, cubeRx, cubeRy, cubeRz, cubeS);
  var viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);
  perspectiveMatrix = utils.MakePerspective(fieldOfView, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
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
  
  //creating perspective matrix
  //


  //creates sceneGraph, stores root node in "root"
  root = defineSceneGraph();

  setInterval(function() {
    moleRand();
  }, 500);

  drawScene();
  drawEnv()
}

window.onload = initWebGl;