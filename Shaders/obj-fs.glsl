#version 300 es
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
uniform vec3 LPos;
uniform vec3 LSpotDir;
uniform float LConeOut;
uniform float LConeIn;
uniform float LDecay;
uniform float LTarget;
uniform vec4 diffuseColor;
uniform float SspecKwAng;
uniform float SpecShine;
uniform vec4 specularColor;
uniform float DToonTh;
uniform float SToonTh;
uniform vec4 specularType;

// Output color vector
out vec4 color;

vec4 compSpecular(vec3 lightDir, vec4 lightCol, vec3 normalVec, vec3 eyedirVec, vec3 t, vec3 b) {
	// Specular
	float LdotN = max(0.0, dot(normalVec, lightDir));
	vec3 reflection = -reflect(lightDir, normalVec);
	float LdotR = max(dot(reflection, eyedirVec), 0.0);
	vec3 halfVec = normalize(lightDir + eyedirVec);
	float HdotN = max(dot(normalVec, halfVec), 0.0);
	float HdotT = dot(t, halfVec);
	float HdotB = dot(b, halfVec);
	
	vec4 LScol = lightCol * max(sign(LdotN),0.0);
	// --> Phong
	vec4 specularPhong = LScol * pow(LdotR, SpecShine);
	// --> Blinn
	vec4 specularBlinn = LScol * pow(HdotN, SpecShine);
	// --> Toon Phong
	vec4 specularToonP = max(sign(LdotR - SToonTh), 0.0) * LScol;
	// --> Toon Blinn
	vec4 specularToonB = max(sign(HdotN - SToonTh), 0.0) * LScol;
	
	// --> Cook-Torrance
	LdotN = max(0.00001, LdotN);
	float VdotN = max(0.00001, dot(normalVec, eyedirVec));
	HdotN = max(0.00001, HdotN);
	float HdotV = max(0.00001, dot(halfVec, eyedirVec));
	float Gm = min(1.0, 2.0 * HdotN * min(VdotN, LdotN) / HdotV);
	float F = SToonTh + (1.0 - SToonTh) * pow(1.0 - HdotV, 5.0);
	float HtoN2 = HdotN * HdotN;
	float M = (200.0 - SpecShine) / 200.0;
	float M2 = M * M;
	float Ds = exp(- (1.0-HtoN2) / (HtoN2 * M2)) / (3.14159 * M2 * HtoN2 * HtoN2);
	float GGXk = (M+1.0)*(M+1.0)/8.0;
	float GGGX = VdotN * LdotN / (((1.0-GGXk) * VdotN + GGXk)*((1.0-GGXk) * LdotN + GGXk));
	float DGGXn = M2 * M2;
	float DGGXd = HtoN2*(M2 * M2-1.0)+1.0;
	DGGXd = 3.14 * DGGXd * DGGXd;
	float DGGX = DGGXn / DGGXd;
	
	float DG = specularType.z * GGGX * DGGX + (1.0 - specularType.z) * Gm * Ds;
	
	vec4 specularCookTorrance = LScol * F * DG / (4.0 * VdotN);
	
	// --> Ward
	float alphaX = M2;
	float alphaY = M2 * (1.0 - 0.999*SToonTh);
	float sang = sin(3.14 * SspecKwAng);
	float cang = cos(3.14 * SspecKwAng);
	float wsX = pow(HdotT * cang - HdotB * sang, 2.0);
	float wsY = pow(HdotB * cang + HdotT * sang, 2.0);

	vec4 specularWard = LScol / (12.566*sqrt(VdotN / LdotN*alphaX*alphaY)) * exp(-(wsX / alphaX + wsY / alphaY) / pow(HdotN,2.0)) ;

	// ----> Select final component
	return      specularPhong * specularType.x * (1.0 - specularType.z) * (1.0 - specularType.w) +
					specularBlinn * specularType.y * (1.0 - specularType.z) * (1.0 - specularType.w) +
					specularToonP * specularType.z * specularType.x * (1.0 - specularType.w) +
					specularToonB * specularType.z * specularType.y * (1.0 - specularType.w)+
					specularCookTorrance * specularType.w * specularType.x +
					specularWard * specularType.w * specularType.y;
}

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
  vec4 diffColor = texcol;
  
  vec3 normalVec = normalize(fs_norm);
  vec3 eyedirVec = normalize(vec3(0, 0, 0) - fs_pos);
  vec3 lightDir = normalize(-LADir);
  //// online computation of tangent and bitangent
  // compute initial tangent and bi-tangent
  float tbf = max(0.0, sign(abs(normalVec.y) - 0.707));
  vec3 t = normalize(cross(normalVec, vec3(1,0,0)));
  vec3 b = normalize(cross(normalVec, t));

  //Spolight direction
  vec3 spotLightDir = normalize(LPos - fs_pos);

  //Spotlight color
  float LCosOut = cos(radians(LConeOut / 2.0));
	float LCosIn = cos(radians(LConeOut * LConeIn / 2.0));
	float CosAngle = dot(spotLightDir, LSpotDir);
	vec4 spotLightColor = specularColor * pow(LTarget / length(LPos - fs_pos), LDecay) *
						clamp((CosAngle - LCosOut) / (LCosIn - LCosOut), 0.0, 1.0);
   
  // Diffuse
  vec4 diffuseSpot = compDiffuse(spotLightDir, spotLightColor, normalVec, diffColor, eyedirVec);
  vec4 diffuseDirect = compDiffuse(lightDir, LAlightColor, normalVec, diffColor, eyedirVec);
  vec4 diffuse = diffuseSpot + diffuseDirect;

  //Specular
  vec4 specularSpot = compSpecular(spotLightDir, spotLightColor, normalVec, eyedirVec, t, b);
  vec4 specularDirect = compSpecular(lightDir, LAlightColor, normalVec, eyedirVec, t, b);
  vec4 specular = specularSpot + specularDirect;
  
  // final steps
  float sctf = (SspecKwAng - 1.0) * (specularType.w * specularType.x) + 1.0;
	float dctf = 1.0 - SspecKwAng* (specularType.w * specularType.x);
  vec4 out_color = clamp(dctf*diffuse + sctf*specular, 0.0, 1.0);
  
  color = vec4(out_color.rgb, 1.0);
}