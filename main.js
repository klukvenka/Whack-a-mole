// Vertex shader
var vs = `#version 300 es
  #define POSITION_LOCATION 0
  #define NORMAL_LOCATION 1
  #define UV_LOCATION 2

  //vertices and normals binding 
  layout(location = POSITION_LOCATION) in vec3 a_pos;
  layout(location = NORMAL_LOCATION) in vec3 a_norm;
  layout(location = UV_LOCATION) in vec2 in_uv;

  //Projection Matrix and World Matrix passed as uniforms
  uniform mat4 pMatrix;
  uniform mat4 wMatrix;

  //position and normal forwarded to frag shader
  out vec3 fs_pos;
  out vec3 fs_norm;
  out vec2 fs_uv; // texture

  void main() {
    fs_pos = (wMatrix * vec4(a_pos, 1.0)).xyz;
    fs_norm = (wMatrix * vec4(a_norm, 0.0)).xyz;
    fs_uv = vec2(in_uv.x, 1.0-in_uv.y);
    
    gl_Position = pMatrix * vec4(a_pos, 1.0);
}`;

// Fragment shader
var fs = `#version 300 es
  precision highp float;
  
  //position and normal in projection matrix from vertex shader
  in vec3 fs_pos;
  in vec3 fs_norm;
  in vec2 fs_uv;
 
  uniform sampler2D u_texture;

  //self explanatory
  uniform vec3 eyePos;

  //Light parameters (see slides lesson L12-13 and example 4)
  uniform vec3 LADir;
  uniform vec4 LAlightColor;
  uniform vec3 ADir;
  uniform vec4 diffuseColor;
  uniform float SspecKwAng;

  // Output color vector
  out vec4 color;

  //computes Lambert diffuse light
  vec4 compDiffuse(vec3 lightDir, vec4 lightCol, vec3 normalVec, vec4 diffColor, vec3 eyedirVec) {
    
    // Diffuse component (retaining only lambert for now)
    float LdotN = max(0.0, dot(normalVec, lightDir));
    vec4 LDcol = lightCol * diffColor;
    
    // --> Lambert
    vec4 diffuseLambert = LDcol * LdotN;
    // ----> Select final component
    return         diffuseLambert;
  }

  void main() {
    vec4 texcol = texture(u_texture, fs_uv);
    vec4 diffColor = diffuseColor + texcol;
    
    vec3 normalVec = normalize(fs_norm);
    vec3 eyedirVec = normalize(eyePos - fs_pos);

    //// online computation of tangent and bitangent

    // compute initial tangent and bi-tangent
    float tbf = max(0.0, sign(abs(normalVec.y) - 0.707));
    vec3 t = normalize(cross(normalVec, vec3(1,0,0)));
    vec3 b = normalize(cross(normalVec, t));
     
    // Diffuse
    vec4 diffuse = compDiffuse(LADir, LAlightColor, normalVec, diffColor, eyedirVec);
    
    // final steps
    float dctf = 1.0 - SspecKwAng;
    vec4 out_color = clamp(diffuse*dctf, 0.0, 1.0);
    
    color = vec4(out_color.rgb, 1.0);
}`;

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
  var mesh = new OBJ.Mesh(cabinet);
  
  //use this aspect ratio to keep proportions
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  //creates, compiles and link shaders to gl program
  programInfo = twgl.createProgramInfo(gl, [vs, fs]);
  

  const textures = {
    cabinet: twgl.createTexture(gl, {src: "Assets/Mole.png"}),
  };

  //creating an object containing vertices, normals, idexes etc. to use with twgl
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
    a_pos: mesh.vertices,
    a_norm: mesh.vertexNormals,
    in_uv: { numComponents: 2, data: mesh.textures},
    //sending random colors (R G B alpha) for every vertex
    // a_color: new Uint8Array (Array.from({length: (mesh.vertices.length/3)*4}, () => Math.floor(Math.random() * 255))),
    indices: mesh.indices
    }
    );

    console.log(mesh);

  //creating an object containing all uniforms
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

    //populating uniform object
    uniforms.pMatrix = utils.transposeMatrix(projectionMatrix);
    uniforms.wMatrix = utils.transposeMatrix(worldMatrix);
    uniforms.ADir = [0, 1, 0];
    uniforms.eyePos = [cx,cy,cz];
    uniforms.diffuseColor = [0.5, 1.0, 1.0, 1];
    uniforms.u_texture = textures.cabinet,
    uniforms.SspecKwAng = 0.1; //specular light coefficient 0-1 (in this case set to 0, only diffuse light)
    uniforms.LADir = [Math.sin(utils.degToRad(60))*Math.sin(utils.degToRad(45)), Math.cos(utils.degToRad(60)), Math.sin(utils.degToRad(60))*Math.cos(utils.degToRad(45))];
    uniforms.LAlightColor = [1, 0.5, 1, 1];

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