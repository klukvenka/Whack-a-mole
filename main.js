// Vertex shader
var vs = `#version 300 es
#define POSITION_LOCATION 0
#define NORMAL_LOCATION 1
// #define UV_LOCATION 2

layout(location = POSITION_LOCATION) in vec3 a_pos;
layout(location = NORMAL_LOCATION) in vec3 a_norm;
// layout(location = UV_LOCATION) in vec2 in_uv;

uniform mat4 pMatrix;
uniform mat4 wMatrix;

out vec3 fs_pos;
out vec3 fs_norm;
// out vec2 fs_uv;

void main() {
	fs_pos = (wMatrix * vec4(a_pos, 1.0)).xyz;
	fs_norm = (wMatrix * vec4(a_norm, 0.0)).xyz;
	// fs_uv = vec2(in_uv.x, 1.0-in_uv.y);
	
	gl_Position = pMatrix * vec4(a_pos, 1.0);
}`;

// Fragment shader
var fs = `#version 300 es
precision highp float;

in vec3 fs_pos;
in vec3 fs_norm;
in vec2 fs_uv;

// uniform sampler2D u_texture;
uniform vec3 eyePos;

// uniform vec4 ambientType;
// uniform vec4 diffuseType;
// uniform vec4 specularType;
// uniform vec4 emissionType;

// uniform vec4 LAlightType;
uniform vec3 LAPos;
uniform vec3 LADir;
uniform float LAConeOut;
uniform float LAConeIn;
uniform float LADecay;
uniform float LATarget;
uniform vec4 LAlightColor;

// uniform vec4 LBlightType;
// uniform vec3 LBPos;
// uniform vec3 LBDir;
// uniform float LBConeOut;
// uniform float LBConeIn;
// uniform float LBDecay;
// uniform float LBTarget;
// uniform vec4 LBlightColor;

// uniform vec4 LClightType;
// uniform vec3 LCPos;
// uniform vec3 LCDir;
// uniform float LCConeOut;
// uniform float LCConeIn;
// uniform float LCDecay;
// uniform float LCTarget;
// uniform vec4 LClightColor;

// uniform vec4 ambientLightColor;
// uniform vec4 ambientLightLowColor;
// uniform vec4 SHLeftLightColor;
// uniform vec4 SHRightLightColor;
uniform vec3 ADir;
uniform vec4 diffuseColor;
// uniform float DTexMix;
// uniform vec4 specularColor;
// uniform float SpecShine;
// uniform float DToonTh;
// uniform float SToonTh;
uniform vec4 ambientMatColor;
// uniform vec4 emitColor;
uniform float SspecKwAng;

out vec4 color;

vec3 compLightDir(vec3 LPos, vec3 LDir) {
  
  vec3 directLightDir = LDir;

	return            directLightDir;
}

vec4 compLightColor(vec4 lightColor, float LTarget, float LDecay, vec3 LPos, vec3 LDir,
					float LConeOut, float LConeIn) {
	float LCosOut = cos(radians(LConeOut / 2.0));
	float LCosIn = cos(radians(LConeOut * LConeIn / 2.0));

	//lights
	// -> Point
	vec4 pointLightCol = lightColor * pow(LTarget / length(LPos - fs_pos), LDecay);
	// -> Direct
	vec4 directLightCol = lightColor;
	// -> Spot
	vec3 spotLightDir = normalize(LPos - fs_pos);
	float CosAngle = dot(spotLightDir, LDir);
	vec4 spotLightCol = lightColor * pow(LTarget / length(LPos - fs_pos), LDecay) *
						clamp((CosAngle - LCosOut) / (LCosIn - LCosOut), 0.0, 1.0);
	// ----> Select final component
	return          directLightCol;
}

vec4 compDiffuse(vec3 lightDir, vec4 lightCol, vec3 normalVec, vec4 diffColor, vec3 eyedirVec) {
	// Diffuse
	float LdotN = max(0.0, dot(normalVec, lightDir));
	vec4 LDcol = lightCol * diffColor;
	// --> Lambert
	vec4 diffuseLambert = LDcol * LdotN;
	// --> Toon
	// vec4 diffuseToon = max(sign(LdotN- DToonTh),0.0) * LDcol;
	// --> Oren-Nayar
	// float VdotN = max(0.0, dot(normalVec, eyedirVec));
	// float theta_i = acos(LdotN);
	// float theta_r = acos(VdotN);
	// float alpha = max(theta_i, theta_r);
	// float beta = min(min(theta_i, theta_r), 1.57);
	// float sigma2 = DToonTh * DToonTh * 2.46;
	// float A = 1.0 - 0.5 * sigma2 / (sigma2 + 0.33);
	// float B = 0.45 * sigma2 / (sigma2 + 0.09);
	// vec3 v_i = normalize(lightDir - normalVec * LdotN);
	// vec3 v_r = normalize(eyedirVec - normalVec * VdotN);
	// float G = max(0.0, dot(v_i, v_r));
	// vec4 diffuseOrenNayar = diffuseLambert * (A + B * G * sin(alpha) * tan(beta));
	// ----> Select final component
	return         diffuseLambert;
}

// vec4 compSpecular(vec3 lightDir, vec4 lightCol, vec3 normalVec, vec3 eyedirVec, vec3 t, vec3 b) {
// 	// Specular
// 	float LdotN = max(0.0, dot(normalVec, lightDir));
// 	vec3 reflection = -reflect(lightDir, normalVec);
// 	float LdotR = max(dot(reflection, eyedirVec), 0.0);
// 	vec3 halfVec = normalize(lightDir + eyedirVec);
// 	float HdotN = max(dot(normalVec, halfVec), 0.0);
// 	float HdotT = dot(t, halfVec);
// 	float HdotB = dot(b, halfVec);
	
// 	vec4 LScol = lightCol * specularColor * max(sign(LdotN),0.0);
// 	// --> Phong
// 	vec4 specularPhong = LScol * pow(LdotR, SpecShine);
// 	// --> Blinn
// 	vec4 specularBlinn = LScol * pow(HdotN, SpecShine);
// 	// --> Toon Phong
// 	vec4 specularToonP = max(sign(LdotR - SToonTh), 0.0) * LScol;
// 	// --> Toon Blinn
// 	vec4 specularToonB = max(sign(HdotN - SToonTh), 0.0) * LScol;
	
// 	// --> Cook-Torrance
// 	LdotN = max(0.00001, LdotN);
// 	float VdotN = max(0.00001, dot(normalVec, eyedirVec));
// 	HdotN = max(0.00001, HdotN);
// 	float HdotV = max(0.00001, dot(halfVec, eyedirVec));
// 	float Gm = min(1.0, 2.0 * HdotN * min(VdotN, LdotN) / HdotV);
// 	float F = SToonTh + (1.0 - SToonTh) * pow(1.0 - HdotV, 5.0);
// 	float HtoN2 = HdotN * HdotN;
// 	float M = (200.0 - SpecShine) / 200.0;
// 	float M2 = M * M;
// 	float Ds = exp(- (1.0-HtoN2) / (HtoN2 * M2)) / (3.14159 * M2 * HtoN2 * HtoN2);
// 	float GGXk = (M+1.0)*(M+1.0)/8.0;
// 	float GGGX = VdotN * LdotN / (((1.0-GGXk) * VdotN + GGXk)*((1.0-GGXk) * LdotN + GGXk));
// 	float DGGXn = M2 * M2;
// 	float DGGXd = HtoN2*(M2 * M2-1.0)+1.0;
// 	DGGXd = 3.14 * DGGXd * DGGXd;
// 	float DGGX = DGGXn / DGGXd;
	
// 	float DG = specularType.z * GGGX * DGGX + (1.0 - specularType.z) * Gm * Ds;
	
// 	vec4 specularCookTorrance = LScol * F * DG / (4.0 * VdotN);
	
// 	// --> Ward
// 	float alphaX = M2;
// 	float alphaY = M2 * (1.0 - 0.999*SToonTh);
// 	float sang = sin(3.14 * SspecKwAng);
// 	float cang = cos(3.14 * SspecKwAng);
// 	float wsX = pow(HdotT * cang - HdotB * sang, 2.0);
// 	float wsY = pow(HdotB * cang + HdotT * sang, 2.0);

// 	vec4 specularWard = LScol / (12.566*sqrt(VdotN / LdotN*alphaX*alphaY)) * exp(-(wsX / alphaX + wsY / alphaY) / pow(HdotN,2.0)) ;

// 	// ----> Select final component
// 	return          specularPhong * specularType.x * (1.0 - specularType.z) * (1.0 - specularType.w) +
// 					specularBlinn * specularType.y * (1.0 - specularType.z) * (1.0 - specularType.w) +
// 					specularToonP * specularType.z * specularType.x * (1.0 - specularType.w) +
// 					specularToonB * specularType.z * specularType.y * (1.0 - specularType.w)+
// 					specularCookTorrance * specularType.w * specularType.x +
// 					specularWard * specularType.w * specularType.y;
// }

// vec4 compAmbient(vec4 ambColor, vec3 normalVec) {
// 	// Ambient
// 	// --> Ambient
// 	vec4 ambientAmbient = ambientLightColor * ambColor;
// 	// --> Hemispheric
// 	float amBlend = (dot(normalVec, ADir) + 1.0) / 2.0;
// 	vec4 ambientHemi = (ambientLightColor * amBlend + ambientLightLowColor * (1.0 - amBlend)) * ambColor;
// 	// --> Spherical Harmonics
// 	const mat4 McInv = mat4(vec4(0.25,0.0,-0.25,0.7071),vec4(0.25,0.6124,-0.25,-0.3536),vec4(0.25,-0.6124,-0.25,-0.3536),vec4(0.25,0.0,0.75,0.0));
// 	mat4 InCols = transpose(mat4(ambientLightLowColor, SHRightLightColor, SHLeftLightColor, ambientLightColor));
// 	mat4 OutCols = McInv * InCols;
// 	vec4 ambientSH = vec4((vec4(1,normalVec) * OutCols).rgb, 1.0) * ambColor;

// 	// ----> Select final component
// 	return 		   ambientAmbient * ambientType.x +
// 				   ambientHemi    * ambientType.y +
// 				   ambientSH      * ambientType.z;
// }

void main() {
	// vec4 texcol = texture(u_texture, fs_uv);
	vec4 diffColor = diffuseColor;
	vec4 ambColor = ambientMatColor;
	
	vec3 normalVec = normalize(fs_norm);
	vec3 eyedirVec = normalize(eyePos - fs_pos);

	//// online computation of tangent and bitangent

	// compute initial tangent and bi-tangent
	float tbf = max(0.0, sign(abs(normalVec.y) - 0.707));
//	vec3 t = vec3(1,0,0) * tbf + vec3(0,1,0) * (1.0-tbf);
//	t = normalize(cross(normalVec, t));
	vec3 t = normalize(cross(normalVec, vec3(1,0,0)));
	vec3 b = normalize(cross(normalVec, t));
	
	//lights
	vec3 LAlightDir = compLightDir(LAPos, LADir);
	vec4 LAlightCol = compLightColor(LAlightColor, LATarget, LADecay, LAPos, LADir,
								     LAConeOut, LAConeIn);
	
	// Diffuse
	vec4 diffuse = compDiffuse(LAlightDir, LAlightCol, normalVec, diffColor, eyedirVec);
				  //  compDiffuse(LBlightDir, LBlightCol, normalVec, diffColor, eyedirVec) +
				  //  compDiffuse(LClightDir, LClightCol, normalVec, diffColor, eyedirVec);
	
	// // Specular
	// vec4 specular = compSpecular(LAlightDir, LAlightCol, normalVec, eyedirVec, t, b) +
	// 				compSpecular(LBlightDir, LBlightCol, normalVec, eyedirVec, t, b) +
	// 				compSpecular(LClightDir, LClightCol, normalVec, eyedirVec, t, b);
	
	// // Ambient
	// vec4 ambient = compAmbient(ambColor, normalVec);
	
	// final steps
	// float sctf = (SspecKwAng - 1.0) * (specularType.w * specularType.x) + 1.0;
	float dctf = 1.0 - SspecKwAng;
	vec4 out_color = clamp(diffuse, 0.0, 1.0);
	
	color = vec4(out_color.rgb, 1.0);
}`;


var vertexShaderSource = `#version 300 es

in vec3 a_position;
in vec3 a_color;
out vec3 colorV;
out mat4 projmat;

uniform mat4 matrix; 
void main() {
  projmat = matrix;
  colorV = a_color;
  gl_Position = matrix * vec4(a_position,1.0);
}
`;

var fragmentShaderSource = `#version 300 es

precision mediump float;

in mat4 projmat;
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
  var mesh = new OBJ.Mesh(cabinet);
  
  //use this aspect ratio to keep proportions
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  //creates, compiles and link shaders to gl program
  programInfo = twgl.createProgramInfo(gl, [vs, fs]);
  
  
  //creating an object containing vertices, normals, idexes etc. to use with twgl
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
    a_pos: mesh.vertices,
    a_norm: mesh.vertexNormals,
    //sending random colors (R G B alpha) for every vertex
    // a_color: new Uint8Array (Array.from({length: (mesh.vertices.length/3)*4}, () => Math.floor(Math.random() * 255))),
    indices: mesh.indices
    }
    );

  //creating an object containing all uniforms
  const uniforms = {
    pMatrix: [],
    wMatrix: [],
    ADir: [],
    eyePos: [],
    diffuseColor: [],
    ambientMatColor: [],
    SspecKwAng: [],
    LAPos: [],
    LADir: [],
    LAConeOut: [],
    LAConeIn: [],
    LADecay: [],
    LATarget: [],
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
    uniforms.diffuseColor = [100, 100, 100, 100];
    uniforms.ambientMatColor = [255, 123, 56, 100];
    uniforms.SspecKwAng = 0.8;
    uniforms.LAPos = [20, 30, 50];
    uniforms.LADir = [Math.sin(utils.degToRad(60))*Math.sin(utils.degToRad(45)), Math.cos(utils.degToRad(60)), Math.sin(utils.degToRad(60))*Math.cos(utils.degToRad(45))];
    uniforms.LAConeOut = 30;
    uniforms.LAConeIn = 80;
    uniforms.LADecay = 0;
    uniforms.LATarget = 61;
    uniforms.LAlightColor = [100, 100, 100, 100];

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