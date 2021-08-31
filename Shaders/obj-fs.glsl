#version 300 es
precision highp float;

//position and normal in projection matrix from vertex shader
in vec3 fs_pos;
in vec3 fs_norm;
in vec2 fs_uv;

uniform sampler2D u_texture;

//self explanatory
uniform vec3 eyePos;

//Direct light parameters
uniform vec3 LDir;
uniform vec3 LDPos;

//Spotlight uniforms
uniform vec3 spotPos;
uniform vec3 spotDir;
uniform float coneOut;
uniform float coneIn;
uniform float decay;
uniform float target;

uniform float SpecShine;
//uniform vec4 specularColor;

//Specular toon parameters
//uniform float DToonTh;
//uniform float SToonTh;

// Output color vector
out vec4 color;


void main() {

  vec4 lightColor = vec4(1.0, 1.0, 1.0, 1.0);

  vec4 texel = texture(u_texture, fs_uv);
  
  vec3 normalVec = normalize(fs_norm);
  vec3 eyedirVec = normalize(vec3(0, 0, 0) - fs_pos);
  
  //direct light direction (camera space)
  vec3 dLightDir = normalize(-LDir);

  //spotlight direction (camera space)
  vec3 sLightDir = -(normalize(spotPos - fs_pos));

  //spotlight color
  float num = dot(sLightDir, spotDir) - cos(radians(coneOut/2.0));
  float den = cos(radians(coneOut*coneIn/2.0))-cos(radians(coneOut/2.0));
  vec4 spotlightColor = lightColor * pow(target/length(spotPos - fs_pos), decay) * clamp(num/den, 0.0, 1.0);

  //Lambert diffuse for direct light
  float dDiffN = max(0.0, dot(normalVec, dLightDir));
  vec4 dLightDiffuseCol = lightColor * texel;
  vec4 dLightDiffuse = dDiffN * dLightDiffuseCol;

  //Lambert diffuse for spot light
  float sDiffN = max(0.0, dot(normalVec, sLightDir));
  vec4 sLightDiffuseCol = spotlightColor * texel;
  vec4 sLightDiffuse = sLightDiffuseCol * sDiffN;

  //sum of diffuse components
  vec4 diffuse = dLightDiffuse+sLightDiffuse;

  //Phong Specular for direct light
  vec4 dSpecColor = pow(clamp(dot(eyedirVec,-reflect(dLightDir,normalVec)), 0.0, 1.0), SpecShine)*texel;
  vec4 dSpecular = lightColor*dSpecColor;

  //Phong Specular for spot light
  vec4 sSpecColor = pow(clamp(dot(eyedirVec,-reflect(sLightDir,normalVec)), 0.0, 1.0), SpecShine)*texel;
  vec4 sSpecular = spotlightColor*sSpecColor;
  
  //sum of specular components
  vec4 specular = dSpecular + sSpecular;
  

  vec4 out_color = clamp(0.7*diffuse+0.3*specular, 0.0, 1.0);

  color = vec4(out_color.rgb, 1.0);


}